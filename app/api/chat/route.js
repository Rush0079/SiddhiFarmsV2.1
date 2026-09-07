/**
 * ============================================================================
 * SIDDHI FARM RESORT - AI CONCIERGE CHAT API ROUTE
 * ============================================================================
 * 
 * DESIGN PATTERNS APPLIED:
 * 1. Strategy & Fallback Engine Pattern:
 *    Tries candidate generative AI models sequentially (`gemini-3.6-flash` -> `gemini-3.7-flash` -> `gemini-2.5-flash`),
 *    gracefully degrading to a local rule-based intent matching engine if all external LLM calls fail.
 * 
 * 2. Sliding-Window Rate Limiter:
 *    Prevents prompt injection exhaustion and abuse per client IP.
 * 
 * 3. Dynamic Context Injection:
 *    Injects real-time pricing matrix from Supabase PostgreSQL directly into the LLM system prompt.
 * 
 * LOGGING CONVENTION:
 * [API:CHAT:<ACTION>] <DETAILS>
 * ============================================================================
 */

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const RESORT_NAME = 'Siddhi Farm Resort'
const DEFAULT_PHONE = '9552265572'
const GOOGLE_MAPS_LINK = 'https://maps.app.goo.gl/iBiKXi45sJ99vrV69'
const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-flash-latest']

/**
 * Handles incoming customer chat messages and streams/generates conversational responses.
 * @param {Request} req - Incoming Next.js request containing { message, conversationHistory }
 * @returns {Promise<NextResponse>} JSON response with { reply: string }
 */
