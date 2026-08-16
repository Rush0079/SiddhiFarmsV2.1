import ExcelJS from 'exceljs'
import nodemailer from 'nodemailer'
import { normaliseBookingTerms } from '@/lib/booking-terms'

const RESORT_NAME = 'Siddhi Farm Resort'
const DEFAULT_CONTACT_PHONE = '7083682768'
const DEFAULT_MAP_URL = 'https://maps.app.goo.gl/iBiKXi45sJ99vrV69'
const DEFAULT_CHECK_IN_TIME = '11:00'
const DEFAULT_CHECK_OUT_TIME = '10:00'
const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const DATE = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' })
const DATE_TIME = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
}

function date(value, withTime = false) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : (withTime ? DATE_TIME : DATE).format(parsed)
}

function displayTime(value, fallback) {
  const [hours, minutes] = String(value || fallback).split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes || 0).padStart(2, '0')} ${suffix}`
}

function invoiceRows(booking) {
  return [
    ['Booking ID', booking.id],
    ['Guest', booking.name],
    ['Phone', booking.phone],
    ['Service', booking.service],
    ['Guests', booking.guests],
    ['Check-in (from)', `${date(booking.check_in)} · ${displayTime(booking.check_in_time, DEFAULT_CHECK_IN_TIME)}`],
    ['Check-out (by)', `${date(booking.check_out)} · ${displayTime(booking.check_out_time, DEFAULT_CHECK_OUT_TIME)}`],
    ['Nights', booking.nights],
    ['Subtotal', CURRENCY.format(Number(booking.subtotal || 0))],
    ['Discount', `−${CURRENCY.format(Number(booking.discount || 0))}`],
    ['Amount paid', CURRENCY.format(Number(booking.amount || 0))],
  ]
}

function invoiceHtml(booking, { recipient = 'guest', paymentSource } = {}) {
  const rows = invoiceRows(booking).map(([label, value]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e6ece8;color:#5b6a63">${safe(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e6ece8;font-weight:600;color:#173d35">${safe(value)}</td></tr>`).join('')
  const guestMessage = recipient === 'guest'
    ? `<p style="margin:0 0 16px;color:#334b40">Hello ${safe(booking.name)}, your payment has been received and your booking is confirmed. Please keep this invoice for your records.</p>`
    : `<p style="margin:0 0 16px;color:#334b40">A payment has been confirmed${paymentSource ? ` via ${safe(paymentSource)}` : ''}. The latest 30-day booking report is attached.</p>`
  const contactPhone = process.env.OWNER_CONTACT_PHONE?.trim() || DEFAULT_CONTACT_PHONE
  const configuredMapUrl = process.env.RESORT_MAP_URL?.trim()
  const mapUrl = configuredMapUrl?.startsWith('https://') ? configuredMapUrl : DEFAULT_MAP_URL
  const guestContact = recipient === 'guest'
    ? `<div style="margin-top:22px;padding:16px;border-radius:10px;background:#f3f5ef;color:#173d35"><strong style="font-size:15px">Need help with your booking?</strong><p style="margin:8px 0 0;font-size:14px">Call the resort owner at <a href="tel:${safe(contactPhone.replace(/[^+\d]/g, ''))}" style="color:#315d4c;font-weight:700;text-decoration:none">${safe(contactPhone)}</a>.</p><p style="margin:8px 0 0;font-size:14px"><a href="${safe(mapUrl)}" style="color:#315d4c;font-weight:700">Open Siddhi Farm Resort in Google Maps →</a></p></div>`
    : ''

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f5ef;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #dbe4d7;border-radius:14px;overflow:hidden"><div style="padding:22px 28px;background:#173d35;color:#fff"><div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#d5b36a">Booking confirmed</div><h1 style="margin:8px 0 0;font-size:26px;font-weight:600">${RESORT_NAME}</h1></div><div style="padding:28px">${guestMessage}<h2 style="margin:20px 0 10px;font-size:18px;color:#173d35">Booking invoice</h2><table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>${guestContact}<p style="margin:20px 0 0;color:#68756e;font-size:12px">Paid on ${safe(date(new Date(), true))}. For help, reply to this email and quote booking ${safe(booking.id)}.</p></div></div></body></html>`
}

