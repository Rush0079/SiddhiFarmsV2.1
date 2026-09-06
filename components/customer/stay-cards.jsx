/**
 * ============================================================================
 * STAY CARDS COMPONENT — Accommodation Showcase
 * ============================================================================
 *
 * @fileoverview  Renders the villa/room accommodation cards section.
 *                Each card links to its detail page with live pricing
 *                and a "View availability" CTA button.
 *
 * @module        components/customer/stay-cards
 * @author        Rushikesh Nigade
 * @design-pattern Presentational Component — stateless, data-driven.
 *
 * @param {Object}   props
 * @param {Object}   props.pricing      - Current pricing object from Supabase.
 * @param {Function} props.img          - Image resolver function: (key) => url.
 * @param {Function} props.onBookingOpen - Callback to open the booking panel.
 * ============================================================================
 */
'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { STAY_CARDS } from '@/lib/helpers/formatting'

/**
 * StayCards — Horizontal card grid showcasing accommodation options.
 *
 * @param   {Object} props - See @fileoverview for prop descriptions.
 * @returns {JSX.Element} The stay/accommodation section element.
 */
export default function StayCards({ pricing, img, onBookingOpen }) {
  console.log('[UI:StayCards:RENDER] Rendering', STAY_CARDS.length, 'accommodation cards')

  return (
    <section id="stay" className="container py-24 sm:py-32">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Stay awhile</p>
          <h2 className="section-title">
            Your room in<br /><em>the countryside.</em>
          </h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="button-outline shimmer-button"
          onClick={onBookingOpen}
        >
          View availability <ArrowUpRight size={16} />
        </motion.button>
      </div>

      {/* Accommodation Cards Grid */}
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {STAY_CARDS.map(([slug, no, title, desc, priceKey, imageKey], idx) => (
          <motion.a
            href={`/details/${slug}`}
            className="stay-card luxury-card group block transition-shadow duration-300 hover:shadow-2xl"
            key={slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: idx * 0.12 }}
            whileHover={{ y: -8 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Card Image */}
            <div
              className="stay-image overflow-hidden"
              style={{ backgroundImage: `linear-gradient(0deg, rgba(18,57,46,.28), transparent), url(${img(imageKey)})` }}
            >
              <span className="shadow-md transition-transform duration-300 group-hover:scale-110">{no}</span>
            </div>

            {/* Card Content */}
            <div className="p-6">
              <div className="flex justify-between items-center">
                <h3 className="font-serif text-2xl text-[#173d35] group-hover:text-[#315d4c] transition-colors">{title}</h3>
                <span className="text-sm font-semibold text-[#315d4c]">
                  ₹{(pricing[priceKey] || 0).toLocaleString('en-IN')}+
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#315d4c] transition-all group-hover:gap-2.5">
                View details <ArrowUpRight size={13} />
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  )
}
