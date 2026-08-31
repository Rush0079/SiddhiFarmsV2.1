'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Clock3, Edit3, Image as ImageIcon, LayoutDashboard, LogOut, Percent, Plus, QrCode, RotateCcw, Save, ScrollText, ShieldCheck, Trash2, Upload, Users, Loader2, X, FileText, Share2, Printer, Zap, KeyRound, Mail, Smartphone, RefreshCw, TrendingUp, PieChart as PieIcon, Activity, Sparkles, ChevronRight } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { IMAGE_SECTIONS } from '@/lib/siteImages'
import { showSuccess, showError, showAlert, showConfirm, showToast } from '@/lib/swal'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'
import SiddhiLogo from '@/components/siddhi-logo'

const labels = {
  masterBedroom: 'Master bedroom (Overnight)',
  villa2BHK: '2 BHK villa (Overnight)',
  villa4BHK: '4 BHK villa (Overnight)',
  masterBedroomShortStay: 'Master bedroom (Short Stay / Day-Use)',
  villa2BHKShortStay: '2 BHK villa (Short Stay / Day-Use)',
  villa4BHKShortStay: '4 BHK villa (Short Stay / Day-Use)',
  oneDayTour: 'One day tour',
  miniWaterPark: 'One day tour + mini water park',
  weddingEvent: 'Wedding event',
  engagementEvent: 'Engagement event',
  birthdayEvent: 'Birthday event',
  getTogetherEvent: 'Get-together event'
}