async function createBookingsWorkbook(bookings) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = RESORT_NAME
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Last 30 Days Bookings', { views: [{ state: 'frozen', ySplit: 2 }] })
  sheet.mergeCells('A1:N1')
  const title = sheet.getCell('A1')
  title.value = `${RESORT_NAME} — Bookings created in the last 30 days`
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173D35' } }
  title.alignment = { horizontal: 'center' }

  sheet.columns = [
    { key: 'id', width: 17 }, { key: 'name', width: 24 }, { key: 'phone', width: 16 },
    { key: 'service', width: 29 }, { key: 'guests', width: 10 }, { key: 'checkIn', width: 15 },
    { key: 'checkInTime', width: 16 }, { key: 'checkOut', width: 15 }, { key: 'checkOutTime', width: 16 },
    { key: 'nights', width: 9 }, { key: 'amount', width: 15 }, { key: 'paid', width: 12 },
    { key: 'status', width: 15 }, { key: 'createdAt', width: 22 },
  ]
  const header = sheet.addRow(['Booking ID', 'Customer name', 'Phone', 'Service', 'Guests', 'Check-in', 'Check-in time', 'Check-out', 'Check-out time', 'Nights', 'Bill amount (INR)', 'Payment status', 'Booking status', 'Booked at'])
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF315D4C' } }
  header.alignment = { vertical: 'middle', wrapText: true }

  for (const booking of bookings) {
    const row = sheet.addRow({
      id: booking.id, name: booking.name, phone: booking.phone, service: booking.service,
      guests: Number(booking.guests || 0), checkIn: new Date(booking.check_in),
      checkInTime: displayTime(booking.check_in_time, DEFAULT_CHECK_IN_TIME), checkOut: new Date(booking.check_out),
      checkOutTime: displayTime(booking.check_out_time, DEFAULT_CHECK_OUT_TIME), nights: Number(booking.nights || 0), amount: Number(booking.amount || 0),
      paid: booking.paid ? 'Paid' : 'Unpaid', status: booking.status, createdAt: new Date(booking.created_at),
    })
    row.getCell('F').numFmt = 'dd-mmm-yyyy'
    row.getCell('H').numFmt = 'dd-mmm-yyyy'
    row.getCell('K').numFmt = '₹#,##0'
    row.getCell('N').numFmt = 'dd-mmm-yyyy hh:mm'
  }

  sheet.autoFilter = { from: 'A2', to: `N${Math.max(2, sheet.rowCount)}` }
  sheet.getRow(1).height = 25
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function getMailConfig() {
  const user = process.env.GMAIL_USER?.trim()
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')
  const owners = (process.env.OWNER_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean)
  return { user, appPassword, owners }
}

function termsEmailHtml(booking, bookingTerms) {
  const terms = normaliseBookingTerms({
    version: booking.terms_version || bookingTerms?.version,
    terms: booking.terms_content || bookingTerms?.terms,
  })
  const BOOKING_TERMS_VERSION = terms.version
  const BOOKING_TERMS = terms.terms
  const termRows = BOOKING_TERMS.map(term => `<li style="margin:0 0 8px">${safe(term)}</li>`).join('')
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f5ef;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #dbe4d7;border-radius:14px;overflow:hidden"><div style="padding:22px 28px;background:#173d35;color:#fff"><div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#d5b36a">Booking terms</div><h1 style="margin:8px 0 0;font-size:26px;font-weight:600">${RESORT_NAME}</h1></div><div style="padding:28px;color:#334b40"><p style="margin:0 0 16px">Hello ${safe(booking.name)}, we received your booking request <strong>${safe(booking.id)}</strong> for ${safe(booking.service)}. You accepted the following terms and conditions (version ${BOOKING_TERMS_VERSION}):</p><ol style="padding-left:20px;font-size:14px;line-height:1.45">${termRows}</ol><p style="margin:20px 0 0;color:#68756e;font-size:12px">Keep this email for your records. Payment and booking confirmation are sent separately.</p></div></div></body></html>`
}

/** Sends the booking terms immediately after a customer creates a booking request. */
export async function sendBookingTermsEmail(booking, bookingTerms) {
  const { user, appPassword } = getMailConfig()
  if (!user || !appPassword || !booking.email) return { sent: false, reason: 'gmail-not-configured-or-no-customer-email' }
  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: appPassword } })
    await transporter.sendMail({
      from: `${RESORT_NAME} <${process.env.GMAIL_FROM?.trim() || user}>`,
      to: booking.email,
      subject: `Booking terms & conditions — ${booking.id}`,
      html: termsEmailHtml(booking, bookingTerms),
    })
    return { sent: true }
  } catch (error) {
    console.error(`Booking terms email failed for ${booking.id}:`, error)
    return { sent: false, reason: 'delivery-failed' }
  }
}

/** Sends the customer invoice and a separate owner email with the 30-day XLSX report. */
export async function sendPaidBookingEmails({ booking, last30DaysBookings, paymentSource, sendCustomer = true, sendOwners = true }) {
  const { user, appPassword, owners } = getMailConfig()
  if (!user || !appPassword) {
    console.warn('Payment email skipped: GMAIL_USER or GMAIL_APP_PASSWORD is not configured.')
    return { sent: false, reason: 'gmail-not-configured' }
  }

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: appPassword } })
  const jobs = []
  if (sendCustomer && booking.email) {
    jobs.push(transporter.sendMail({
      from: `${RESORT_NAME} <${process.env.GMAIL_FROM?.trim() || user}>`,
      to: booking.email,
      subject: `Payment received — booking ${booking.id}`,
      html: invoiceHtml(booking, { recipient: 'guest', paymentSource }),
    }))
  }

  if (sendOwners && owners.length) {
    const report = await createBookingsWorkbook(last30DaysBookings)
    const filename = `siddhi-farm-bookings-last-30-days-${new Date().toISOString().slice(0, 10)}.xlsx`
    for (const owner of owners) {
      jobs.push(transporter.sendMail({
        from: `${RESORT_NAME} <${process.env.GMAIL_FROM?.trim() || user}>`,
        to: owner,
        subject: `Paid booking ${booking.id} — ${booking.name}`,
        html: invoiceHtml(booking, { recipient: 'owner', paymentSource }),
        attachments: [{ filename, content: report, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
      }))
    }
  }

  if (!jobs.length) {
    console.warn(`Payment email skipped for ${booking.id}: no customer or owner email recipient configured.`)
    return { sent: false, reason: 'no-recipients' }
  }
  await Promise.all(jobs)
  return { sent: true, customer: sendCustomer && Boolean(booking.email), owners: sendOwners ? owners.length : 0 }
}
