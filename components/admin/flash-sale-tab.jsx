/**
 * ============================================================================
 * FLASH SALE TAB COMPONENT — Scheduled Promotions & Campaign Manager
 * ============================================================================
 *
 * @fileoverview  Administer time-limited promotional flash sales, countdown
 *                timers, discount percentage/fixed values, and promotional
 *                poster artwork for customer banners.
 *
 * @module        components/admin/flash-sale-tab
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React, { useRef } from 'react'
import { Zap, Upload, Loader2, Save } from 'lucide-react'

const SERVICE_OPTIONS = [
  ['all', 'All Stays & Services'],
  ['Master Bedroom', 'Master Bedroom'],
  ['2 BHK Villa', '2 BHK Villa'],
  ['4 BHK Villa', '4 BHK Villa'],
  ['One Day Tour', 'One Day Tour'],
  ['Mini Water Park', 'Mini Water Park'],
  ['Wedding Ceremony', 'Wedding / Events'],
]

/**
 * FlashSaleTab Component
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.flashSale         - Flash sale configuration object.
 * @param {Function} props.setFlashSale      - State setter for flash sale config.
 * @param {boolean}  props.savingSale        - Loading indicator during persistence.
 * @param {boolean}  props.bannerUploading   - Loading indicator during poster upload.
 * @param {Function} props.onUploadBanner    - Callback to upload poster image file.
 * @param {Function} props.onSaveSale        - Callback to persist flash sale configuration.
 * @returns {JSX.Element}
 */
export default function FlashSaleTab({
  flashSale = {},
  setFlashSale,
  savingSale = false,
  bannerUploading = false,
  onUploadBanner,
  onSaveSale,
}) {
  console.log('[UI:FlashSaleTab:RENDER] Rendering promotional flash sale manager')

  const fileInputRef = useRef(null)

  // Compute status pill display
  const getStatusBadge = () => {
    if (!flashSale.enabled) {
      return (
        <span className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-600 border border-slate-200">
          🔴 Inactive / Disabled
        </span>
      )
    }
    const now = new Date()
    const start = flashSale.startDateTime ? new Date(flashSale.startDateTime) : null
    const end = flashSale.endDateTime ? new Date(flashSale.endDateTime) : null

    if (start && now < start) {
      return (
        <span className="rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 border border-amber-200">
          🟡 Scheduled (Starts {start.toLocaleDateString('en-IN')} at{' '}
          {start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
        </span>
      )
    }
    if (end && now > end) {
      return (
        <span className="rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 border border-red-200">
          ⚪ Expired (Ended {end.toLocaleDateString('en-IN')})
        </span>
      )
    }
    return (
      <span className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 animate-pulse">
        🟢 LIVE NOW ON WEBSITE
      </span>
    )
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef2eb] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-amber-600 fill-amber-500" />
            <p className="eyebrow text-amber-800">Promotions &amp; Campaigns</p>
          </div>
          <h2 className="mt-1 font-serif text-2xl text-[#173d35]">
            Scheduled Flash Sales &amp; Seasonal Deals
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Launch time-bound promotional sales with live countdown clocks and automatic discounted rates on the customer website.
          </p>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      <form onSubmit={onSaveSale} className="mt-6 space-y-6">
        {/* Enable Toggle Card */}
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
            onChange={(e) => setFlashSale({ ...flashSale, enabled: e.target.checked })}
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
              onChange={(e) => setFlashSale({ ...flashSale, name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Banner Badge Text
            <input
              type="text"
              placeholder="e.g. ⚡ FLASH SALE 25% OFF"
              value={flashSale.badgeText || ''}
              onChange={(e) => setFlashSale({ ...flashSale, badgeText: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Discount Type
            <select
              value={flashSale.discountType || 'percentage'}
              onChange={(e) => setFlashSale({ ...flashSale, discountType: e.target.value })}
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
              onChange={(e) => setFlashSale({ ...flashSale, discountValue: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Start Date &amp; Time (IST)
            <input
              type="datetime-local"
              value={flashSale.startDateTime || ''}
              onChange={(e) => setFlashSale({ ...flashSale, startDateTime: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            End Date &amp; Time (IST)
            <input
              type="datetime-local"
              value={flashSale.endDateTime || ''}
              onChange={(e) => setFlashSale({ ...flashSale, endDateTime: e.target.value })}
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
              onChange={(e) => setFlashSale({ ...flashSale, bannerMessage: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>
        </div>

        {/* Campaign Poster / Promotional Image */}
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
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUploadBanner(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={bannerUploading}
              className="button-outline text-xs px-3.5 py-1.5 flex items-center gap-1.5 shrink-0 cursor-pointer"
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
              onChange={(e) => setFlashSale({ ...flashSale, imageUrl: e.target.value })}
              className="w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-2 text-xs text-[#173d35]"
            />
            {flashSale.imageUrl && (
              <button
                type="button"
                onClick={() => setFlashSale({ ...flashSale, imageUrl: '' })}
                className="text-xs text-red-600 hover:underline px-2 cursor-pointer"
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
                <p className="text-slate-500 text-[11px] truncate max-w-sm mt-0.5">
                  {flashSale.imageUrl}
                </p>
                <span className="inline-block mt-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Responsive on Mobile &amp; Desktop
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Applicable Stays & Services */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-2">
            Applicable Stays &amp; Services
          </label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_OPTIONS.map(([val, name]) => {
              const isSelected =
                flashSale.applicableServices === 'all'
                  ? val === 'all'
                  : Array.isArray(flashSale.applicableServices) &&
                    flashSale.applicableServices.includes(val)
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    if (val === 'all') {
                      setFlashSale({ ...flashSale, applicableServices: 'all' })
                    } else {
                      let curr = Array.isArray(flashSale.applicableServices)
                        ? [...flashSale.applicableServices]
                        : []
                      if (curr.includes(val)) {
                        curr = curr.filter((x) => x !== val)
                        if (!curr.length) curr = 'all'
                      } else {
                        curr.push(val)
                      }
                      setFlashSale({ ...flashSale, applicableServices: curr })
                    }
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition border cursor-pointer ${
                    isSelected
                      ? 'bg-[#173d35] text-white border-[#173d35] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-[#edf1e8]'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}
                  {name}
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
  )
}
