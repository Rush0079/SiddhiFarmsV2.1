/**
 * ============================================================================
 * FLASH SALE SHOWCASE COMPONENT — Promotional Campaign Banner
 * ============================================================================
 *
 * @fileoverview  Full-width promotional card for active flash sales.
 *                Shows campaign name, discount badge, countdown timer,
 *                promotional image, and a "Claim Offer" CTA button.
 *                Renders nothing (null) when no flash sale is active.
 *
 * @module        components/customer/flash-sale-showcase
 * @author        Rushikesh Nigade
 * @design-pattern Conditional Render — returns null when no sale data exists.
 *
 * @param {Object}   props
 * @param {Object|null} props.flashSale - Flash sale config from Supabase, or null.
 * @param {Function} props.onBook       - Callback to open the booking panel.
 * @param {string}   props.timeLeft     - Countdown timer string (e.g. "02:15:30").
 * ============================================================================
 */
'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, Zap } from 'lucide-react'

/**
 * FlashSaleShowcase — Renders the promotional flash sale card.
 *
 * @param   {Object} props - See @fileoverview for prop descriptions.
 * @returns {JSX.Element|null} The flash sale section, or null if inactive.
 */
export default function FlashSaleShowcase({ flashSale, onBook, timeLeft }) {
  // ─── Guard: No sale active → render nothing ──────────────────────────────
  if (!flashSale) return null

  // ─── Derive Display Values ───────────────────────────────────────────────
  const badgeText = flashSale.badgeText || '⚡ FLASH SALE'
  const title = flashSale.name || 'Special Promotional Offer'
  const discountFormatted = flashSale.discountType === 'percentage'
    ? `${flashSale.discountValue || 20}% OFF`
    : `₹${flashSale.discountValue || 1000} FLAT DISCOUNT`
  const message = flashSale.bannerMessage || 'Book your countryside getaway today and enjoy exclusive savings across luxury villas and private pool suites.'
  const image = flashSale.imageUrl || '/siddhi/page-02.jpg'

  console.log('[UI:FlashSaleShowcase:RENDER] Active sale:', title, '| Discount:', discountFormatted)

  return (
    <section className="container py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-[#d5b36a]/40 bg-gradient-to-br from-[#0c2a22] via-[#133d32] to-[#081e18] p-6 text-white shadow-2xl sm:p-10"
      >
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#d5b36a]/12 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          {/* Left Column — Content */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Badge & Countdown */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#d5b36a] via-[#e5cf92] to-[#c79d48] px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#0d2a23] shadow-md animate-pulse">
                  <Zap size={14} className="fill-[#0d2a23]" />
                  {badgeText}
                </span>
                {timeLeft && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 border border-[#d5b36a]/35 px-3 py-1 font-mono text-xs font-bold text-[#f7ebd0] backdrop-blur-md">
                    <Clock size={13} />
                    Ends in: {timeLeft}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="mt-5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="font-serif text-2xl font-bold sm:text-3xl text-white">{title}</h3>
                  <span className="rounded-xl bg-[#d5b36a]/20 border border-[#d5b36a]/40 px-3 py-1 text-sm font-black text-[#f7ebd0]">
                    {discountFormatted}
                  </span>
                </div>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/80 max-w-xl">{message}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#f7ebd0]/90">
                  <span className="flex items-center gap-1.5">✓ Instant promotional discount applied on checkout</span>
                  <span className="flex items-center gap-1.5">✓ Complimentary Mini Water Park &amp; Pool Access</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
              <div className="text-xs text-white/70">
                <span>Limited room &amp; villa slots for upcoming dates</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={onBook}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d5b36a] via-[#f3dfa8] to-[#c79d48] px-6 py-3 text-sm font-extrabold text-[#0d2a23] shadow-xl hover:shadow-[#d5b36a]/25 transition-all cursor-pointer"
              >
                <span>Claim Offer &amp; Book Now</span>
                <ArrowUpRight size={17} />
              </motion.button>
            </div>
          </div>

          {/* Right Column — Promotional Image */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/15 bg-black/30 aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3]">
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
              <div>
                <span className="rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-[#f7ebd0] border border-white/10">
                  {badgeText}
                </span>
                <p className="mt-1 text-xs font-medium text-white/90 truncate max-w-[200px] sm:max-w-xs">{title}</p>
              </div>
              <span className="rounded-full bg-gradient-to-r from-[#d5b36a] to-[#c79d48] text-[#0d2a23] px-3 py-1 text-xs font-extrabold shadow-sm shrink-0">
                {discountFormatted}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
