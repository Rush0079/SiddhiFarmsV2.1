'use client'

import React, { useRef, useMemo } from 'react'
import { Zap, Upload, Loader2, Save, Calendar, Sparkles, CheckCircle2 } from 'lucide-react'
import {
  FlashSaleServiceOptions,
  FlashSaleSchedulerDefaults,
} from './flash-sale-scheduler.model'
import {
  ANNUAL_SALES_DEFINITIONS,
  evaluateAnnualSales,
} from '../../models/flash-sale.model'
import styles from './flash-sale-scheduler.module.css'

export default function FlashSaleScheduler({
  flashSale = {},
  setFlashSale,
  savingSale = false,
  bannerUploading = false,
  onUploadBanner,
  onSaveSale,
}) {
  const fileInputRef = useRef(null)

  const annualSalesConfig = flashSale.annualSales || {}

  // Compute live annual schedule status
  const annualStatus = useMemo(() => {
    return evaluateAnnualSales(annualSalesConfig, new Date())
  }, [annualSalesConfig])

  const updateAnnualSaleField = (id, field, value) => {
    const prevAnnual = flashSale.annualSales || {}
    const prevEvent = prevAnnual[id] || {}
    setFlashSale({
      ...flashSale,
      annualSales: {
        ...prevAnnual,
        [id]: {
          ...prevEvent,
          [field]: value,
        },
      },
    })
  }

  const getStatusBadge = () => {
    if (!flashSale.enabled) {
      return (
        <span className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-600 border border-slate-200">
          🔴 Custom Campaign Disabled
        </span>
      )
    }
    const now = new Date()
    const start = flashSale.startDateTime ? new Date(flashSale.startDateTime) : null
    const end = flashSale.endDateTime ? new Date(flashSale.endDateTime) : null

    if (start && now < start) {
      return (
        <span className="rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 border border-amber-200">
          🟡 Scheduled (Starts {start.toLocaleDateString('en-IN')})
        </span>
      )
    }
    if (end && now > end) {
      return (
        <span className="rounded-full bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 border border-red-200">
          ⚪ Expired
        </span>
      )
    }
    return (
      <span className="rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 animate-pulse">
        🟢 LIVE ON WEBSITE
      </span>
    )
  }

  return (
    <section className={styles.schedulerCard}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef2eb] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-amber-600 fill-amber-500" />
            <p className="eyebrow text-amber-800">{FlashSaleSchedulerDefaults.SUBTITLE}</p>
          </div>
          <h2 className="mt-1 font-serif text-2xl text-[#173d35]">
            {FlashSaleSchedulerDefaults.TITLE}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {FlashSaleSchedulerDefaults.DESCRIPTION}
          </p>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      <form onSubmit={onSaveSale} className="mt-6 space-y-6">
        {/* Enable Custom Flash Sale Toggle */}
        <div className="flex items-center justify-between rounded-xl bg-[#f4f7f2] p-4 border border-[#dfe7dc]">
          <div>
            <label htmlFor="sale-toggle" className="text-sm font-bold text-[#173d35] cursor-pointer">
              Enable Manual / Ad-Hoc Flash Sale
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Launch an immediate or custom dated promotional flash sale banner override.
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

        {/* Custom Flash Sale Form Fields */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700">
            Campaign Title *
            <input
              type="text"
              required={Boolean(flashSale.enabled)}
              placeholder="e.g. Monsoon Weekend Flash Sale"
              value={flashSale.name || ''}
              onChange={(e) => setFlashSale({ ...flashSale, name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Banner Badge Text
            <input
              type="text"
              placeholder="e.g. ⚡ FLASH SALE"
              value={flashSale.badgeText || ''}
              onChange={(e) => setFlashSale({ ...flashSale, badgeText: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Discount Type
            <select
              value={flashSale.discountType || 'percentage'}
              onChange={(e) => setFlashSale({ ...flashSale, discountType: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
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
              required={Boolean(flashSale.enabled)}
              placeholder={flashSale.discountType === 'percentage' ? '20' : '2000'}
              value={flashSale.discountValue ?? ''}
              onChange={(e) => setFlashSale({ ...flashSale, discountValue: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Start Date &amp; Time (IST)
            <input
              type="datetime-local"
              value={flashSale.startDateTime || ''}
              onChange={(e) => setFlashSale({ ...flashSale, startDateTime: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            End Date &amp; Time (IST)
            <input
              type="datetime-local"
              value={flashSale.endDateTime || ''}
              onChange={(e) => setFlashSale({ ...flashSale, endDateTime: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
            />
          </label>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">
            Banner Announcement Message
            <textarea
              rows={2}
              placeholder="e.g. Special limited-time discount! Book today and get 20% off all stays with complimentary pool access."
              value={flashSale.bannerMessage || ''}
              onChange={(e) => setFlashSale({ ...flashSale, bannerMessage: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
            />
          </label>
        </div>

        {/* Campaign Poster Image */}
        <div className="rounded-xl border border-[#dfe7dc] bg-[#f9faf6] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label className="text-xs font-bold text-[#173d35]">
                Custom Poster / Banner Image (Responsive)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload a promotional image or paste an image URL.
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
              className="w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-2 text-xs text-[#173d35] outline-none"
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
        </div>

        {/* ─── Automated Annual Recurring Sales (4 Holidays) ──────────────── */}
        <div className={styles.annualSection}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#315d4c]" />
                <p className="eyebrow text-[#315d4c]">{FlashSaleSchedulerDefaults.ANNUAL_SUBTITLE}</p>
              </div>
              <h3 className="mt-1 font-serif text-xl font-bold text-[#173d35]">
                {FlashSaleSchedulerDefaults.ANNUAL_TITLE}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl">
                {FlashSaleSchedulerDefaults.ANNUAL_DESCRIPTION}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> 4 Annual Sales Active
            </span>
          </div>

          <div className={styles.annualGrid}>
            {ANNUAL_SALES_DEFINITIONS.map((def) => {
              const userConf = annualSalesConfig[def.id] || {}
              const isEnabled = userConf.enabled !== undefined ? Boolean(userConf.enabled) : true
              const discountVal = userConf.discountValue !== undefined ? userConf.discountValue : def.defaultDiscountValue
              const bannerMsg = userConf.bannerMessage !== undefined ? userConf.bannerMessage : def.defaultBannerMessage

              // Find current live state from scheduleList
              const statusItem = annualStatus.scheduleList.find((s) => s.id === def.id)
              const state = statusItem?.state || 'scheduled'

              return (
                <div key={def.id} className={styles.holidayCard}>
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-[#dfe7dc] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{def.badgeText.split(' ')[0]}</span>
                          <h4 className="font-serif text-base font-bold text-[#173d35]">{def.name}</h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          Holiday: <strong className="text-slate-700">{def.anchorHoliday}</strong> · Duration: 10 Days
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {state === 'live' && (
                          <span className="rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-black animate-pulse">
                            LIVE NOW
                          </span>
                        )}
                        {state === 'teaser' && (
                          <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black">
                            TEASER ACTIVE
                          </span>
                        )}
                        {state === 'scheduled' && (
                          <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold border border-slate-200">
                            SCHEDULED
                          </span>
                        )}
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => updateAnnualSaleField(def.id, 'enabled', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-[#173d35] focus:ring-[#315d4c] cursor-pointer"
                          title="Enable/disable this annual sale"
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-[#e5ebe1]">
                      <p>
                        📅 <strong>Sale Window:</strong> Starts {def.startDay} {new Date(2026, def.startMonth - 1, 1).toLocaleString('en-US', { month: 'short' })} for 10 days
                      </p>
                      <p className="mt-0.5 text-slate-500">
                        📣 <strong>Website Teaser:</strong> Automatically visible 15 days prior to start date
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Discount Value (%)
                        <div className="relative mt-1">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={discountVal}
                            onChange={(e) => updateAnnualSaleField(def.id, 'discountValue', Number(e.target.value))}
                            className="w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-1.5 text-sm font-bold text-[#173d35] outline-none"
                          />
                          <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                        </div>
                      </label>

                      <label className="text-xs font-semibold text-slate-700">
                        Badge Label
                        <input
                          type="text"
                          value={userConf.badgeText || def.badgeText}
                          onChange={(e) => updateAnnualSaleField(def.id, 'badgeText', e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-1.5 text-xs text-[#173d35] outline-none"
                        />
                      </label>
                    </div>

                    <label className="mt-3 block text-xs font-semibold text-slate-700">
                      Promotional Banner Message
                      <textarea
                        rows={2}
                        value={bannerMsg}
                        onChange={(e) => updateAnnualSaleField(def.id, 'bannerMessage', e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-1.5 text-xs text-[#173d35] outline-none leading-relaxed"
                      />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Submit & Save Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#eef2eb]">
          <p className="text-xs text-slate-400">
            🛡️ Saving updates both ad-hoc flash sales and the 4 annual recurring schedules immediately.
          </p>
          <button
            type="submit"
            disabled={savingSale}
            className="button-primary flex items-center gap-2 cursor-pointer"
          >
            {savingSale ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {savingSale ? 'Saving Campaigns…' : FlashSaleSchedulerDefaults.SAVE_BUTTON_TEXT}
          </button>
        </div>
      </form>
    </section>
  )
}
