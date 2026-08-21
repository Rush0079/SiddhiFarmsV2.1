'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Sparkles, Bot, User, Phone, MapPin, Calendar, Loader2, ArrowRight } from 'lucide-react'

const SUGGESTED_QUESTIONS = [
  '💵 What are the villa and room rates?',
  '🕒 Can I book a room for 4–5 hours?',
  '🎉 What are the event packages (Birthday/Wedding)?',
  '🏊 How much is the Water Park day ticket?',
  '📍 Where is the resort located?',
  '⏰ What are the check-in and check-out timings?',
]

export default function AiConcierge() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '🌿 Namaste! Welcome to **Siddhi Farm Resort**. I am your AI Resort Concierge. Ask me anything about our farm stays, 4–5 hours short stays, water park, event celebrations, or directions!',
    },
  ])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMessage = { role: 'user', text: query }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: messages,
        }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: 'I am here to help! For instant room reservations or inquiries, you can also call us at +91 7083682768 or click the WhatsApp link below.',
          },
        ])
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Thank you for reaching out! Our team is available 24/7 at +91 7083682768 to assist you with immediate bookings. 🌿',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatText = (content) => {
    // Simple markdown-to-html formatter for bold, bullets and linebreaks
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/•\s/g, '• ')
      .replace(/\n/g, '<br />')

    return <div dangerouslySetInnerHTML={{ __html: formatted }} />
  }

  return (
    <>
      {/* Floating Toggle Button (lifted on mobile to avoid overlapping sticky booking bar) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Concierge Chat"
            className="group flex items-center gap-2 rounded-full bg-[#173d35] px-4 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-[#205147] hover:shadow-[#173d35]/30 focus:outline-none animate-float-slow shimmer-button border border-[#d5b36a]/30"
          >
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500"></span>
            </span>
            <Sparkles size={16} className="text-[#d5b36a]" />
            <span>AI Concierge</span>
          </button>
        )}
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[580px] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-3xl border border-[#dfe7dc] bg-[#fbfaf6] shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 sm:bottom-6 sm:right-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#173d35] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#315d4c] text-[#d5b36a]">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold leading-tight">Siddhi AI Concierge</h3>
                <p className="text-[11px] text-emerald-300">Powered by Gemini AI · 24/7 Active</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Contact Bar */}
          <div className="flex items-center justify-between border-b border-[#e5ebe1] bg-[#edf1e8] px-4 py-2 text-[11px] text-[#173d35]">
            <a
              href="tel:7083682768"
              className="flex items-center gap-1 font-semibold hover:underline"
            >
              <Phone size={12} /> Call: 7083682768
            </a>
            <a
              href="https://maps.app.goo.gl/iBiKXi45sJ99vrV69"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-semibold hover:underline"
            >
              <MapPin size={12} /> Google Maps
            </a>
          </div>

          {/* Message List */}
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#173d35] text-[#d5b36a]">
                    <Sparkles size={12} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'rounded-tr-none bg-[#173d35] text-white'
                      : 'rounded-tl-none border border-[#dfe7dc] bg-white text-[#173d35]'
                  }`}
                >
                  {formatText(m.text)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-500">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#173d35] text-[#d5b36a]">
                  <Loader2 size={12} className="animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-none border border-[#dfe7dc] bg-white px-4 py-2.5 text-xs text-slate-500 shadow-sm">
                  Typing response…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Questions */}
          {messages.length < 4 && (
            <div className="border-t border-[#edf1e8] bg-[#f7f9f5] p-2.5">
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Questions</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="whitespace-nowrap rounded-xl border border-[#dfe7dc] bg-white px-2.5 py-1 text-[11px] font-medium text-[#173d35] shadow-xs transition hover:bg-[#edf1e8]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 border-t border-[#e5ebe1] bg-white p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about packages, rates, timings..."
              className="flex-1 rounded-xl border border-[#dfe7dc] bg-[#fbfaf6] px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#173d35] focus:bg-white focus:outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173d35] text-white transition hover:bg-[#205147] disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
