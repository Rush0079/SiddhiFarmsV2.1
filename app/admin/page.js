/**
 * ============================================================================
 * SIDDHI FARM RESORT — ADMIN DASHBOARD ORCHESTRATOR
 * ============================================================================
 *
 * @fileoverview  The central administrative dashboard orchestrator for Siddhi Farm Resort.
 *                Implements a component-based architecture where each administrative domain
 *                is isolated into dedicated presentational and container components:
 *                - Authentication & Profile Authorization guard (Staff / Manager / Super Admin)
 *                - Data synchronization across pricing, summary, bookings, coupons, images,
 *                  payment configuration, legal terms, advance deposit codes, and flash sales.
 *                - Modularized components:
 *                    1. AdminHeader: Top operations navigation bar
 *                    2. AdminStatsCards: Real-time business KPI metrics
 *                    3. OverviewTab: Executive financial velocity & status charts
 *                    4. BookingsTab: Guest reservation desk with search, filter, and balance clearing
 *                    5. ShortStaysTab: Day-use / hourly rates and same-day stay records
 *                    6. PricingTab: Rate card and promotional coupon codes
 *                    7. FlashSaleTab: Scheduled flash sale campaign manager
 *                    8. AdvanceCodesTab: Single-use advance deposit token generator
 *                    9. PaymentsTab: Direct UPI fallback details & QR code uploader
 *                    10. ContentTab: Media library section uploader & booking terms editor
 *                    11. TeamTab: Super Admin user provisioning & role management
 *                    12. TimeEditorModal: Custom check-in/out timings modal
 *                    13. SuperAdminOtpModal: Two-factor authorization challenge dialog
 *
 * @module        app/admin/page
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 * @see           DESIGN_PATTERNS.md for architecture and design patterns
 */

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { showSuccess, showError, showAlert, showConfirm, showToast } from '@/lib/swal'
import { LuxuryPageLoader } from '@/components/luxury-loader'

// ─── Admin Domain Components (Component-Based Architecture) ─────────────────
import AdminHeader from '@/components/admin/admin-header'
import AdminStatsCards from '@/components/admin/admin-stats-cards'
import OverviewTab from '@/components/admin/overview-tab'
import BookingsTab from '@/components/admin/bookings-tab'
import ShortStaysTab from '@/components/admin/short-stays-tab'
import PricingTab from '@/components/admin/pricing-tab'
import FlashSaleTab from '@/components/admin/flash-sale-tab'
import AdvanceCodesTab from '@/components/admin/advance-codes-tab'
import PaymentsTab from '@/components/admin/payments-tab'
import ContentTab from '@/components/admin/content-tab'
import TeamTab from '@/components/admin/team-tab'
import TimeEditorModal from '@/components/admin/time-editor-modal'
import SuperAdminOtpModal from '@/components/admin/super-admin-otp-modal'

/**
 * AdminPage — Central Operations Desk Orchestrator
 *
 * @component
 * @returns {JSX.Element} The rendered admin dashboard.
 */
