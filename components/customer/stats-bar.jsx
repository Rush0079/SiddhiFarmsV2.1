/**
 * ============================================================================
 * STATS BAR COMPONENT — Property Highlights
 * ============================================================================
 *
 * @fileoverview  Horizontal stats bar displaying key property metrics
 *                (3 Master Bedrooms, 2 Private Villas, 1 Beautiful Farm, ∞ Ways).
 *                Positioned between the hero section and the main content.
 *
 * @module        components/customer/stats-bar
 * @author        Rushikesh Nigade
 * @design-pattern Presentational Component — stateless, config-driven.
 * ============================================================================
 */
'use client'

import { motion } from 'framer-motion'
import { PROPERTY_STATS } from '@/lib/helpers/formatting'

/**
 * StatsBar — Animated horizontal counter display.
 *
 * @returns {JSX.Element} The stats section element.
 */
export default function StatsBar() {
  console.log('[UI:StatsBar:RENDER] Stats bar mounted')

  return (
    <section className="border-b border-[#dfe6dc] bg-[#f4f5ef]">
      <div className="container grid grid-cols-2 divide-x divide-[#dfe6dc] sm:grid-cols-4">
        {PROPERTY_STATS.map(([n, label], idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="group px-4 py-8 text-center first:pl-0 sm:py-10 transition-all duration-300 hover:bg-white/60"
          >
            <p className="font-serif text-3xl sm:text-4xl font-bold text-[#315d4c] transition-transform duration-300 group-hover:scale-110 group-hover:text-[#214b40]">{n}</p>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500 group-hover:text-[#b77c4e] transition-colors">{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