function displayBookingTime(value, fallback) {
  const [hours, minutes] = String(value || fallback).split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes || 0).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [profile, setProfile] = useState(null)
  const [pricing, setPricing] = useState({})
  const [summary, setSummary] = useState({})
  const [bookings, setBookings] = useState([])
  const [coupons, setCoupons] = useState([])
  const [customers, setCustomers] = useState([])
  const [coupon, setCoupon] = useState({ code: '', value: '', type: 'percentage' })
  const [newRate, setNewRate] = useState({ name: '', price: '' })
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('overview')
  const [images, setImages] = useState({})
  const [uploadingKey, setUploadingKey] = useState(null)
  const [pendingImageKey, setPendingImageKey] = useState(null)
  const fileInputRef = useRef(null)
  const [payments, setPayments] = useState({ upiId: '', upiName: '', qrUrl: '' })
  const [paySaved, setPaySaved] = useState(false)
  const [qrUploading, setQrUploading] = useState(false)
  const qrInputRef = useRef(null)
  const [timeEditor, setTimeEditor] = useState(null)
  const [savingTimes, setSavingTimes] = useState(false)
  const [bookingTerms, setBookingTerms] = useState({ version: '', terms: [] })
  const [termsText, setTermsText] = useState('')
  const [termsSaved, setTermsSaved] = useState(false)
  const [advanceCodes, setAdvanceCodes] = useState([])
  const [advanceForm, setAdvanceForm] = useState({ code: '', percentage: '50', fixedAmount: '' })
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' })
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [authModal, setAuthModal] = useState(null)
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
  const [savingSale, setSavingSale] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const bannerFileInputRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const revenueChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const data = days.map(d => ({ name: d, revenue: 0, bookings: 0 }))
    bookings.forEach((b) => {
      const date = new Date(b.created_at || b.checkIn || Date.now())
      const dayIdx = (date.getDay() + 6) % 7
      if (data[dayIdx]) {
        data[dayIdx].revenue += Number(b.total_amount || b.amount || 0)
        data[dayIdx].bookings += 1
      }
    })
    return data
  }, [bookings])

  const statusDistribution = useMemo(() => {
    const confirmed = bookings.filter(b => b.paid || b.status === 'confirmed').length
    const pending = bookings.filter(b => !b.paid && b.status !== 'cancelled').length
    const cancelled = bookings.filter(b => b.status === 'cancelled').length
    return [
      { name: 'Confirmed', value: confirmed || (summary.confirmed || 0), color: '#315d4c' },
      { name: 'Pending', value: pending || (summary.pending || 0), color: '#d5b36a' },
      { name: 'Cancelled', value: cancelled, color: '#ef4444' },
    ]
  }, [bookings, summary])

  useEffect(() => {
    if (!authModal?.resendCooldown || authModal.resendCooldown <= 0) return
    const timer = setInterval(() => {
      setAuthModal(prev => prev && prev.resendCooldown > 0 ? { ...prev, resendCooldown: prev.resendCooldown - 1 } : prev)
    }, 1000)
    return () => clearInterval(timer)
  }, [authModal?.resendCooldown])

  async function loadAll() {
    const [p, s, b, c, i, pay, terms, adv, fs] = await Promise.all([
      fetch('/api/pricing'),
      fetch('/api/admin/summary'),
      fetch('/api/bookings'),
      fetch('/api/coupons'),
      fetch('/api/images'),
      fetch('/api/payments/config'),
      fetch('/api/booking-terms'),
      fetch('/api/advance-codes'),
      fetch('/api/flash-sale'),
    ])
    setPricing(await p.json())
    setSummary(await s.json())
    setBookings(await b.json())
    setCoupons(await c.json())
    setImages(await i.json())
    setPayments(await pay.json())
    const termsData = await terms.json()
    setBookingTerms(termsData)
    setTermsText((termsData.terms || []).join('\n'))
    if (adv.ok) setAdvanceCodes(await adv.json())
    const fsData = await fs.json().catch(() => ({}))
    if (fsData.config) setFlashSale(fsData.config)

    const cust = await fetch('/api/admin/customers')
    if (cust.ok) setCustomers(await cust.json())
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || !['staff', 'manager', 'super_admin'].includes(p.role)) {
        router.push('/')
        return
      }
      setProfile(p)
      await loadAll()
    })()
  }, [])

  async function savePricing() {
    await fetch('/api/pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pricing) })
    setSaved(true); setTimeout(() => setSaved(false), 1800)
    showToast('Pricing rates updated successfully!')
  }
  async function savePricingMap(map) {
    setPricing(map)
    await fetch('/api/pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(map) })
    loadAll()
  }
  function addRate(event) {
    event.preventDefault()
    const name = newRate.name.trim()
    const price = Number(newRate.price)
    if (!name || !(price >= 0)) return
    let key = ('custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')).slice(0, 40) || 'custom_rate'
    while (key in pricing) key = `${key}_2`.slice(0, 40)
    setNewRate({ name: '', price: '' })
    savePricingMap({ ...pricing, [key]: price, _labels: { ...(pricing._labels || {}), [key]: name } })
    showToast(`Added rate: ${name}`)
  }
  async function deleteRate(key) {
    const ok = await showConfirm({ title: 'Delete Rate?', text: 'Are you sure you want to delete this custom rate? This cannot be undone.', isDanger: true })
    if (!ok) return
    const next = { ...pricing, _labels: { ...(pricing._labels || {}) } }
    delete next[key]
    delete next._labels[key]
    savePricingMap(next)
    showToast('Rate deleted')
  }
  async function createCoupon(event) {
    event.preventDefault()
    const res = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(coupon) })
    if (res.ok) {
      setCoupon({ code: '', value: '', type: 'percentage' })
      showToast(`Coupon ${coupon.code.toUpperCase()} created!`)
      loadAll()
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Coupon Creation Failed', d.error || 'Could not create coupon')
    }
  }
  async function updateBooking(id, status) {
    const res = await fetch(`/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { showError('Update Failed', data.error || 'Could not update the booking'); return }
    if (status === 'confirmed' && data.email) {
      if (data.email.sent) {
        showSuccess('Booking Confirmed', `Owner report accepted for delivery to ${data.email.owners || 0} configured owner email address(es).`)
      } else {
        showAlert('Booking Confirmed', `Booking confirmed, but owner email was not sent (${data.email.reason || 'unknown error'}).`, 'warning')
      }
    } else {
      showToast(`Booking marked as ${status}`)
    }
    loadAll()
  }
  async function deleteCoupon(id) {
    const ok = await showConfirm({ title: 'Delete Coupon?', text: 'Are you sure you want to delete this coupon?', isDanger: true })
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
      showSuccess('Advance Code Created', `Single-use code "${code}" is ready to share with customer. It will auto-delete upon booking.`)
      loadAll()
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Creation Failed', d.error || 'Failed to create advance code')
    }
  }
  async function deleteAdvanceCode(id) {
    const ok = await showConfirm({ title: 'Delete Advance Code?', text: 'Are you sure you want to delete this advance code?', isDanger: true })
    if (!ok) return
    await fetch(`/api/advance-codes/${id}`, { method: 'DELETE' })
    showToast('Advance code deleted')
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
      showSuccess('Balance Cleared', `Booking ${item.id} is now marked 100% paid and confirmed. Clearance confirmation email dispatched.`)
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Error', d.error || 'Could not clear balance')
    }
    loadAll()
  }
  async function deleteBooking(id) {
    const ok = await showConfirm({ title: 'Delete Booking Request?', text: 'Are you sure you want to delete this booking request? This cannot be undone.', isDanger: true })
    if (!ok) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    showToast('Booking deleted')
    loadAll()
  }
  async function setImageUrl(key, url) {
    const res = await fetch('/api/images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, url }) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError('Save Failed', d.error || 'Could not save image'); return }
    showToast('Image URL saved')
    loadAll()
  }
  function pickImageFile(key) {
    setPendingImageKey(key)
    fileInputRef.current?.click()
  }
  async function uploadImage(key, file) {
    setUploadingKey(key)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('key', key)
    const res = await fetch('/api/images/upload', { method: 'POST', body: fd })
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError('Upload Failed', d.error || 'Upload failed') }
    else { showToast('Image uploaded successfully') }
    setUploadingKey(null)
    loadAll()
  }
  async function savePayments() {
    const res = await fetch('/api/payments/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payments) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError('Save Failed', d.error || 'Could not save payment settings'); return }
    setPaySaved(true); setTimeout(() => setPaySaved(false), 1800)
    showToast('Payment settings saved')
    loadAll()
  }
  async function saveBookingTerms() {
    const terms = termsText.split('\n').map(term => term.trim()).filter(Boolean)
    if (!bookingTerms.version.trim() || !terms.length) {
      showError('Validation Error', 'Please add a version number and at least one term.')
      return
    }
    const res = await fetch('/api/booking-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: bookingTerms.version, terms }),
    })
    if (!res.ok) { const data = await res.json().catch(() => ({})); showError('Save Failed', data.error || 'Could not save booking terms'); return }
    setTermsSaved(true); setTimeout(() => setTermsSaved(false), 1800)
    showToast('Booking terms saved')
    loadAll()
  }
  async function uploadQr(file) {
    setQrUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/payments/qr', { method: 'POST', body: fd })
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError('Upload Failed', d.error || 'QR upload failed') }
    else { showToast('UPI QR uploaded') }
    setQrUploading(false)
    loadAll()
  }
  async function markPaid(item) {
    const claim = (item.notes || '').split('\n').filter(l => l.includes('UPI claim')).pop()
    const ok = await showConfirm({
      title: 'Confirm Payment & Booking',
      text: `Mark booking ${item.id} (${item.name}) as paid and confirmed?${claim ? `\n\n${claim}` : ''}`,
      confirmButtonText: 'Yes, Mark Paid & Confirm',
      icon: 'question',
    })
    if (!ok) return
    const res = await fetch(`/api/bookings/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid: true, status: 'confirmed' }) })
    if (res.ok) {
      showSuccess('Payment Confirmed', `Booking ${item.id} is confirmed and invoice email has been sent.`)
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Failed', d.error || 'Could not mark booking paid')
    }
    loadAll()
  }
  async function saveBookingTimes() {
    if (!timeEditor) return
    setSavingTimes(true)
    const res = await fetch(`/api/bookings/${timeEditor.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checkInTime: timeEditor.checkInTime, checkOutTime: timeEditor.checkOutTime }) })
    setSavingTimes(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError('Error', d.error || 'Could not save booking times'); return }
    setTimeEditor(null)
    showToast('Booking times updated')
    loadAll()
  }
  async function changeRole(userId, role) {
    await fetch('/api/admin/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
    showToast(`Role updated to ${role}`)
    loadAll()
  }
  function checkPasswordComplexity(pw) {
    if (!pw || pw.length < 10) return 'Password must be at least 10 characters long.'
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter (A-Z).'
    if (!/[0-9]/.test(pw)) return 'Password must contain at least one digit (0-9).'
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) return 'Password must contain at least one special character (e.g. !@#$%^&*).'
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
      showError('Password Requirements', `${pwErr}\n\nRequirements:\n• Min 10 characters\n• At least 1 uppercase letter (A-Z)\n• At least 1 number (0-9)\n• At least 1 special character (!@#$%^&*)`)
      return
    }

    setCreatingAdmin(true)
    try {
      // Request Super Admin OTP
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

    setAuthModal(prev => ({ ...prev, loading: true }))
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
      showSuccess('Team Account Created', `Successfully provisioned account for ${authModal.target.name} (${authModal.target.email}) with role "${authModal.target.role.toUpperCase()}".`)
      setNewAdmin({ name: '', email: '', password: '', phone: '', role: 'staff' })
      loadAll()
    } catch (err) {
      showError('Authorization Failed', err.message || 'Verification code failed.')
      setAuthModal(prev => ({ ...prev, loading: false }))
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
        setAuthModal(prev => ({ ...prev, resendCooldown: 60 }))
        showToast('New verification code sent to your email & mobile')
      } else {
        showError('Resend Failed', data.error || 'Could not resend verification code')
      }
    } catch (err) {
      showError('Network Error', 'Could not resend verification code')
    }
  }
  async function removeRole(userId) {
    const ok = await showConfirm({ title: 'Demote to Customer?', text: 'The user will be demoted back to a regular customer and lose dashboard access.', isDanger: true })
    if (!ok) return
    const res = await fetch(`/api/admin/customers/${userId}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); showError('Error', d.error || 'Could not demote user'); return }
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
    const res = await fetch(`/api/admin/customers/${userId}?deleteUser=true`, { method: 'DELETE' })
    if (res.ok) {
      showSuccess('User Deleted', `Account for "${userName || 'user'}" has been permanently removed.`)
      loadAll()
    } else {
      const d = await res.json().catch(() => ({}))
      showError('Delete Failed', d.error || 'Could not delete user account')
    }
  }

  async function uploadBannerImage(file) {
    setBannerUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/flash-sale/upload', { method: 'POST', body: fd })
    setBannerUploading(false)
    if (res.ok) {
      const d = await res.json()
      setFlashSale(prev => ({ ...prev, imageUrl: d.url }))
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

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!profile) return <div className="flex min-h-screen items-center justify-center text-[#173d35]"><Loader2 className="animate-spin" /></div>

  const canManagePricing = ['manager', 'super_admin'].includes(profile.role)
  const canDelete = ['manager', 'super_admin'].includes(profile.role)
  const canManageRoles = profile.role === 'super_admin'
  const rootAdminId = customers.filter(u => u.role === 'super_admin').reduce((a, b) => (!a || new Date(b.created_at) < new Date(a.created_at) ? b : a), null)?.id
  const sections = [
    ['overview', 'Overview'],
    ['bookings', 'All Bookings'],
    ['short_stays', '☀️ Short stays'],
    ...(canManagePricing ? [
      ['pricing', 'Pricing & offers'],
      ['sales', '⚡ Flash sales'],
      ['advance', 'Advance codes'],
      ['payments', 'Payments'],
      ['content', 'Images & terms']
    ] : []),
    ...(canManageRoles ? [['customers', 'Admins']] : []),
  ]

  return (
    <main className="min-h-screen bg-[#f3f5ef] text-[#173d35]">
      <header className="border-b border-[#dbe4d7] bg-[#173d35] text-white">
        <div className="container flex min-h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <SiddhiLogo className="h-10 w-10" />
            <div>
              <p className="font-serif text-xl">Siddhi Admin</p>
              <p className="text-[10px] uppercase tracking-[.18em] text-white/55">Operations centre · {profile.role.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 text-sm text-white/70"><ArrowLeft size={15} /> Site</a>
            <button onClick={signOut} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20"><LogOut size={14} /> Sign out</button>
          </div>
        </div>
      </header>
      <div className="container py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Signed in as {profile.email}</p>
            <h1 className="section-title mt-2 text-4xl">Good day, {profile.full_name || 'team'}.</h1>
            <p className="mt-3 text-sm text-slate-500">Manage live resort pricing, bookings, coupons and team access.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#e3eee1] px-4 py-2 text-xs font-semibold text-[#315d4c] shadow-xs">
            <span className="radar-dot" />
            <ShieldCheck size={15} /> Verified Staff Portal
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[['Bookings', summary.bookings || 0], ['Pending', summary.pending || 0], ['Confirmed', summary.confirmed || 0], ['Revenue', `₹${(summary.revenue || 0).toLocaleString('en-IN')}`], ['Active coupons', summary.activeCoupons || 0]].map(([title, value]) => (
            <div className="stat-card-motion rounded-2xl border border-[#dfe7dc] bg-white p-5 cursor-default" key={title}>
              <p className="text-xs font-medium text-slate-500">{title}</p>
              <p className="mt-3 font-serif text-2xl font-bold text-[#315d4c]">{value}</p>
            </div>
          ))}
        </div>

        <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-[#dfe7dc] pb-3" aria-label="Admin sections">
          {sections.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`admin-tab-motion whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${tab === id ? 'admin-tab-active bg-[#173d35] text-white shadow-sm' : 'bg-white text-[#315d4c]'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <div className="mt-8 space-y-8">
            {/* Visual Analytics & Charts */}
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              {/* Revenue & Booking Velocity Curve */}
              <div className="stat-card-motion rounded-3xl border border-[#dfe7dc] bg-white p-6 sm:p-7 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="text-emerald-700" />
                      <p className="eyebrow text-emerald-800">Financial Velocity</p>
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl text-[#173d35] mt-1 font-bold">Weekly Revenue Velocity</h3>
                  </div>
                  <div className="rounded-full bg-[#f3f5ef] px-3.5 py-1 text-xs font-bold text-emerald-900 border border-[#dfe7dc]">
                    7-Day Trajectory
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#173d35" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#173d35" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4ee" />
                        <XAxis dataKey="name" stroke="#8ca392" fontSize={11} tickLine={false} />
                        <YAxis stroke="#8ca392" fontSize={11} tickLine={false} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-xl border border-[#dfe7dc] bg-[#173d35] p-3 text-white shadow-xl">
                                  <p className="text-xs font-bold text-emerald-300">{label}</p>
                                  <p className="text-sm font-semibold mt-1">₹{Number(payload[0]?.value || 0).toLocaleString('en-IN')}</p>
                                  <p className="text-[11px] text-emerald-200/70">{payload[0]?.payload?.bookings || 1} booking(s)</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#173d35" strokeWidth={3} fillOpacity={1} fill="url(#emeraldGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Status Distribution Donut Chart */}
              <div className="stat-card-motion rounded-3xl border border-[#dfe7dc] bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <PieIcon size={18} className="text-emerald-700" />
                    <p className="eyebrow text-emerald-800">Booking Health Ratio</p>
                  </div>
                  <h3 className="font-serif text-xl text-[#173d35] mt-1 font-bold">Payment &amp; Status Mix</h3>
                </div>

                <div className="relative h-56 w-full flex items-center justify-center my-2">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val, name) => [`${val} requests`, name]}
                          contentStyle={{ backgroundColor: '#173d35', borderRadius: '12px', border: 'none', color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold font-serif text-[#173d35]">{bookings.length}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Bookings</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  {statusDistribution.map(item => (
                    <div key={item.name} className="flex flex-col items-center text-xs text-slate-600">
                      <span className="h-2 w-2 rounded-full mb-1" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-medium">{item.name}</span>
                      <strong className="text-slate-800 font-mono text-sm">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Operations Launchpad Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="stat-card-motion rounded-2xl border border-[#dfe7dc] bg-gradient-to-br from-white to-[#fbfcf8] p-5 shadow-xs"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 mb-3">
                  <Zap size={20} />
                </div>
                <h4 className="font-serif text-lg font-bold text-[#173d35]">Flash Sale Engine</h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Launch seasonal promotional discounts with countdown clocks on the live website.
                </p>
                <button
                  onClick={() => setTab('sales')}
                  className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950"
                >
                  Manage Flash Sales <ChevronRight size={14} />
                </button>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="stat-card-motion rounded-2xl border border-[#dfe7dc] bg-gradient-to-br from-white to-[#fbfcf8] p-5 shadow-xs"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 mb-3">
                  <Clock3 size={20} />
                </div>
                <h4 className="font-serif text-lg font-bold text-[#173d35]">Short Stays &amp; Day Use</h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Configure custom daytime hours pricing matrix and view short-stay reservations.
                </p>
                <button
                  onClick={() => setTab('short_stays')}
                  className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950"
                >
                  Configure Short Stays <ChevronRight size={14} />
                </button>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="stat-card-motion rounded-2xl border border-[#dfe7dc] bg-gradient-to-br from-white to-[#fbfcf8] p-5 shadow-xs"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800 mb-3">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-serif text-lg font-bold text-[#173d35]">Staff &amp; 2FA Security</h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Super Admin protected 2FA OTP verification and staff access privileges.
                </p>
                <button
                  onClick={() => setTab(canManageRoles ? 'customers' : 'overview')}
                  className="mt-4 flex items-center gap-1 text-xs font-bold text-sky-800 hover:text-sky-950"
                >
                  {canManageRoles ? 'Manage Team Access' : 'Security Active'} <ChevronRight size={14} />
                </button>
              </motion.div>
            </div>

            {/* Live Activity Stream */}
            <div className="rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#eef2eb] pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-emerald-700" />
                  <h3 className="font-serif text-xl font-bold text-[#173d35]">Recent Reservation Activity</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">{bookings.length} Total Registered</span>
              </div>
              <div className="divide-y divide-[#f0f4ee]">
                {bookings.slice(0, 5).map(b => (
                  <div key={b.id} className="table-row-motion flex flex-wrap items-center justify-between gap-3 py-3 rounded-lg px-2">
                    <div>
                      <p className="text-sm font-bold text-[#173d35]">{b.name || 'Guest'}</p>
                      <p className="text-xs text-slate-500">{b.service || 'Resort Stay'} · {b.checkIn ? new Date(b.checkIn).toLocaleDateString('en-IN') : 'Upcoming'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${b.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {b.paid ? '✓ Confirmed & Paid' : '⏳ Pending Payment'}
                      </span>
                      <strong className="text-sm font-mono text-[#173d35]">₹{Number(b.total_amount || b.amount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'pricing' && <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
          {canManagePricing && (
            <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6">
              <div className="flex items-center justify-between">
                <div><p className="eyebrow">Pricing management</p><h2 className="mt-2 font-serif text-2xl">Season-ready rates</h2></div>
                <Edit3 size={19} className="text-[#709079]" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {Object.entries(labels).map(([key, label]) => (
                  <label key={key}>{label}<div className="relative"><span className="absolute left-3 top-3 text-sm text-slate-400">₹</span><input className="pl-7" type="number" min="0" value={pricing[key] ?? ''} onChange={e => setPricing({ ...pricing, [key]: Number(e.target.value) })} /></div></label>
                ))}
                {Object.entries(pricing._labels || {}).map(([key, label]) => (
                  <label key={key}>
                    <span className="flex items-center justify-between">{label}<button type="button" title="Delete rate" onClick={() => deleteRate(key)} className="rounded-full p-1 text-red-500 hover:bg-red-100"><Trash2 size={13} /></button></span>
                    <div className="relative"><span className="absolute left-3 top-3 text-sm text-slate-400">₹</span><input className="pl-7" type="number" min="0" value={pricing[key] ?? ''} onChange={e => setPricing({ ...pricing, [key]: Number(e.target.value) })} /></div>
                  </label>
                ))}
              </div>
              <form onSubmit={addRate} className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-[#f3f5ef] p-4">
                <label className="flex-1 basis-40">New rate name<input required placeholder="Jacuzzi add-on" value={newRate.name} onChange={e => setNewRate({ ...newRate, name: e.target.value })} /></label>
                <label className="w-32">Price<div className="relative"><span className="absolute left-3 top-3 text-sm text-slate-400">₹</span><input className="pl-7" required type="number" min="0" value={newRate.price} onChange={e => setNewRate({ ...newRate, price: e.target.value })} /></div></label>
                <button className="button-outline" type="submit"><Plus size={15} /> Add rate</button>
              </form>
              <p className="mt-3 text-xs text-slate-400">Core rates power live bookings and can be edited but not deleted. Rates you add can be deleted anytime.</p>
              <button className="button-primary mt-4 w-full" onClick={savePricing}>{saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save pricing</>}</button>
            </section>
          )}

          <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6">
            <div><p className="eyebrow">Coupon manager</p><h2 className="mt-2 font-serif text-2xl">Create an offer</h2></div>
            <form onSubmit={createCoupon} className="mt-6 grid gap-4 sm:grid-cols-3">
              <label>Code<input required placeholder="MONSOON30" value={coupon.code} onChange={e => setCoupon({ ...coupon, code: e.target.value })} /></label>
              <label>Discount<input required type="number" min="1" value={coupon.value} onChange={e => setCoupon({ ...coupon, value: e.target.value })} /></label>
              <label>Type<select value={coupon.type} onChange={e => setCoupon({ ...coupon, type: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
              <button className="button-outline sm:col-span-3" type="submit"><Percent size={16} /> Create coupon</button>
            </form>
            <div className="mt-6 space-y-2">
              {coupons.length ? coupons.map(item => (
                <div className="flex items-center justify-between rounded-xl bg-[#f3f5ef] px-4 py-3 text-sm" key={item.id}>
                  <strong>{item.code}</strong>
                  <div className="flex items-center gap-2">
                    <span>{item.value}{item.type === 'percentage' ? '%' : '₹'} off · {item.active ? 'Active' : 'Paused'}</span>
                    {canDelete && (
                      <button onClick={() => deleteCoupon(item.id)} title="Delete coupon" className="rounded-full p-2 text-red-500 hover:bg-red-100"><Trash2 size={15} /></button>
                    )}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-400">No coupons created yet.</p>}
            </div>
          </section>
        </div>}

        {canManagePricing && tab === 'sales' && (
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef2eb] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-amber-600 fill-amber-500" />
                  <p className="eyebrow text-amber-800">Promotions & Campaigns</p>
                </div>
                <h2 className="mt-1 font-serif text-2xl">Scheduled Flash Sales & Seasonal Deals</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Launch time-bound promotional sales with live countdown clocks and automatic discounted rates on the customer website.
                </p>
              </div>

              <div>
                {(() => {
                  if (!flashSale.enabled) {
                    return <span className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-600 border border-slate-200">🔴 Inactive / Disabled</span>
                  }
                  const now = new Date()
                  const start = flashSale.startDateTime ? new Date(flashSale.startDateTime) : null
                  const end = flashSale.endDateTime ? new Date(flashSale.endDateTime) : null
                  if (start && now < start) {
                    return <span className="rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 border border-amber-200">🟡 Scheduled (Starts {start.toLocaleDateString('en-IN')} {start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})</span>
                  }
                  if (end && now > end) {
                    return <span className="rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 border border-red-200">⚪ Expired (Ended {end.toLocaleDateString('en-IN')})</span>
                  }
                  return <span className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 animate-pulse">🟢 LIVE NOW ON WEBSITE</span>
                })()}
              </div>
            </div>

            <form onSubmit={saveFlashSale} className="mt-6 space-y-6">
              <div className="flex items-center justify-between rounded-xl bg-[#f4f7f2] p-4 border border-[#dfe7dc]">
                <div>
                  <label htmlFor="sale-toggle" className="text-sm font-bold text-[#173d35] cursor-pointer">
                    Enable Flash Sale Campaign
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When active and within the date range, the promotional announcement bar &amp; countdown clock appear across the customer website.
                  </p>
                </div>
                <input
                  id="sale-toggle"
                  type="checkbox"
                  checked={Boolean(flashSale.enabled)}
                  onChange={e => setFlashSale({ ...flashSale, enabled: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-[#173d35] focus:ring-[#315d4c] cursor-pointer"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold text-slate-700">
                  Campaign Title *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Monsoon Weekend Flash Sale"
                    value={flashSale.name || ''}
                    onChange={e => setFlashSale({ ...flashSale, name: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Banner Badge Text
                  <input
                    type="text"
                    placeholder="e.g. ⚡ FLASH SALE 25% OFF"
                    value={flashSale.badgeText || ''}
                    onChange={e => setFlashSale({ ...flashSale, badgeText: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Discount Type
                  <select
                    value={flashSale.discountType || 'percentage'}
                    onChange={e => setFlashSale({ ...flashSale, discountType: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Amount Discount (₹)</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Discount Value ({flashSale.discountType === 'fixed' ? '₹' : '%'}) *
                  <input
                    type="number"
                    min="1"
                    max={flashSale.discountType === 'percentage' ? '100' : '100000'}
                    required
                    placeholder={flashSale.discountType === 'percentage' ? '20' : '2000'}
                    value={flashSale.discountValue ?? ''}
                    onChange={e => setFlashSale({ ...flashSale, discountValue: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Start Date &amp; Time (IST)
                  <input
                    type="datetime-local"
                    value={flashSale.startDateTime || ''}
                    onChange={e => setFlashSale({ ...flashSale, startDateTime: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  End Date &amp; Time (IST)
                  <input
                    type="datetime-local"
                    value={flashSale.endDateTime || ''}
                    onChange={e => setFlashSale({ ...flashSale, endDateTime: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Banner Announcement Message
                  <textarea
                    rows={2}
                    placeholder="e.g. Special limited-time monsoon discount! Book today and get 25% off all stays with complimentary pool access."
                    value={flashSale.bannerMessage || ''}
                    onChange={e => setFlashSale({ ...flashSale, bannerMessage: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>
              </div>

              {/* Campaign Poster / Promotional Image (Responsive) */}
              <div className="rounded-xl border border-[#dfe7dc] bg-[#f9faf6] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#173d35]">
                      Campaign Poster / Banner Image (Responsive)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload an eye-catching promotional image or paste an image URL to feature in the interactive motion carousel on the customer website.
                    </p>
                  </div>
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) uploadBannerImage(f)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={bannerUploading}
                    className="button-outline text-xs px-3.5 py-1.5 flex items-center gap-1.5 shrink-0"
                  >
                    {bannerUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {bannerUploading ? 'Uploading…' : 'Upload Poster File'}
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    type="url"
                    placeholder="Or paste image URL (e.g. https://... or /images/...)"
                    value={flashSale.imageUrl || ''}
                    onChange={e => setFlashSale({ ...flashSale, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-2 text-xs text-[#173d35]"
                  />
                  {flashSale.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFlashSale({ ...flashSale, imageUrl: '' })}
                      className="text-xs text-red-600 hover:underline px-2"
                    >
                      Remove Poster
                    </button>
                  )}
                </div>

                {flashSale.imageUrl && (
                  <div className="mt-3 flex items-center gap-4 rounded-xl border border-[#e5ebe1] bg-white p-3">
                    <img
                      src={flashSale.imageUrl}
                      alt="Campaign Banner Preview"
                      className="h-20 w-32 rounded-lg object-cover border border-slate-200"
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-emerald-800">✓ Poster Loaded &amp; Active</p>
                      <p className="text-slate-500 text-[11px] truncate max-w-sm mt-0.5">{flashSale.imageUrl}</p>
                      <span className="inline-block mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Responsive on Mobile &amp; Desktop
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">
                  Applicable Stays &amp; Services
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['all', 'All Stays & Services'],
                    ['Master Bedroom', 'Master Bedroom'],
                    ['2 BHK Villa', '2 BHK Villa'],
                    ['4 BHK Villa', '4 BHK Villa'],
                    ['One Day Tour', 'One Day Tour'],
                    ['Mini Water Park', 'Mini Water Park'],
                    ['Wedding Ceremony', 'Wedding / Events'],
                  ].map(([val, name]) => {
                    const isSelected = flashSale.applicableServices === 'all'
                      ? val === 'all'
                      : (Array.isArray(flashSale.applicableServices) && flashSale.applicableServices.includes(val))
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          if (val === 'all') {
                            setFlashSale({ ...flashSale, applicableServices: 'all' })
                          } else {
                            let curr = Array.isArray(flashSale.applicableServices) ? [...flashSale.applicableServices] : []
                            if (curr.includes(val)) {
                              curr = curr.filter(x => x !== val)
                              if (!curr.length) curr = 'all'
                            } else {
                              curr.push(val)
                            }
                            setFlashSale({ ...flashSale, applicableServices: curr })
                          }
                        }}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition border ${
                          isSelected
                            ? 'bg-[#173d35] text-white border-[#173d35] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-[#edf1e8]'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#eef2eb]">
                <p className="text-xs text-slate-400">
                  🛡️ Saving changes dispatches an instant security audit email with before/after diff to all super admins &amp; owners.
                </p>
                <button
                  type="submit"
                  disabled={savingSale}
                  className="button-primary flex items-center gap-2"
                >
                  {savingSale ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {savingSale ? 'Saving Campaign…' : 'Save Flash Sale'}
                </button>
              </div>
            </form>
          </section>
        )}

        {canManagePricing && tab === 'advance' && (
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Deposit & Partial Payments</p>
                <h2 className="mt-2 font-serif text-2xl">Advance Payment Codes</h2>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Single-Use (1x) Auto-Delete</span>
            </div>
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 leading-relaxed">
              <strong>💡 Strict Guideline:</strong> These are <strong>Advance Deposit Tokens</strong> (NOT discount coupons). They split the customer's total stay bill into a deposit today + pending balance due upon arrival. As soon as a customer completes a booking with a code, it is <strong>automatically deleted</strong> from this window so it cannot be reused.
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
              <form onSubmit={createAdvanceCode} className="rounded-xl border border-[#dfe7dc] bg-[#f9faf6] p-5 space-y-4">
                <h3 className="font-semibold text-sm text-[#173d35]">Generate 1-Time Advance Code</h3>
                <label className="block">Code Name
                  <input
                    required
                    placeholder="ADVANCE50"
                    value={advanceForm.code}
                    onChange={e => setAdvanceForm({ ...advanceForm, code: e.target.value.toUpperCase() })}
                    className="mt-1 w-full uppercase font-mono tracking-wider"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">Deposit Percentage (%)
                    <input
                      type="number"
                      min="1"
                      max="99"
                      placeholder="50"
                      value={advanceForm.percentage}
                      onChange={e => setAdvanceForm({ ...advanceForm, percentage: e.target.value, fixedAmount: '' })}
                      className="mt-1 w-full"
                    />
                  </label>
                  <label className="block">OR Fixed Deposit (₹)
                    <input
                      type="number"
                      min="1"
                      placeholder="Optional"
                      value={advanceForm.fixedAmount}
                      onChange={e => setAdvanceForm({ ...advanceForm, fixedAmount: e.target.value, percentage: '' })}
                      className="mt-1 w-full"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">Default is 50% advance deposit. The guest pays 50% online and owes the remaining 50% at check-in.</p>
                <button className="button-primary w-full" type="submit">
                  <Plus size={16} /> Create Single-Use Advance Code
                </button>
              </form>

              <div>
                <h3 className="font-semibold text-sm text-[#173d35] mb-3">Active Advance Codes ({advanceCodes.length})</h3>
                <div className="space-y-2">
                  {advanceCodes.length ? advanceCodes.map(item => (
                    <div className="flex items-center justify-between rounded-xl border border-[#e5ebe1] bg-white px-4 py-3 text-sm shadow-sm" key={item.id}>
                      <div>
                        <strong className="font-mono text-base text-[#173d35]">{item.code}</strong>
                        <span className="ml-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 font-medium">
                          {item.percentage ? `${item.percentage}% Deposit` : `₹${item.fixedAmount} Deposit`}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">Single-use · Auto-deletes on booking</p>
                      </div>
                      <button
                        onClick={() => deleteAdvanceCode(item.id)}
                        title="Delete code"
                        className="rounded-full p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-[#cfdacc] p-8 text-center text-sm text-slate-400">
                      No active advance codes. Create one on the left to share with a customer.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {canManagePricing && tab === 'payments' && (
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow">UPI fallback</p><h2 className="mt-2 font-serif text-2xl">Direct UPI payments</h2></div>
              <QrCode size={19} className="text-[#709079]" />
            </div>
            <p className="mt-2 text-sm text-slate-500">Shown to guests as a backup when Razorpay doesn't work. Leave both fields empty to hide the option. Guests who pay this way appear as "UPI claimed" in the booking desk — verify in your UPI app, then Mark paid.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label>UPI ID<input placeholder="siddhifarm@ybl" value={payments.upiId} onChange={e => setPayments({ ...payments, upiId: e.target.value })} /></label>
              <label>Payee name<input placeholder="Siddhi Farm Resort" value={payments.upiName} onChange={e => setPayments({ ...payments, upiName: e.target.value })} /></label>
              <button className="button-primary" onClick={savePayments}>{paySaved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save</>}</button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {payments.qrUrl ? (
                <img src={payments.qrUrl} alt="UPI QR code" className="h-32 w-32 rounded-xl border border-[#e5ebe1] bg-white object-contain p-2" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-[#c6d2c3] text-[#709079]"><QrCode size={28} /></div>
              )}
              <div className="space-y-2">
                <button className="button-outline" onClick={() => qrInputRef.current?.click()} disabled={qrUploading}>
                  {qrUploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Upload size={15} /> {payments.qrUrl ? 'Replace QR code' : 'Upload QR code'}</>}
                </button>
                {payments.qrUrl && <button className="block text-xs text-red-500 hover:underline" onClick={() => { setPayments({ ...payments, qrUrl: '' }); fetch('/api/payments/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payments, qrUrl: '' }) }).then(loadAll) }}>Remove QR code</button>}
                <p className="text-xs text-slate-400">Export the QR from your UPI app (GPay / PhonePe / Paytm business).</p>
              </div>
              <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadQr(f); e.target.value = '' }} />
            </div>
          </section>
        )}

        {canManagePricing && tab === 'content' && (
          <>
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow">Image manager</p><h2 className="mt-2 font-serif text-2xl">Every photo, your pick</h2></div>
              <ImageIcon size={19} className="text-[#709079]" />
            </div>
            <p className="mt-2 text-sm text-slate-500">Upload a new photo, or paste an image URL and press Enter. Reset returns a slot to its built-in photo.</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && pendingImageKey) uploadImage(pendingImageKey, f); e.target.value = '' }} />
            {IMAGE_SECTIONS.map(section => (
              <div key={section.title} className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">{section.title}</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {section.slots.map(slot => {
                    const override = images[slot.key]
                    return (
                      <div key={slot.key} className="flex items-center gap-3 rounded-xl border border-[#e5ebe1] bg-[#fbfcf9] p-3">
                        <img src={override || slot.def} alt={slot.label} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {slot.label}
                            {override && <span className="ml-2 rounded-full bg-[#e3eee1] px-2 py-0.5 text-[10px] text-[#315d4c]">Custom</span>}
                          </p>
                          <input
                            key={`${slot.key}:${override || ''}`}
                            className="mt-1 w-full py-1.5 text-xs"
                            placeholder="Paste image URL + Enter"
                            defaultValue={override || ''}
                            onKeyDown={e => { if (e.key === 'Enter') setImageUrl(slot.key, e.target.value.trim()) }}
                          />
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button title="Upload image" onClick={() => pickImageFile(slot.key)} className="rounded-full p-2 text-[#315d4c] hover:bg-[#e3eee1]">
                            {uploadingKey === slot.key ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          </button>
                          {override && (
                            <button title="Reset to default" onClick={() => setImageUrl(slot.key, '')} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><RotateCcw size={15} /></button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow">Booking terms</p><h2 className="mt-2 font-serif text-2xl">Terms shown and emailed to guests</h2></div>
              <ScrollText size={19} className="text-[#709079]" />
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Use one line per condition. A booking stores the exact version and terms accepted, then emails that same copy to the customer.</p>
            <div className="mt-6 max-w-4xl space-y-5">
              <label className="block max-w-sm">Terms version<input className="mt-2 w-full" value={bookingTerms.version} placeholder="2026-08-16" onChange={event => setBookingTerms({ ...bookingTerms, version: event.target.value })} /></label>
              <label className="block">Terms and conditions<span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">One condition per line</span><textarea rows="12" className="mt-2 min-h-72 w-full resize-y rounded-xl border border-[#cfdacc] bg-[#fbfcf9] px-4 py-3 leading-6 text-[#173d35] outline-none transition focus:border-[#315d4c] focus:ring-2 focus:ring-[#dce9d9]" value={termsText} placeholder="One condition per line" onChange={event => setTermsText(event.target.value)} /></label>
            </div>
            <div className="mt-6 flex max-w-4xl justify-end"><button className="button-primary" onClick={saveBookingTerms}>{termsSaved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save booking terms</>}</button></div>
          </section>
          </>
        )}

        {tab === 'bookings' && <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6">
          <p className="eyebrow">Booking desk</p>
          <h2 className="mt-2 font-serif text-2xl">Recent requests</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
                <tr><th className="pb-3">Guest</th><th className="pb-3">Stay</th><th className="pb-3">Dates</th><th className="pb-3">Times</th><th className="pb-3">Total</th><th className="pb-3">Paid</th><th className="pb-3">Status</th>{canDelete && <th className="pb-3"><span className="sr-only">Delete</span></th>}</tr>
              </thead>
              <tbody>
                {bookings.map(item => (
                  <tr className="border-b border-[#eef2eb]" key={item.id}>
                    <td className="py-4"><strong>{item.name}</strong><br /><span className="text-xs text-slate-400">{item.phone}</span></td>
                    <td className="py-4">{item.service}</td>
                    <td className="py-4">
                      <span className="block text-xs text-slate-600">In {displayBookingTime(item.check_in_time, '11:00')} · Out {displayBookingTime(item.check_out_time, '10:00')}</span>
                      <button onClick={() => setTimeEditor({ id: item.id, name: item.name, checkInTime: item.check_in_time?.slice(0, 5) || '11:00', checkOutTime: item.check_out_time?.slice(0, 5) || '10:00' })} className="mt-1 flex items-center gap-1 text-[10px] text-[#315d4c] hover:underline"><Clock3 size={12} /> Set times</button>
                    </td>
                    <td className="py-4 text-xs text-slate-500">{item.check_in} → {item.check_out}</td>
                    <td className="py-4 font-semibold text-xs">
                      ₹{Number(item.total_amount || (Number(item.amount || 0) + Number(item.pending_amount || 0))).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4">
                      {item.pending_amount > 0 ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                            Adv. ₹{Number(item.paid_amount || (item.paid ? item.amount : 0)).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700">
                            ₹{Number(item.pending_amount).toLocaleString('en-IN')} Pending
                          </span>
                          <button
                            onClick={() => markBalancePaid(item)}
                            className="mt-0.5 rounded-full border border-green-600 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-800 hover:bg-green-100"
                          >
                            Clear balance
                          </button>
                        </div>
                      ) : item.paid ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Paid in full ✓</span>
                      ) : (
                        <span className="flex flex-col items-start gap-1">
                          {(item.notes || '').includes('UPI claim') && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-700" title={item.notes}>UPI claimed</span>}
                          <button onClick={() => markPaid(item)} className="rounded-full border border-[#b7c7b8] px-2 py-1 text-[10px] text-[#315d4c] hover:bg-[#e3eee1]">Mark paid</button>
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <select className="m-0 w-auto py-1.5 text-xs font-medium" value={item.status} onChange={e => updateBooking(item.id, e.target.value)}>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="completed">Completed</option>
                        </select>
                        <a
                          href={getWhatsAppShareUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Send Booking Invoice & Terms via WhatsApp"
                          className="flex items-center justify-center rounded-lg bg-[#25D366]/10 p-2 text-[#25D366] hover:bg-[#25D366] hover:text-white"
                        >
                          <Share2 size={14} />
                        </a>
                        <a
                          href={`/invoice/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View / Print PDF Tax Invoice"
                          className="flex items-center justify-center rounded-lg bg-[#173d35]/10 p-2 text-[#173d35] hover:bg-[#173d35] hover:text-white"
                        >
                          <FileText size={14} />
                        </a>
                      </div>
                    </td>
                    {canDelete && (
                      <td className="py-4">
                        <button onClick={() => deleteBooking(item.id)} title="Delete booking" className="rounded-full p-2 text-red-500 hover:bg-red-100"><Trash2 size={15} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!bookings.length && <p className="py-8 text-center text-sm text-slate-400">New booking requests will appear here.</p>}
          </div>
        </section>}

        {tab === 'short_stays' && (
          <div className="mt-8 space-y-8">
            {/* Short Stay Room Pricing Manager */}
            {canManagePricing && (
              <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="eyebrow text-[#315d4c]">Hourly & Day-Use Pricing</p>
                    <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Short Stay Room Rates</h2>
                    <p className="mt-1 text-xs text-slate-500 max-w-2xl">
                      Configure custom rates for guests booking same-day day-use stays (e.g. 2–5 hours). These rates apply automatically when guests select the Day Use / Short Stay duration.
                    </p>
                  </div>
                  <button className="button-primary" onClick={savePricing}>
                    {saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save Short Stay Rates</>}
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#dfe7dc] bg-[#fbfcf9] p-4">
                    <label className="text-xs font-semibold text-[#173d35] block">
                      Master Bedroom (Short Stay)
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-3 text-sm text-slate-400">₹</span>
                        <input
                          className="pl-7 w-full bg-white"
                          type="number"
                          min="0"
                          placeholder="2500"
                          value={pricing.masterBedroomShortStay ?? ''}
                          onChange={e => setPricing({ ...pricing, masterBedroomShortStay: Number(e.target.value) })}
                        />
                      </div>
                    </label>
                    <p className="mt-2 text-[11px] text-slate-400">Overnight: ₹{(pricing.masterBedroom || 4500).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="rounded-xl border border-[#dfe7dc] bg-[#fbfcf9] p-4">
                    <label className="text-xs font-semibold text-[#173d35] block">
                      2 BHK Villa (Short Stay)
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-3 text-sm text-slate-400">₹</span>
                        <input
                          className="pl-7 w-full bg-white"
                          type="number"
                          min="0"
                          placeholder="5000"
                          value={pricing.villa2BHKShortStay ?? ''}
                          onChange={e => setPricing({ ...pricing, villa2BHKShortStay: Number(e.target.value) })}
                        />
                      </div>
                    </label>
                    <p className="mt-2 text-[11px] text-slate-400">Overnight: ₹{(pricing.villa2BHK || 9000).toLocaleString('en-IN')}</p>
                  </div>

                  <div className="rounded-xl border border-[#dfe7dc] bg-[#fbfcf9] p-4">
                    <label className="text-xs font-semibold text-[#173d35] block">
                      4 BHK Villa (Short Stay)
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-3 text-sm text-slate-400">₹</span>
                        <input
                          className="pl-7 w-full bg-white"
                          type="number"
                          min="0"
                          placeholder="8000"
                          value={pricing.villa4BHKShortStay ?? ''}
                          onChange={e => setPricing({ ...pricing, villa4BHKShortStay: Number(e.target.value) })}
                        />
                      </div>
                    </label>
                    <p className="mt-2 text-[11px] text-slate-400">Overnight: ₹{(pricing.villa4BHK || 15000).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Short Stay Bookings Table */}
            <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="eyebrow text-[#315d4c]">Day-Use Reservations</p>
                  <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Short Stay Guests</h2>
                  <p className="mt-1 text-xs text-slate-500">Live feed of all flexible hourly and day-use reservations with exact guest arrival & departure hours.</p>
                </div>
                <div className="rounded-xl bg-[#eef4ec] px-4 py-2 text-xs font-semibold text-[#315d4c]">
                  {bookings.filter(b => b.stay_type === 'short_stay' || (b.check_in === b.check_out && !['One Day Tour', 'Mini Water Park', 'Wedding Ceremony', 'Engagement Ceremony', 'Birthday Party', 'Get Together'].includes(b.service))).length} Short Stay Bookings
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="pb-3">Guest & Aadhaar</th>
                      <th className="pb-3">Room / Stay</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Slot Timings</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Payment</th>
                      <th className="pb-3">Actions</th>
                      {canDelete && <th className="pb-3"><span className="sr-only">Delete</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings
                      .filter(b => b.stay_type === 'short_stay' || (b.check_in === b.check_out && !['One Day Tour', 'Mini Water Park', 'Wedding Ceremony', 'Engagement Ceremony', 'Birthday Party', 'Get Together'].includes(b.service)))
                      .map(item => (
                        <tr className="border-b border-[#eef2eb]" key={item.id}>
                          <td className="py-4">
                            <strong>{item.name}</strong>
                            <br />
                            <span className="text-xs text-slate-400">{item.phone}</span>
                            {item.aadhaar_number && (
                              <span className="mt-0.5 block text-[11px] font-mono text-slate-500">ID: {item.aadhaar_number}</span>
                            )}
                          </td>
                          <td className="py-4">
                            <span className="font-medium text-[#173d35]">{item.service}</span>
                            <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Short Stay</span>
                          </td>
                          <td className="py-4 text-xs text-slate-600">{item.check_in}</td>
                          <td className="py-4">
                            <span className="block text-xs font-semibold text-[#173d35]">
                              {displayBookingTime(item.check_in_time, '11:00')} → {displayBookingTime(item.check_out_time, '15:00')}
                            </span>
                            <button
                              onClick={() => setTimeEditor({ id: item.id, name: item.name, checkInTime: item.check_in_time?.slice(0, 5) || '11:00', checkOutTime: item.check_out_time?.slice(0, 5) || '15:00' })}
                              className="mt-1 flex items-center gap-1 text-[10px] text-[#315d4c] hover:underline font-medium"
                            >
                              <Clock3 size={12} /> Adjust Slot
                            </button>
                          </td>
                          <td className="py-4 font-semibold text-xs text-[#173d35]">
                            ₹{Number(item.total_amount || item.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-4">
                            {item.pending_amount > 0 ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                                  Adv. ₹{Number(item.paid_amount || (item.paid ? item.amount : 0)).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] font-bold text-amber-700">
                                  ₹{Number(item.pending_amount).toLocaleString('en-IN')} Due
                                </span>
                              </div>
                            ) : item.paid ? (
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Paid in full ✓</span>
                            ) : (
                              <button onClick={() => markPaid(item)} className="rounded-full border border-[#b7c7b8] px-2.5 py-1 text-[10px] font-medium text-[#315d4c] hover:bg-[#e3eee1]">
                                Mark paid
                              </button>
                            )}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <select className="m-0 w-auto py-1.5 text-xs font-medium bg-white" value={item.status} onChange={e => updateBooking(item.id, e.target.value)}>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="completed">Completed</option>
                              </select>
                              <a
                                href={getWhatsAppShareUrl(item)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Send WhatsApp Receipt"
                                className="flex items-center justify-center rounded-lg bg-[#25D366]/10 p-2 text-[#25D366] hover:bg-[#25D366] hover:text-white"
                              >
                                <Share2 size={14} />
                              </a>
                              <a
                                href={`/invoice/${item.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View PDF Tax Invoice"
                                className="flex items-center justify-center rounded-lg bg-[#173d35]/10 p-2 text-[#173d35] hover:bg-[#173d35] hover:text-white"
                              >
                                <FileText size={14} />
                              </a>
                            </div>
                          </td>
                          {canDelete && (
                            <td className="py-4">
                              <button onClick={() => deleteBooking(item.id)} title="Delete booking" className="rounded-full p-2 text-red-500 hover:bg-red-100">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!bookings.filter(b => b.stay_type === 'short_stay' || (b.check_in === b.check_out && !['One Day Tour', 'Mini Water Park', 'Wedding Ceremony', 'Engagement Ceremony', 'Birthday Party', 'Get Together'].includes(b.service))).length && (
                  <p className="py-10 text-center text-sm text-slate-400">No short-stay bookings yet. When customers book day-use slots, they will appear here.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {timeEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="booking-times-title">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Booking schedule</p><h2 id="booking-times-title" className="mt-2 font-serif text-2xl">Set stay times</h2><p className="mt-1 text-sm text-slate-500">{timeEditor.name} · {timeEditor.id}</p></div><button onClick={() => setTimeEditor(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label>Check-in time<input type="time" value={timeEditor.checkInTime} onChange={e => setTimeEditor({ ...timeEditor, checkInTime: e.target.value })} /></label>
                <label>Check-out time<input type="time" value={timeEditor.checkOutTime} onChange={e => setTimeEditor({ ...timeEditor, checkOutTime: e.target.value })} /></label>
              </div>
              <p className="mt-3 text-xs text-slate-500">Standard timings are 11:00 AM check-in and 10:00 AM check-out. The saved times appear on the customer invoice.</p>
              <div className="mt-6 flex justify-end gap-3"><button className="button-outline" onClick={() => setTimeEditor(null)}>Cancel</button><button className="button-primary" onClick={saveBookingTimes} disabled={savingTimes}>{savingTimes ? 'Saving…' : <><Save size={15} /> Save times</>}</button></div>
            </div>
          </div>
        )}

        {authModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/50 p-4 backdrop-blur-xs" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-3xl border border-[#dfe7dc] bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="eyebrow text-amber-800">Super Admin Security</p>
                    <h2 className="font-serif text-xl text-[#173d35]">Authorize Admin Account</h2>
                  </div>
                </div>
                <button
                  onClick={() => setAuthModal(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-[#f5f8f3] border border-[#dfe7dc] p-4 text-xs text-slate-700 space-y-1.5">
                <p className="font-bold text-[#173d35]">Provisioning Summary:</p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <strong className="text-slate-800">{authModal.target?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <strong className="text-slate-800 font-mono">{authModal.target?.email}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Role:</span>
                  <span className="rounded-md bg-[#173d35] px-2 py-0.5 text-[11px] font-bold text-white uppercase">{authModal.target?.role}</span>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-600">
                Enter the 6-digit authorization code sent to your Super Admin email &amp; mobile:
              </p>
              <div className="mt-2 space-y-1 text-xs text-[#173d35] bg-[#edf2ea] p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 font-medium">
                  <Mail size={13} className="text-[#315d4c]" />
                  <span>Email: <strong className="font-mono">{authModal.maskedEmail}</strong></span>
                </div>
                {authModal.maskedPhone && (
                  <div className="flex items-center gap-1.5 font-medium">
                    <Smartphone size={13} className="text-[#315d4c]" />
                    <span>Mobile: <strong className="font-mono">{authModal.maskedPhone}</strong></span>
                  </div>
                )}
              </div>

              <form onSubmit={confirmCreateAdminUser} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    6-Digit Authorization Code
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      pattern="[0-9]{6}"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="• • • • • •"
                      value={authModal.otp}
                      onChange={e => setAuthModal({ ...authModal, otp: e.target.value.replace(/\D/g, '') })}
                      className="mt-1.5 w-full text-center font-mono text-2xl font-bold tracking-[10px] text-[#173d35] rounded-xl border-2 border-[#173d35]/30 py-2.5 focus:border-[#173d35] focus:bg-white"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={resendSuperAdminOtp}
                    disabled={authModal.resendCooldown > 0}
                    className="flex items-center gap-1 font-medium text-[#173d35] hover:underline disabled:opacity-40"
                  >
                    <RefreshCw size={12} />
                    {authModal.resendCooldown > 0 ? `Resend code (${authModal.resendCooldown}s)` : 'Resend code'}
                  </button>
                  <span className="text-[11px] text-slate-400">Expires in 10 mins</span>
                </div>

                <div className="mt-6 flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    className="button-outline"
                    onClick={() => setAuthModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button-primary flex items-center gap-2"
                    disabled={authModal.loading || authModal.otp.length !== 6}
                  >
                    {authModal.loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {authModal.loading ? 'Authorizing…' : 'Authorize & Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {canManageRoles && tab === 'customers' && (
          <div className="space-y-8">
            {/* Create New Team Member Form */}
            <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2"><Plus size={18} className="text-[#173d35]" /><p className="eyebrow">User Management</p></div>
              <h2 className="mt-2 font-serif text-2xl">Add Staff or Manager</h2>
              <p className="mt-1 text-sm text-slate-500">Provision authenticated accounts for resort staff or managers. The primary Super Admin account is exclusive.</p>

              <form onSubmit={initiateCreateAdminUser} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <label className="text-xs font-semibold text-slate-700">
                  Full Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newAdmin.name}
                    onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Email Address *
                  <input
                    type="email"
                    required
                    placeholder="staff@siddhifarm.com"
                    value={newAdmin.email}
                    onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Password (10+ chars, 1 uppercase, 1 digit, 1 special) *
                  <input
                    type="password"
                    required
                    minLength={10}
                    placeholder="e.g. Secret@2026!"
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  />
                </label>

                <label className="text-xs font-semibold text-slate-700">
                  Role *
                  <select
                    value={newAdmin.role}
                    onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
                  >
                    <option value="staff">Staff (Bookings & Check-ins)</option>
                    <option value="manager">Manager (Pricing, Content & Coupons)</option>
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="flex h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#173d35] px-4 font-semibold text-white shadow hover:bg-[#1f4e44] disabled:opacity-50"
                  >
                    {creatingAdmin ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {creatingAdmin ? 'Sending Authorization Code…' : 'Add Team Member'}
                  </button>
                </div>
              </form>
            </section>

            {/* Team and User Management Table */}
            <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><Users size={18} className="text-[#173d35]" /><p className="eyebrow">Team & Customers</p></div>
                  <h2 className="mt-2 font-serif text-2xl">Registered Users & Roles</h2>
                  <p className="mt-1 text-sm text-slate-500">Manage permissions, promote team members, or delete accounts.</p>
                </div>
                <span className="rounded-full bg-[#eef4ec] px-3 py-1 text-xs font-medium text-[#173d35]">
                  {customers.length} total users
                </span>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="pb-3">User</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Phone</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(user => {
                      const isRoot = user.id === rootAdminId
                      const isSuperAdmin = user.role === 'super_admin'
                      return (
                        <tr className="border-b border-[#eef2eb] transition-colors hover:bg-[#fbfcfb]" key={user.id}>
                          <td className="py-3 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#173d35]/10 text-xs font-bold text-[#173d35]">
                                {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span>{user.full_name || '—'}</span>
                            </div>
                          </td>
                          <td className="py-3 text-slate-600">{user.email}</td>
                          <td className="py-3 text-slate-500">{user.phone || '—'}</td>
                          <td className="py-3">
                            {isSuperAdmin ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#173d35] bg-[#eef4ec] px-2.5 py-1 rounded-lg">
                                <ShieldCheck size={13} className="text-[#315d4c]" /> Super Admin (Owner)
                              </span>
                            ) : (
                              <select
                                className="m-0 w-auto rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-slate-800"
                                value={user.role}
                                onChange={e => changeRole(user.id, e.target.value)}
                              >
                                <option value="customer">Customer</option>
                                <option value="staff">Staff</option>
                                <option value="manager">Manager</option>
                              </select>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {isRoot || isSuperAdmin ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md" title="The super admin account cannot be modified">
                                <ShieldCheck size={13} /> Primary Owner
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                {user.role !== 'customer' && (
                                  <button
                                    onClick={() => removeRole(user.id)}
                                    title="Demote back to regular customer"
                                    className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                                  >
                                    Demote
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteUserAccount(user.id, user.full_name || user.email)}
                                  title="Permanently delete user account"
                                  className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 hover:text-red-700"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        <footer className="mt-14 border-t border-[#dfe7dc] pt-6 pb-6 text-center text-xs text-slate-500">
          <div className="flex flex-col items-center justify-center gap-1.5">
            <span>Siddhi Farm Resort Operations Desk</span>
            <span className="text-[11.5px] text-slate-500 font-medium">Developed &amp; Maintained by <span className="font-semibold text-[#173d35]">Rushikesh Nigade</span></span>
          </div>
        </footer>
      </div>
    </main>
  )
}
