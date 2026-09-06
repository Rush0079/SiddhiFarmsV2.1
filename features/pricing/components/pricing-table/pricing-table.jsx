'use client'

import React from 'react'
import { Check, Edit3, Save, Trash2, Plus, Percent } from 'lucide-react'
import { ServiceLabels } from '../../models/pricing.model'
import { PricingTableDefaults } from './pricing-table.model'
import styles from './pricing-table.module.css'

export default function PricingTable({
  pricing = {},
  setPricing,
  coupons = [],
  coupon,
  setCoupon,
  newRate = { name: '', price: '' },
  setNewRate,
  canManagePricing = false,
  canDelete = false,
  saved = false,
  onSavePricing,
  onAddRate,
  onDeleteRate,
  onCreateCoupon,
  onDeleteCoupon,
}) {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
      {/* ─── Rate Card Management ──────────────────────────────────────── */}
      {canManagePricing && (
        <section className={styles.pricingCard}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">{PricingTableDefaults.SUBTITLE}</p>
              <h2 className="mt-2 font-serif text-2xl text-[#173d35]">{PricingTableDefaults.TITLE}</h2>
            </div>
            <Edit3 size={19} className="text-[#709079]" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Object.entries(ServiceLabels).map(([key, label]) => (
              <label key={key} className="text-xs font-semibold text-slate-700">
                {label}
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-sm text-slate-400">₹</span>
                  <input
                    className="pl-7 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] py-2 text-sm text-[#173d35] outline-none focus:border-[#315d4c]"
                    type="number"
                    min="0"
                    value={pricing[key] ?? ''}
                    onChange={(e) => setPricing({ ...pricing, [key]: Number(e.target.value) })}
                  />
                </div>
              </label>
            ))}

            {/* Custom Added Rates */}
            {Object.entries(pricing._labels || {}).map(([key, label]) => (
              <label key={key} className="text-xs font-semibold text-slate-700">
                <span className="flex items-center justify-between">
                  {label}
                  <button
                    type="button"
                    title="Delete rate"
                    onClick={() => onDeleteRate(key)}
                    className="rounded-full p-1 text-red-500 hover:bg-red-100 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-sm text-slate-400">₹</span>
                  <input
                    className="pl-7 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] py-2 text-sm text-[#173d35] outline-none focus:border-[#315d4c]"
                    type="number"
                    min="0"
                    value={pricing[key] ?? ''}
                    onChange={(e) => setPricing({ ...pricing, [key]: Number(e.target.value) })}
                  />
                </div>
              </label>
            ))}
          </div>

          {/* New Custom Rate Form */}
          {onAddRate && setNewRate && (
            <form
              onSubmit={onAddRate}
              className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-[#f3f5ef] p-4 border border-[#dfe7dc]"
            >
              <label className="flex-1 basis-40 text-xs font-semibold text-slate-700">
                New rate name
                <input
                  required
                  placeholder="e.g. Jacuzzi Add-on"
                  value={newRate.name}
                  onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#dfe7dc] bg-white px-3 py-1.5 text-xs text-[#173d35] outline-none"
                />
              </label>
              <label className="w-32 text-xs font-semibold text-slate-700">
                Price
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">₹</span>
                  <input
                    className="pl-7 w-full rounded-lg border border-[#dfe7dc] bg-white py-1.5 text-xs text-[#173d35] outline-none"
                    required
                    type="number"
                    min="0"
                    value={newRate.price}
                    onChange={(e) => setNewRate({ ...newRate, price: e.target.value })}
                  />
                </div>
              </label>
              <button
                type="submit"
                className="rounded-lg bg-[#315d4c] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#25493b] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Add rate
              </button>
            </form>
          )}

          <div className="mt-6 flex items-center justify-between">
            {saved && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 animate-in fade-in">
                <Check size={14} /> {PricingTableDefaults.SAVED_NOTIFICATION}
              </span>
            )}
            <button
              onClick={onSavePricing}
              className="ml-auto button-primary flex items-center gap-2"
            >
              <Save size={15} /> {PricingTableDefaults.SAVE_BUTTON_TEXT}
            </button>
          </div>
        </section>
      )}

      {/* ─── Coupons Panel ─────────────────────────────────────────────── */}
      {onCreateCoupon && (
        <section className={styles.pricingCard}>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Promotions</p>
              <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Coupons</h2>
            </div>
            <Percent size={19} className="text-[#709079]" />
          </div>

          {coupon && setCoupon && (
            <form onSubmit={onCreateCoupon} className="mt-6 grid gap-4 sm:grid-cols-2 rounded-xl bg-[#f8faf6] p-4 border border-[#dfe7dc]">
              <label className="text-xs font-semibold text-slate-700">
                Coupon code
                <input
                  required
                  placeholder="e.g. MONSOON30"
                  value={coupon.code}
                  onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-lg border border-[#dfe7dc] bg-white px-3 py-1.5 text-xs uppercase text-[#173d35]"
                />
              </label>

              <label className="text-xs font-semibold text-slate-700">
                Discount type
                <select
                  value={coupon.type}
                  onChange={(e) => setCoupon({ ...coupon, type: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#dfe7dc] bg-white px-3 py-1.5 text-xs text-[#173d35]"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-slate-700">
                Discount value
                <input
                  required
                  type="number"
                  min="1"
                  placeholder={coupon.type === 'percentage' ? 'e.g. 10' : 'e.g. 1000'}
                  value={coupon.value}
                  onChange={(e) => setCoupon({ ...coupon, value: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#dfe7dc] bg-white px-3 py-1.5 text-xs text-[#173d35]"
                />
              </label>

              <label className="text-xs font-semibold text-slate-700">
                Min. Booking Value (₹)
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={coupon.minAmount}
                  onChange={(e) => setCoupon({ ...coupon, minAmount: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#dfe7dc] bg-white px-3 py-1.5 text-xs text-[#173d35]"
                />
              </label>

              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="button-primary flex items-center gap-1.5 text-xs">
                  <Plus size={14} /> Create coupon
                </button>
              </div>
            </form>
          )}

          {/* Active Coupons List */}
          <div className="mt-5 space-y-2 max-h-72 overflow-y-auto">
            {coupons.map((c) => (
              <div key={c.id || c.code} className="flex items-center justify-between rounded-xl border border-[#dfe7dc] bg-white p-3 text-xs">
                <div>
                  <strong className="font-mono text-sm text-[#173d35]">{c.code}</strong>
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                  </span>
                  {c.min_amount > 0 && <p className="text-[10px] text-slate-500 mt-0.5">Min amount: ₹{c.min_amount}</p>}
                </div>
                {canDelete && onDeleteCoupon && (
                  <button
                    onClick={() => onDeleteCoupon(c.id)}
                    className="rounded-full p-1.5 text-red-500 hover:bg-red-50 transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {!coupons.length && (
              <p className="py-6 text-center text-xs text-slate-400">No active promotional coupons created.</p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
