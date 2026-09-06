/**
 * ============================================================================
 * HERO SECTION COMPONENT — Landing Visual & CTA
 * ============================================================================
 *
 * @fileoverview  Full-viewport hero section with animated gradient overlay,
 *                ambient motion orbs, tagline, and primary call-to-action.
 *                Displayed at the very top of the homepage below the navbar.
 *
 * @module        components/customer/hero-section
 * @author        Rushikesh Nigade
 * @design-pattern Presentational Component — receives data via props, no
 *                internal state or side effects.
 *
 * @param {Object}   props
 * @param {string}   props.heroImage     - URL for the hero background image.
 * @param {Function} props.onBookingOpen - Callback to open the booking panel.
 * ============================================================================
 */
'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Sparkles } from 'lucide-react'

/**
 * HeroSection — Full-bleed hero with animated typography and dual CTA buttons.
 *
 * Features:
 * - CSS gradient overlay composited with a dynamic background image.
 * - Two ambient glowing orbs with CSS animation for visual depth.
 * - Staggered entrance animations using Framer Motion.
 * - "Plan your visit" primary CTA and "Discover Siddhi" secondary CTA.
 *
 * @param   {Object} props - See @fileoverview for prop descriptions.
 * @returns {JSX.Element} The hero section element.
 */
export default function HeroSection({ heroImage, onBookingOpen }) {
  console.log('[UI:HeroSection:RENDER] Hero section mounted')

  return (
    <section
      id="top"
      className="hero flex min-h-[720px] items-end relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(12,42,34,.92) 0%, rgba(18,57,46,.62) 48%, rgba(16,47,39,.2) 100%), url(${heroImage})`,
      }}
    >
      {/* Ambient Rotating Sunburst Aura — adds visual depth */}
      <div className="pointer-events-none absolute -left-32 top-10 h-[500px] w-[500px] rounded-full bg-radial from-[#e5a93c]/20 via-[#315d4c]/10 to-transparent blur-3xl animate-sunburst-spin opacity-70" />
      <div className="pointer-events-none absolute right-10 top-20 h-[400px] w-[400px] rounded-full bg-radial from-[#74c69d]/15 via-transparent to-transparent blur-2xl animate-ambient-orb" />

      <div className="container relative z-10 pb-20 pt-36">
        <div className="max-w-3xl">
          {/* Eyebrow Tag */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow flex items-center gap-2.5 text-[#e3c77c]"
          >
            <Sparkles size={16} className="text-[#f6bd50] animate-sparkle-drift shrink-0" />
            <span>Farm stays · Agro tourism · Celebrations</span>
          </motion.p>

          {/* Primary Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-5 font-serif text-6xl leading-[.95] tracking-tight text-white sm:text-8xl"
          >
            Come for the <em className="font-normal text-[#e3c77c]">green.</em><br />Stay for the feeling.
          </motion.h1>

          {/* Supporting Copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-7 max-w-lg text-base leading-7 text-white/75"
          >
            A quiet corner of the countryside where good food, open skies and unhurried time come together.
          </motion.p>

          {/* Call-to-Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="button-light shimmer-button shadow-xl text-sm px-7 py-3.5 font-bold"
              onClick={onBookingOpen}
            >
              Plan your visit <ArrowUpRight size={18} />
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="button-ghost shimmer-button text-sm px-7 py-3.5"
              href="#story"
            >
              Discover Siddhi <ArrowUpRight size={18} />
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Location Marker — Desktop Only */}
      <div className="absolute bottom-6 right-8 hidden items-center gap-3 text-xs text-white/60 lg:flex">
        <span className="h-px w-12 bg-white/40" /> Maharashtra, India
      </div>
    </section>
  )
}