export default function AdminPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // ─── State Management ─────────────────────────────────────────────────────
  /** @state {Object|null} profile - Authenticated staff profile record */
  const [profile, setProfile] = useState(null)

  /** @state {string} tab - Active dashboard tab identifier */
  const [tab, setTab] = useState('overview')

  /** @state {boolean} mounted - Client hydration flag */
  const [mounted, setMounted] = useState(false)

  // Domain state
  const [pricing, setPricing] = useState({})
  const [summary, setSummary] = useState({})
  const [bookings, setBookings] = useState([])
  const [coupons, setCoupons] = useState([])
  const [customers, setCustomers] = useState([])
  const [images, setImages] = useState({})
  const [payments, setPayments] = useState({ upiId: '', upiName: '', qrUrl: '' })
  const [bookingTerms, setBookingTerms] = useState({ version: '', terms: [] })
  const [termsText, setTermsText] = useState('')
  const [advanceCodes, setAdvanceCodes] = useState([])
  const [flashSale, setFlashSale] = useState({
    enabled: false,
    name: '',
    badgeText: '⚡ FLASH SALE',
    discountType: 'percentage',
    discountValue: 20,
    startDateTime: '',
    endDateTime: '',
    bannerMessage: '',
    applicableServices: 'all',
    imageUrl: '',
  })

  // Form states
  const [coupon, setCoupon] = useState({ code: '', value: '', type: 'percentage' })
  const [newRate, setNewRate] = useState({ name: '', price: '' })
  const [advanceForm, setAdvanceForm] = useState({ code: '', percentage: '50', fixedAmount: '' })
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', role: 'staff' })

  // Operation flags & modals
  const [saved, setSaved] = useState(false)
  const [paySaved, setPaySaved] = useState(false)
  const [termsSaved, setTermsSaved] = useState(false)
  const [qrUploading, setQrUploading] = useState(false)
  const [uploadingKey, setUploadingKey] = useState(null)
  const [pendingImageKey, setPendingImageKey] = useState(null)
  const [timeEditor, setTimeEditor] = useState(null)
  const [savingTimes, setSavingTimes] = useState(false)
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [authModal, setAuthModal] = useState(null)
  const [savingSale, setSavingSale] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ─── Super Admin OTP Resend Cooldown Loop ─────────────────────────────────
  useEffect(() => {
    if (!authModal?.resendCooldown || authModal.resendCooldown <= 0) return
    const timer = setInterval(() => {
      setAuthModal((prev) =>
        prev && prev.resendCooldown > 0
          ? { ...prev, resendCooldown: prev.resendCooldown - 1 }
          : prev
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [authModal?.resendCooldown])

  // ─── Initial Authorization & Data Ingestion ───────────────────────────────
  async function loadAll() {
    console.log('[UI:AdminPage:DATA] Ingesting all administrative domain records')
    const [p, s, b, c, i, pay, terms, adv, fs, cust] = await Promise.all([
      fetch('/api/pricing').then((r) => r.json()).catch(() => ({})),
      fetch('/api/admin/summary').then((r) => r.json()).catch(() => ({})),
      fetch('/api/bookings').then((r) => r.json()).catch(() => []),
      fetch('/api/coupons').then((r) => r.json()).catch(() => []),
      fetch('/api/images').then((r) => r.json()).catch(() => ({})),
      fetch('/api/payments/config').then((r) => r.json()).catch(() => ({})),
      fetch('/api/booking-terms').then((r) => r.json()).catch(() => ({})),
      fetch('/api/advance-codes').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/flash-sale').then((r) => r.json()).catch(() => ({})),
      fetch('/api/admin/customers').then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])

    setPricing(p)
    setSummary(s)
    setBookings(Array.isArray(b) ? b : [])
    setCoupons(Array.isArray(c) ? c : [])
    setImages(i)
    setPayments(pay)
    setBookingTerms(terms)
    setTermsText((terms.terms || []).join('\n'))
    setAdvanceCodes(Array.isArray(adv) ? adv : [])
    if (fs.config) setFlashSale(fs.config)
    setCustomers(Array.isArray(cust) ? cust : [])
  }

  useEffect(() => {
    ;(async () => {
      console.log('[UI:AdminPage:AUTH] Verifying administrative session')
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.warn('[UI:AdminPage:AUTH:WARN] No user session found, redirecting to login')
        window.location.replace('/login?reason=timeout')
        return
      }

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!p || !['staff', 'manager', 'super_admin'].includes(p.role)) {
        console.warn('[UI:AdminPage:AUTH:WARN] User lacks admin privileges, redirecting home')
        router.push('/')
        return
      }

      console.log('[UI:AdminPage:AUTH:SUCCESS] Authorized as:', p.role)
      setProfile(p)
      await loadAll()
    })()

    // Detect Back/Forward navigation from bfcache
    const handlePageShow = async (event) => {
      if (event.persisted) {
        console.warn('[ADMIN:BFCACHE] Page restored from back-forward cache. Verifying session...')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.replace('/login?reason=timeout')
        }
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  // ─── Domain Handlers: Pricing & Rates ─────────────────────────────────────
  async function savePricing() {
    console.log('[UI:AdminPage:PRICING] Saving rate card')
    const res = await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pricing),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 401 || res.status === 403) {
        showError('Session Expired', data.error || 'Your administrative session has expired. Please sign in again.')
        window.location.replace('/login?reason=timeout')
        return
      }
      showError('Save Failed', data.error || 'Could not save pricing')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
    showToast('Pricing rates updated successfully!')
  }

  async function savePricingMap(map) {
    setPricing(map)
    const res = await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(map),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      if (res.status === 401 || res.status === 403) {
        showError('Session Expired', data.error || 'Your administrative session has expired. Please sign in again.')
        window.location.replace('/login?reason=timeout')
        return
      }
      showError('Save Failed', data.error || 'Could not update rates')
      return
    }
    loadAll()
  }

  function addRate(event) {
    event.preventDefault()
    const name = newRate.name.trim()
    const price = Number(newRate.price)
    if (!name || !(price >= 0)) return
    let key =
      ('custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')).slice(
        0,
        40
      ) || 'custom_rate'
    while (key in pricing) key = `${key}_2`.slice(0, 40)
    setNewRate({ name: '', price: '' })
    savePricingMap({
      ...pricing,
      [key]: price,
      _labels: { ...(pricing._labels || {}), [key]: name },
    })
    showToast(`Added rate: ${name}`)
  }

  async function deleteRate(key) {
    const ok = await showConfirm({
      title: 'Delete Rate?',
      text: 'Are you sure you want to delete this custom rate? This cannot be undone.',
      isDanger: true,
    })
    if (!ok) return
    const next = { ...pricing, _labels: { ...(pricing._labels || {}) } }
    delete next[key]
    delete next._labels[key]
    savePricingMap(next)
    showToast('Rate deleted')
  }

  // ─── Domain Handlers: Coupons & Advance Codes ─────────────────────────────
  async function createCoupon(event) {
    event.preventDefault()
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coupon),
    })
    if (res.ok) {
      setCoupon({ code: '', value: '', type: 'percentage' })
      showToast(`Coupon ${coupon.code.toUpperCase()} created!`)
      loadAll()
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Coupon Creation Failed', d.error || 'Could not create coupon')
    }
  }

  async function deleteCoupon(id) {
    const ok = await showConfirm({
      title: 'Delete Coupon?',
      text: 'Are you sure you want to delete this coupon?',
      isDanger: true,
    })
    if (!ok) return
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    showToast('Coupon removed')
    loadAll()
  }

  async function createAdvanceCode(event) {
    event.preventDefault()
    const code = advanceForm.code.trim().toUpperCase()
    if (!code) return
    const res = await fetch('/api/advance-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(advanceForm),
    })
    if (res.ok) {
      setAdvanceForm({ code: '', percentage: '50', fixedAmount: '' })
      showSuccess(
        'Advance Code Created',
        `Single-use code "${code}" is ready to share with customer. It will auto-delete upon booking.`
      )
      loadAll()
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Creation Failed', d.error || 'Failed to create advance code')
    }
  }

  async function deleteAdvanceCode(id) {
    const ok = await showConfirm({
      title: 'Delete Advance Code?',
      text: 'Are you sure you want to delete this advance code?',
      isDanger: true,
    })
    if (!ok) return
    await fetch(`/api/advance-codes/${id}`, { method: 'DELETE' })
    showToast('Advance code deleted')
    loadAll()
  }

  // ─── Domain Handlers: Bookings & Payments ─────────────────────────────────
  async function updateBooking(id, status) {
    console.log(`[UI:AdminPage:BOOKING] Updating booking ${id} status to ${status}`)
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      showError('Update Failed', data.error || 'Could not update the booking')
      return
    }
    if (status === 'confirmed' && data.email) {
      if (data.email.sent) {
        showSuccess(
          'Booking Confirmed',
          `Owner report accepted for delivery to ${data.email.owners || 0} configured owner email address(es).`
        )
      } else {
        showAlert(
          'Booking Confirmed',
          `Booking confirmed, but owner email was not sent (${data.email.reason || 'unknown error'}).`,
          'warning'
        )
      }
    } else {
      showToast(`Booking marked as ${status}`)
    }
    loadAll()
  }

  async function markBalancePaid(item) {
    const bal = item.pending_amount || 0
    const ok = await showConfirm({
      title: 'Clear Remaining Balance?',
      text: `Mark remaining balance of ₹${Number(bal).toLocaleString('en-IN')} as cleared for ${item.name}? This will mark the booking as fully paid and send the final clearance invoice.`,
      confirmButtonText: 'Yes, Mark Balance Paid',
      icon: 'question',
    })
    if (!ok) return
    const res = await fetch(`/api/bookings/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markBalance: true }),
    })
    if (res.ok) {
      showSuccess(
        'Balance Cleared',
        `Booking ${item.id} is now marked 100% paid and confirmed. Clearance confirmation email dispatched.`
      )
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Error', d.error || 'Could not clear balance')
    }
    loadAll()
  }

  async function markPaid(item) {
    const claim = (item.notes || '').split('\n').filter((l) => l.includes('UPI claim')).pop()
    const ok = await showConfirm({
      title: 'Confirm Payment & Booking',
      text: `Mark booking ${item.id} (${item.name}) as paid and confirmed?${claim ? `\n\n${claim}` : ''}`,
      confirmButtonText: 'Yes, Mark Paid & Confirm',
      icon: 'question',
    })
    if (!ok) return
    const res = await fetch(`/api/bookings/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paid: true, status: 'confirmed' }),
    })
    if (res.ok) {
      showSuccess(
        'Payment Confirmed',
        `Booking ${item.id} is confirmed and invoice email has been sent.`
      )
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Failed', d.error || 'Could not mark booking paid')
    }
    loadAll()
  }

  async function deleteBooking(id) {
    const ok = await showConfirm({
      title: 'Delete Booking Request?',
      text: 'Are you sure you want to delete this booking request? This cannot be undone.',
      isDanger: true,
    })
    if (!ok) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    showToast('Booking deleted')
    loadAll()
  }

  async function saveBookingTimes() {
    if (!timeEditor) return
    setSavingTimes(true)
    const res = await fetch(`/api/bookings/${timeEditor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkInTime: timeEditor.checkInTime,
        checkOutTime: timeEditor.checkOutTime,
      }),
    })
    setSavingTimes(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showError('Error', d.error || 'Could not save booking times')
      return
    }
    setTimeEditor(null)
    showToast('Booking times updated')
    loadAll()
  }

  // ─── Domain Handlers: Media & Terms ───────────────────────────────────────
  async function setImageUrl(key, url) {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, url }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showError('Save Failed', d.error || 'Could not save image')
      return
    }
    showToast('Image URL saved')
    loadAll()
  }

  async function uploadImage(key, file) {
    setUploadingKey(key)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('key', key)
    const res = await fetch('/api/images/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showError('Upload Failed', d.error || 'Upload failed')
    } else {
      showToast('Image uploaded successfully')
    }
    setUploadingKey(null)
    loadAll()
  }

  async function savePayments() {
    const res = await fetch('/api/payments/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payments),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showError('Save Failed', d.error || 'Could not save payment settings')
      return
    }
    setPaySaved(true)
    setTimeout(() => setPaySaved(false), 1800)
    showToast('Payment settings saved')
    loadAll()
  }

  async function uploadQr(file) {
    setQrUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/payments/qr', { method: 'POST', body: fd })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showError('Upload Failed', d.error || 'QR upload failed')
    } else {
      showToast('UPI QR uploaded')
    }
    setQrUploading(false)
    loadAll()
  }

  async function saveBookingTerms() {
    const terms = termsText
      .split('\n')
      .map((term) => term.trim())
      .filter(Boolean)
    if (!bookingTerms.version.trim() || !terms.length) {
      showError('Validation Error', 'Please add a version number and at least one term.')
      return
    }
    const res = await fetch('/api/booking-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: bookingTerms.version, terms }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      showError('Save Failed', data.error || 'Could not save booking terms')
      return
    }
    setTermsSaved(true)
    setTimeout(() => setTermsSaved(false), 1800)
    showToast('Booking terms saved')
    loadAll()
  }

  // ─── Domain Handlers: Flash Sale ──────────────────────────────────────────
  async function uploadBannerImage(file) {
    setBannerUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/flash-sale/upload', { method: 'POST', body: fd })
    setBannerUploading(false)
    if (res.ok) {
      const d = await res.json()
      setFlashSale((prev) => ({ ...prev, imageUrl: d.url }))
      showToast('Campaign banner uploaded successfully')
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Upload Failed', d.error || 'Could not upload banner image')
    }
  }

  async function saveFlashSale(event) {
    if (event) event.preventDefault()
    setSavingSale(true)
    const res = await fetch('/api/flash-sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flashSale),
    })
    const data = await res.json().catch(() => ({}))
    setSavingSale(false)
    if (res.ok) {
      showSuccess(
        flashSale.enabled ? 'Flash Sale Saved & Live' : 'Flash Sale Disabled',
        flashSale.enabled
          ? `Campaign "${flashSale.name || 'Flash Sale'}" with ${flashSale.discountValue}${flashSale.discountType === 'percentage' ? '%' : '₹'} discount is saved. Security alert email has been sent to owners.`
          : 'Flash sale disabled and taken offline. Security alert email sent to owners.'
      )
      loadAll()
    } else {
      showError('Save Failed', data.error || 'Could not save flash sale campaign')
    }
  }

  // ─── Domain Handlers: Team & Roles ────────────────────────────────────────
  function checkPasswordComplexity(pw) {
    if (!pw || pw.length < 10) return 'Password must be at least 10 characters long.'
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter (A-Z).'
    if (!/[0-9]/.test(pw)) return 'Password must contain at least one digit (0-9).'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw))
      return 'Password must contain at least one special character (e.g. !@#$%^&*).'
    return null
  }

  async function initiateCreateAdminUser(event) {
    event.preventDefault()
    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password) {
      showError('Validation Error', 'Please enter a name, email address, and password.')
      return
    }
    const pwErr = checkPasswordComplexity(newAdmin.password)
    if (pwErr) {
      showError(
        'Password Requirements',
        `${pwErr}\n\nRequirements:\n• Min 10 characters\n• At least 1 uppercase letter (A-Z)\n• At least 1 number (0-9)\n• At least 1 special character (!@#$%^&*)`
      )
      return
    }

    setCreatingAdmin(true)
    try {
      const res = await fetch('/api/admin/auth-otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_admin',
          targetEmail: newAdmin.email.trim().toLowerCase(),
          targetRole: newAdmin.role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not dispatch authorization OTP')
      }

      setAuthModal({
        action: 'create_admin',
        target: { ...newAdmin },
        maskedEmail: data.maskedEmail || profile?.email || 'Registered Email',
        maskedPhone: data.maskedPhone || profile?.phone || '',
        otp: '',
        loading: false,
        resendCooldown: 45,
      })
    } catch (err) {
      showError('Authorization Request Failed', err.message || 'Could not send verification code.')
    } finally {
      setCreatingAdmin(false)
    }
  }

  async function confirmCreateAdminUser(event) {
    event.preventDefault()
    if (!authModal?.otp || authModal.otp.length !== 6) {
      showError('Verification Required', 'Please enter the 6-digit verification code.')
      return
    }

    setAuthModal((prev) => ({ ...prev, loading: true }))
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authModal.target,
          superAdminOtp: authModal.otp.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account')
      }

      setAuthModal(null)
      showSuccess(
        'Team Account Created',
        `Successfully provisioned account for ${authModal.target.name} (${authModal.target.email}) with role "${authModal.target.role.toUpperCase()}".`
      )
      setNewAdmin({ name: '', email: '', password: '', role: 'staff' })
      loadAll()
    } catch (err) {
      showError('Authorization Failed', err.message || 'Verification code failed.')
      setAuthModal((prev) => ({ ...prev, loading: false }))
    }
  }

  async function resendSuperAdminOtp() {
    if (!authModal || authModal.resendCooldown > 0) return
    try {
      const res = await fetch('/api/admin/auth-otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authModal.action,
          targetEmail: authModal.target?.email,
          targetRole: authModal.target?.role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setAuthModal((prev) => ({ ...prev, resendCooldown: 60 }))
        showToast('New verification code sent to your email & mobile')
      } else {
        showError('Resend Failed', data.error || 'Could not resend verification code')
      }
    } catch (err) {
      showError('Network Error', 'Could not resend verification code')
    }
  }

  async function changeRole(userId, role) {
    await fetch('/api/admin/customers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    showToast(`Role updated to ${role}`)
    loadAll()
  }

  async function removeRole(userId) {
    const ok = await showConfirm({
      title: 'Demote to Customer?',
      text: 'The user will be demoted back to a regular customer and lose dashboard access.',
      isDanger: true,
    })
    if (!ok) return
    const res = await fetch(`/api/admin/customers/${userId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      showError('Error', d.error || 'Could not demote user')
      return
    }
    showToast('User demoted to regular customer')
    loadAll()
  }

  async function deleteUserAccount(userId, userName) {
    const ok = await showConfirm({
      title: 'Permanently Delete User?',
      text: `Are you sure you want to permanently delete user "${userName || 'this account'}"? Their profile and authentication account will be completely removed.`,
      confirmButtonText: 'Yes, Delete Permanently',
      isDanger: true,
    })
    if (!ok) return
    const res = await fetch(`/api/admin/customers/${userId}?deleteUser=true`, {
      method: 'DELETE',
    })
    if (res.ok) {
      showSuccess(
        'User Deleted',
        `Account for "${userName || 'user'}" has been permanently removed.`
      )
      loadAll()
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Delete Failed', d.error || 'Could not delete user account')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // ─── Guard: Render loader until verified staff profile is available ───────
  if (!profile) {
    return (
      <LuxuryPageLoader
        title="Siddhi Admin Command Center"
        subtitle="Connecting to secure resort database & live analytics..."
      />
    )
  }

  const canManagePricing = ['manager', 'super_admin'].includes(profile.role)
  const canDelete = ['manager', 'super_admin'].includes(profile.role)
  const canManageRoles = profile.role === 'super_admin'
  const rootAdminId = customers
    .filter((u) => u.role === 'super_admin')
    .reduce(
      (a, b) => (!a || new Date(b.created_at) < new Date(a.created_at) ? b : a),
      null
    )?.id

  const sections = [
    ['overview', 'Overview'],
    ['bookings', 'All Bookings'],
    ['short_stays', '☀️ Short stays'],
    ...(canManagePricing
      ? [
          ['pricing', 'Pricing & offers'],
          ['sales', '⚡ Flash sales'],
          ['advance', 'Advance codes'],
          ['payments', 'Payments'],
          ['content', 'Images & terms'],
        ]
      : []),
    ...(canManageRoles ? [['customers', 'Admins']] : []),
  ]

  return (
    <main className="min-h-screen bg-[#f3f5ef] text-[#173d35]">
      {/* 1. Header with Role & Brand Attribution */}
      <AdminHeader profile={profile} onSignOut={signOut} />

      <div className="container py-10">
        {/* Greetings & Security Verification Badge */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Signed in as {profile.email}</p>
            <h1 className="section-title mt-2 text-4xl">
              Good day, {profile.full_name || 'team'}.
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              Manage live resort pricing, bookings, coupons and team access.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#e3eee1] px-4 py-2 text-xs font-semibold text-[#315d4c] shadow-xs">
            <span className="radar-dot" />
            <ShieldCheck size={15} /> Verified Staff Portal
          </div>
        </div>

        {/* 2. Top KPI Summary Cards */}
        <AdminStatsCards summary={summary} />

        {/* 3. Navigation Bar */}
        <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-[#dfe7dc] pb-3" aria-label="Admin sections">
          {sections.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`admin-tab-motion whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
                tab === id
                  ? 'admin-tab-active bg-[#173d35] text-white shadow-sm'
                  : 'bg-white text-[#315d4c] hover:bg-[#eaf0e7]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* 4. Tab 1: Overview (Charts & Insights) */}
        {tab === 'overview' && (
          <OverviewTab
            bookings={bookings}
            summary={summary}
            canManagePricing={canManagePricing}
            canManageRoles={canManageRoles}
            onSelectTab={setTab}
            mounted={mounted}
          />
        )}

        {/* 5. Tab 2: Bookings Ledger */}
        {tab === 'bookings' && (
          <BookingsTab
            bookings={bookings}
            canDelete={canDelete}
            onUpdateTime={setTimeEditor}
            onMarkPaid={markPaid}
            onMarkBalancePaid={markBalancePaid}
            onUpdateStatus={updateBooking}
            onDelete={deleteBooking}
          />
        )}

        {/* 6. Tab 3: Short Stays & Day Use */}
        {tab === 'short_stays' && (
          <ShortStaysTab
            pricing={pricing}
            setPricing={setPricing}
            bookings={bookings}
            canManagePricing={canManagePricing}
            canDelete={canDelete}
            saved={saved}
            onSave={savePricing}
            onMarkPaid={markPaid}
            onUpdateStatus={updateBooking}
            onDelete={deleteBooking}
          />
        )}

        {/* 7. Tab 4: Pricing & Promotional Coupons */}
        {canManagePricing && tab === 'pricing' && (
          <PricingTab
            pricing={pricing}
            setPricing={setPricing}
            coupons={coupons}
            coupon={coupon}
            setCoupon={setCoupon}
            newRate={newRate}
            setNewRate={setNewRate}
            canManagePricing={canManagePricing}
            canDelete={canDelete}
            saved={saved}
            onSavePricing={savePricing}
            onAddRate={addRate}
            onDeleteRate={deleteRate}
            onCreateCoupon={createCoupon}
            onDeleteCoupon={deleteCoupon}
          />
        )}

        {/* 8. Tab 5: Scheduled Flash Sales */}
        {canManagePricing && tab === 'sales' && (
          <FlashSaleTab
            flashSale={flashSale}
            setFlashSale={setFlashSale}
            savingSale={savingSale}
            bannerUploading={bannerUploading}
            onUploadBanner={uploadBannerImage}
            onSaveSale={saveFlashSale}
          />
        )}

        {/* 9. Tab 6: Advance Deposit Tokens */}
        {canManagePricing && tab === 'advance' && (
          <AdvanceCodesTab
            advanceCodes={advanceCodes}
            advanceForm={advanceForm}
            setAdvanceForm={setAdvanceForm}
            onCreateCode={createAdvanceCode}
            onDeleteCode={deleteAdvanceCode}
          />
        )}

        {/* 10. Tab 7: UPI Payments Fallback */}
        {canManagePricing && tab === 'payments' && (
          <PaymentsTab
            payments={payments}
            setPayments={setPayments}
            paySaved={paySaved}
            qrUploading={qrUploading}
            onSave={savePayments}
            onUploadQr={uploadQr}
            onRemoveQr={() => {
              const updated = { ...payments, qrUrl: '' }
              setPayments(updated)
              fetch('/api/payments/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
              }).then(loadAll)
            }}
          />
        )}

        {/* 11. Tab 8: Media Library & Booking Terms */}
        {canManagePricing && tab === 'content' && (
          <ContentTab
            images={images}
            uploadingKey={uploadingKey}
            pendingImageKey={pendingImageKey}
            onPickImageFile={setPendingImageKey}
            onSetImageUrl={setImageUrl}
            onUploadImage={uploadImage}
            bookingTerms={bookingTerms}
            setBookingTerms={setBookingTerms}
            termsText={termsText}
            setTermsText={setTermsText}
            termsSaved={termsSaved}
            onSaveTerms={saveBookingTerms}
          />
        )}

        {/* 12. Tab 9: Team Access & Role Provisioning */}
        {canManageRoles && tab === 'customers' && (
          <TeamTab
            customers={customers}
            rootAdminId={rootAdminId}
            newAdmin={newAdmin}
            setNewAdmin={setNewAdmin}
            creatingAdmin={creatingAdmin}
            onInitiateUser={initiateCreateAdminUser}
            onChangeRole={changeRole}
            onRemoveRole={removeRole}
            onDeleteUser={deleteUserAccount}
          />
        )}

        {/* ─── Modals ────────────────────────────────────────────────────── */}
        {/* Time Editor Modal */}
        <TimeEditorModal
          timeEditor={timeEditor}
          setTimeEditor={setTimeEditor}
          onSave={saveBookingTimes}
          saving={savingTimes}
        />

        {/* Super Admin 2FA OTP Modal */}
        <SuperAdminOtpModal
          authModal={authModal}
          setAuthModal={setAuthModal}
          onConfirm={confirmCreateAdminUser}
          onResend={resendSuperAdminOtp}
        />

        {/* Operations Footer */}
        <footer className="mt-14 border-t border-[#dfe7dc] pt-6 pb-6 text-center text-xs text-slate-500">
          <div className="flex flex-col items-center justify-center gap-1.5">
            <span>Siddhi Farm Resort Operations Desk</span>
            <span className="text-[11.5px] text-slate-500 font-medium">
              Developed &amp; Maintained by{' '}
              <span className="font-semibold text-[#173d35]">Rushikesh Nigade</span>
            </span>
          </div>
        </footer>
      </div>
    </main>
  )
}
