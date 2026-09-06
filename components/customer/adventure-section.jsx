/**
 * ============================================================================
 * ADVENTURE SECTION COMPONENT — "Coming Soon" Teaser
 * ============================================================================
 *
 * @fileoverview  Promotional teaser card announcing upcoming adventure
 *                activities (zip lines, rope courses, kids adventure).
 *                Includes floating animated activity badges.
 *
 * @module        components/customer/adventure-section
 * @author        Rushikesh Nigade
 * @design-pattern Presentational Component — stateless teaser.
 *
 * @param {Object}   props
 * @param {Function} props.img - Image resolver function: (key) => url.
 * ============================================================================
 */
'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

/** @const {Array<[string, string]>} ADVENTURE_ACTIVITIES - Upcoming activities [emoji+name, animationDelay] */
const ADVENTURE_ACTIVITIES = [
  ['🪂 Zip line', '0s'],
  ['🧗 Rope course', '1s'],
  ['🏕️ Kids adventure', '2s'],
]

/**
 * AdventureSection — "Coming Soon" teaser with floating badges.
 *
 * @param   {Object} props - See @fileoverview for prop descriptions.
 * @returns {JSX.Element} The adventure teaser section element.
 */
export default function AdventureSection({ img }) {
  console.log('[UI:AdventureSection:RENDER] Adventure teaser section mounted')

  return (
    <section className="container pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-[#dce8d8] p-8 sm:p-14 border border-[#c8d9c2] shadow-sm"
      >
        <div className="relative z-10 max-w-xl">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#315d4c] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#d5b36a] shadow-xs">
            <Sparkles size={13} className="animate-spin text-[#d5b36a]" style={{ animationDuration: '4s' }} /> Coming soon
          </div>

          {/* Headline */}
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl leading-none text-[#173d35]">
            A little more<br /><em>adventure.</em>
          </h2>

          {/* Description */}
          <p className="mt-5 max-w-sm leading-7 text-[#315d4c]/85 text-sm sm:text-base">
            Zip lines, rope courses and wild little memories are on their way to Siddhi.
          </p>

          {/* Floating Activity Badges */}
          <div className="mt-7 flex flex-wrap gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#173d35]">
            {ADVENTURE_ACTIVITIES.map(([name, delay]) => (
              <span
                key={name}
                className="rounded-full bg-white/80 px-4 py-2 shadow-xs border border-white/80 animate-float-slow transition hover:scale-105"
                style={{ animationDelay: delay }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Background Shape */}
        <div
          className="adventure-shape"
          style={{ backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.35), rgba(112,144,121,.35)), url(${img('adventureShape')})` }}
        />
      </motion.div>
    </section>
  )
}