export async function POST(req) {
  try {
    const ip = getClientIp(req)
    // Rate limit: 25 messages / 2 minutes per IP
    const limit = checkRateLimit(ip, 'chat_messages', 25, 2 * 60 * 1000)
    if (!limit.allowed) {
      console.warn(`[API:CHAT:RATE_LIMIT] IP ${ip} throttled on AI concierge`)
      return NextResponse.json({
        reply: 'You are sending messages too quickly. Please wait a moment before sending another query.',
      }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    const { message, conversationHistory = [] } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (maximum 2,000 characters)' }, { status: 400 })
    }

    console.log(`[API:CHAT:QUERY] Incoming prompt from ${ip}: "${message.slice(0, 60)}${message.length > 60 ? '...' : ''}"`)

    // Fetch live resort rates from database
    let pricingInfo = 'Master Bedroom: ₹4,500/night, 2 BHK Villa: ₹9,000/night, 4 BHK Villa: ₹15,000/night, One Day Tour: ₹700/person, Mini Water Park: ₹950/person, Birthday Party: ₹12,000, Engagement Ceremony: ₹18,000, Wedding Ceremony: ₹35,000, Get Together: ₹10,000.'
    try {
      const admin = supabaseAdmin()
      const { data: pData } = await admin.from('pricing').select('values').eq('id', 'current').single()
      if (pData?.values) {
        const v = pData.values
        pricingInfo = `Master Bedroom: ₹${v.masterBedroom || 4500}/night, 2 BHK Villa: ₹${v.villa2BHK || 9000}/night, 4 BHK Villa: ₹${v.villa4BHK || 15000}/night, One Day Tour: ₹${v.oneDayTour || 700}/person, Mini Water Park: ₹${v.miniWaterPark || 950}/person, Birthday Party: ₹${v.birthdayEvent || 12000}, Engagement Ceremony: ₹${v.engagementEvent || 18000}, Wedding Ceremony: ₹${v.weddingEvent || 35000}, Get Together: ₹${v.getTogetherEvent || 10000}.`
      }
    } catch (err) {
      console.warn('[API:CHAT:PRICING_FALLBACK] Failed fetching live pricing for system prompt:', err.message)
    }

    const apiKey = process.env.GEMINI_API_KEY

    // Fallback if GEMINI_API_KEY is not configured
    if (!apiKey) {
      console.log('[API:CHAT:RULE_BASED_FALLBACK] GEMINI_API_KEY missing, using rules engine')
      const fallbackReply = generateSmartFallbackReply(message.trim(), pricingInfo)
      return NextResponse.json({ reply: fallbackReply })
    }

    const systemPrompt = `You are the official, friendly, and helpful AI Concierge of ${RESORT_NAME}, a premier luxury agro-tourism farm stay and celebration resort in Maharashtra, India.
Your mission is to welcome guests, answer questions accurately, and assist them with bookings.

KEY RESORT INFORMATION:
- Resort Name: ${RESORT_NAME}
- Location & Directions: Google Maps Link: ${GOOGLE_MAPS_LINK}
- Helpline / WhatsApp: +91 ${DEFAULT_PHONE}
- Live Current Rates: ${pricingInfo}
- Short Stay / Day-Use (4-5 Hours): Guests CAN book Master Bedrooms or Villas for 4-5 hours during the daytime (e.g. 10 AM - 3 PM or 12 PM - 5 PM) at a 50% discount on the nightly rate!
- Single-Day Events: Engagement ceremonies, Birthday parties, Get-togethers, and Weddings are 1-day packages with lawn/hall access and custom celebration timings (e.g. 9 AM - 10 PM).
- Check-in / Check-out Timings: Standard overnight check-in is 11:00 AM and check-out is 10:00 AM next day.
- Amenities: Swimming Pool, Mini Water Park with slides, Open Green Lawns, Private Villas, AC Master Bedrooms, Delicious Dining & Catering, Free Parking, 24/7 Security.
- Advance Payment Option: Guests can use code ADVANCE50 to book with a 50% advance token and pay the remaining balance on arrival or online via the balance payment link.
- Official PDF Invoicing: Every confirmed booking gets an instant printable PDF Tax Invoice and automated WhatsApp confirmation with Google Maps navigation.
- House Rules: Valid Govt ID (Aadhaar) is required for all guests at check-in. Swimming pool requires proper swimwear. Smoking is prohibited in rooms.

TONE & GUIDELINES:
- Warm, polite, hospitable, and concise.
- Reply in the language the customer speaks (English, Marathi, or Hindi).
- Use bullet points and emojis where helpful for readability.
- When guests express interest in booking, guide them to click the "Reserve" button on the website.
- Never invent false rates or claim amenities the resort does not offer.`

    const genAI = new GoogleGenerativeAI(apiKey)
    let reply = ''
    let lastError = null

    // Build chat history ensuring first item is 'user' role
    const rawHistory = Array.isArray(conversationHistory) ? conversationHistory : []
    const history = rawHistory
      .slice(-8)
      .filter(item => item && typeof item.text === 'string' && item.text.trim())
      .map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(item.text).slice(0, 1000) }],
      }))

    while (history.length > 0 && history[0].role !== 'user') {
      history.shift()
    }

    // Try candidate models
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
        })

        const chat = model.startChat({ history })
        const result = await chat.sendMessage(message)
        reply = result.response.text()
        if (reply) {
          console.log(`[API:CHAT:SUCCESS] Generated reply using model "${modelName}"`)
          break
        }
      } catch (err) {
        lastError = err
        continue
      }
    }

    if (!reply) {
      console.warn('[API:CHAT:MODELS_FAILED] All candidate Gemini models failed, falling back to rules engine:', lastError?.message)
      reply = generateSmartFallbackReply(message.trim(), pricingInfo)
    }

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('[API:CHAT:FATAL_ERROR]', error?.message || error)
    return NextResponse.json({
      reply: `Thank you for reaching out to Siddhi Farm Resort! For immediate assistance, feel free to call or WhatsApp our resort manager at +91 ${DEFAULT_PHONE}, or click the "Reserve" button on the website to view room availability. 🌿`,
    })
  }
}

/**
 * Intelligent rules-based fallback if API is unreachable
 */
