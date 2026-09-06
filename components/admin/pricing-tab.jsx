/**
 * ============================================================================
 * PRICING TAB COMPONENT — Season-Ready Rates & Promotional Coupons
 * ============================================================================
 *
 * @fileoverview  Administer core resort accommodation & experience rates,
 *                manage custom amenity rates, and issue promotional coupon codes.
 *
 * @module        components/admin/pricing-tab
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'
import { Check, Edit3, Save, Trash2, Plus, Percent } from 'lucide-react'

const LABELS = {
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
  getTogetherEvent: 'Get-together event',
}

/**
 * PricingTab Component
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.pricing          - Current rate card map.
 * @param {Function} props.setPricing       - Pricing setter.
 * @param {Array}    props.coupons          - Array of promotional coupons.
 * @param {Object}   props.coupon           - Form state for new coupon.
 * @param {Function} props.setCoupon        - Setter for coupon form.
 * @param {Object}   props.newRate          - Form state for new custom rate.
 * @param {Function} props.setNewRate       - Setter for custom rate form.
 * @param {boolean}  props.canManagePricing - Permissions check.
 * @param {boolean}  props.canDelete        - Permissions check.
 * @param {boolean}  props.saved            - Save success indicator.
 * @param {Function} props.onSavePricing    - Callback to save rates.
 * @param {Function} props.onAddRate        - Callback to add a new custom rate.
 * @param {Function} props.onDeleteRate     - Callback to delete a custom rate.
 * @param {Function} props.onCreateCoupon   - Callback to generate a coupon.
 * @param {Function} props.onDeleteCoupon   - Callback to remove a coupon.
 * @returns {JSX.Element}
 */
export default function PricingTab({
  pricing = {},
  setPricing,
  coupons = [],
  coupon,
  setCoupon,
  newRate,
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
  console.log('[UI:PricingTab:RENDER] Rendering pricing & coupon management')

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
      {/* ─── Rate Card Management ──────────────────────────────────────── */}
      {canManagePricing && (
        <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Pricing management</p>
              <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Season-ready rates</h2>
            </div>
            <Edit3 size={19} className="text-[#709079]" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Object.entries(LABELS).map(([key, label]) => (
              <label key={key} className="text-xs font-semibold text-slate-700">
                {label}
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2.5 text-sm text-slate-400">₹</span>
                  <input
                    className="pl-7 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] py-2 text-sm text-[#173d35]"
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
                    className="pl-7 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] py-2 text-sm text-[#173d35]"
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
                className="mt-1 w-full rounded-lg border border-[#dfe7dc] bg-white px-3 py-1.5 text-xs text-[#173d35]"
              />
            </label>
            <label className="w-32 text-xs font-semibold text-slate-700">
              Price
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-xs text-slate-400">₹</span>
                <input
                  className="pl-7 w-full rounded-lg border border-[#dfe7dc] bg-white py-1.5 text-xs text-[#173d35]"
                  required
                  type="number"
                  min="0"
                  value={newRate.price}
                  onChange={(e) => setNewRate({ ...newRate, price: e.target.value })}
                />
              </div>
            </label>
            <button className="button-outline text-xs px-3 py-2 flex items-center gap-1.5" type="submit">
              <Plus size={14} /> Add rate
            </button>
          </form>

          <p className="mt-3 text-xs text-slate-400 leading-relaxed">
            Core rates power live reservations and can be modified at any time. Custom rates can be removed when discontinued.
          </p>

          <button className="button-primary mt-4 w-full" onClick={onSavePricing}>
            {saved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              <>
                <Save size={16} /> Save pricing
              </>
            )}
          </button>
        </section>
      )}

      {/* ─── Promotional Coupon Manager ────────────────────────────────── */}
      <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 shadow-sm">
        <div>
          <p className="eyebrow">Coupon manager</p>
          <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Create an offer</h2>
        </div>

        <form onSubmit={onCreateCoupon} className="mt-6 grid gap-4 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700">
            Code
            <input
              required
              placeholder="e.g. MONSOON30"
              value={coupon.code}
              onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] uppercase font-mono"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Discount
            <input
              required
              type="number"
              min="1"
              value={coupon.value}
              onChange={(e) => setCoupon({ ...coupon, value: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Type
            <select
              value={coupon.type}
              onChange={(e) => setCoupon({ ...coupon, type: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (₹)</option>
            </select>
          </label>
          <button className="button-outline sm:col-span-3 flex items-center justify-center gap-2" type="submit">
            <Percent size={16} /> Create coupon
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {coupons.length ? (
            coupons.map((item) => (
              <div
                className="flex items-center justify-between rounded-xl bg-[#f3f5ef] px-4 py-3 text-sm border border-[#dfe7dc]"
                key={item.id}
              >
                <strong className="font-mono text-slate-900">{item.code}</strong>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">
                    {item.value}
                    {item.type === 'percentage' ? '%' : '₹'} off · {item.active ? 'Active' : 'Paused'}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => onDeleteCoupon(item.id)}
                      title="Delete coupon"
                      className="rounded-full p-1.5 text-red-500 hover:bg-red-100 transition cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">No coupons created yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
