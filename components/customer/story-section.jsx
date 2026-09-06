/**
 * ============================================================================
 * STORY SECTION COMPONENT — "The Siddhi Feeling"
 * ============================================================================
 *
 * @fileoverview  Narrative section that introduces the resort's philosophy
 *                and highlights key features (organic dining, villas,
 *                celebration lawns, hospitality).
 *
 * @module        components/customer/story-section
 * @author        Rushikesh Nigade
 * @design-pattern Presentational Component — pure visual, no state.
 * ============================================================================
 */
'use client'

import { motion } from 'framer-motion'

/** @const {string[]} FEATURE_HIGHLIGHTS - Key resort selling points */
const FEATURE_HIGHLIGHTS = [
  'Farm-fresh organic dining',
  'Spacious private luxury villas',
  'Exclusive celebration lawns',
  'Warm authentic hospitality',
]

/**
 * StorySection — Animated narrative block with feature highlight cards.
 *
 * @returns {JSX.Element} The "Our Story" section element.
 */
export default function StorySection() {
  console.log('[UI:StorySection:RENDER] Story section mounted')

  return (
    <section id="story" className="container grid gap-14 py-24 sm:py-32 md:grid-cols-[.8fr_1.2fr] md:items-center">
      {/* Left Column — Section Header */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-[#e3eee1] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#315d4c] mb-3">
          <span className="h-2 w-2 rounded-full bg-[#315d4c] animate-ping" />
          The Siddhi feeling
        </div>
        <h2 className="section-title">
          A little closer<br /><em>to what matters.</em>
        </h2>
      </motion.div>

      {/* Right Column — Description & Feature Cards */}
      <div>
        <p className="max-w-xl text-lg leading-8 text-slate-600">
          At Siddhi Farm Resort, the days are shaped by nature. Wander through our farm, dip into the pool, share a long meal, or simply find a shady spot and do absolutely nothing.
        </p>
        <div className="mt-8 grid gap-3.5 text-sm text-[#315d4c] sm:grid-cols-2">
          {FEATURE_HIGHLIGHTS.map((feat, idx) => (
            <motion.div
              key={feat}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="flex items-center gap-3 rounded-2xl bg-white border border-[#e1e7dd] p-3.5 shadow-sm transition-shadow hover:border-[#315d4c]/40 hover:shadow-md"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e3eee1] text-[#315d4c] font-bold">✓</div>
              <span className="font-semibold text-[#173d35]">{feat}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