function generateSmartFallbackReply(query, pricing) {
  const q = query.toLowerCase()

  if (q.includes('rate') || q.includes('price') || q.includes('cost') || q.includes('tariff') || q.includes('charge')) {
    return `🌴 *Siddhi Farm Resort Rates & Packages:*

• *Master Bedroom:* ₹4,500/night (or 50% off for 4-5 hours Short Stay)
• *2 BHK Villa:* ₹9,000/night (Private Villa with Pool Access)
• *4 BHK Villa:* ₹15,000/night (Spacious Grand Villa for large families)
• *One Day Tour:* ₹700/person (with meals & lawn play)
• *Mini Water Park:* ₹950/person (Full Day Water Slides & Pool)
• *Events & Ceremonies:* 
  - Birthday Party: ₹12,000
  - Engagement Ceremony: ₹18,000
  - Wedding Celebration: ₹35,000
  - Family Get-Together: ₹10,000

💡 *Tip:* You can use advance code *ADVANCE50* to reserve with just 50% advance deposit! Click the *Reserve* button above to book online.`
  }

  if (q.includes('4') || q.includes('5') || q.includes('hour') || q.includes('short') || q.includes('day use') || q.includes('day-use')) {
    return `☀️ *Yes! We offer 4–5 Hours Day-Use / Short Stays!*

You can book our Master Bedrooms or Villas for 4–5 hours during the day (e.g. 10:00 AM – 3:00 PM, 12:00 PM – 5:00 PM, or 2:00 PM – 7:00 PM) at **50% of the overnight rate**.

Simply open the booking window, select **"☀️ Day Use / Short Stay (4-5 Hrs)"**, and choose your preferred slot!`
  }

  if (q.includes('location') || q.includes('where') || q.includes('map') || q.includes('address') || q.includes('reach') || q.includes('distance')) {
    return `📍 *Siddhi Farm Resort Location & Navigation:*

• *Google Maps Link:* ${GOOGLE_MAPS_LINK}
• *Helpline / WhatsApp:* +91 ${DEFAULT_PHONE}

We are nestled in a peaceful, lush green countryside setting easily accessible by car or cab. Free private parking is available on-site.`
  }

  if (q.includes('time') || q.includes('timing') || q.includes('checkin') || q.includes('checkout') || q.includes('check-in') || q.includes('check-out')) {
    return `⏰ *Resort Timings:*

• *Overnight Stays:* Check-in from **11:00 AM** · Check-out by **10:00 AM** next day.
• *Day Use / Short Stays:* 4–5 hour flexible daytime slots (e.g., 10:00 AM – 3:00 PM).
• *Day Tour & Water Park:* **09:30 AM to 06:00 PM**.
• *Events (Engagements / Birthdays):* Single-day celebration access (**09:00 AM to 10:00 PM**).`
  }

  if (q.includes('event') || q.includes('wedding') || q.includes('birthday') || q.includes('engagement') || q.includes('party')) {
    return `🎉 *Event Celebrations at Siddhi Farm Resort:*

We host single-day celebration packages including:
• *Birthday Parties:* ₹12,000 (Evening / Afternoon lawn access)
• *Engagement Ceremonies:* ₹18,000 (Full-day hall & lawn package)
• *Wedding Ceremonies:* ₹35,000 (Spacious resort setup & amenities)
• *Family Get-Togethers:* ₹10,000

All events include open lawns, shaded banquet areas, music system support, and clean washroom facilities.`
  }

  return `🌿 Welcome to *Siddhi Farm Resort*!

We offer peaceful farm stays (Master Bedrooms & Private Villas), 4–5 hours Day-Use short stays, Mini Water Park fun, and celebration venues for weddings, engagements, and birthdays.

How can I help you today? You can ask about:
1. Room & Villa rates
2. 4–5 hours Short Stay slots
3. Water Park & Day Tour packages
4. Location & driving directions
5. Event bookings

Or call our team directly at **+91 ${DEFAULT_PHONE}**!`
}
