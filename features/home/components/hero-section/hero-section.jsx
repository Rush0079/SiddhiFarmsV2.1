'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { HeroSectionDefaults } from './hero-section.model'
import styles from './hero-section.module.css'

export default function HeroSection({ heroImage, onBookingOpen }) {
  return (
    <section
      id="top"
      className={`hero ${styles.heroContainer}`}
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(12,42,34,.92) 0%, rgba(18,57,46,.62) 48%, rgba(16,47,39,.2) 100%), url(${heroImage})`,
      }}
    >
      {/* Ambient Rotating Sunburst Aura */}
      <div className={`${styles.ambientOrb1} bg-radial from-[#e5a93c]/20 via-[#315d4c]/10 to-transparent animate-sunburst-spin`} />
      <div className={`${styles.ambientOrb2} bg-radial from-[#74c69d]/15 via-transparent to-transparent animate-ambient-orb`} />

      <div className="container relative z-10 pb-12 pt-28 sm:pb-20 sm:pt-36">
        <div className="max-w-3xl">
          {/* Eyebrow Tag */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow flex items-center gap-2.5 text-[#e3c77c]"
          >
            <Sparkles size={16} className="text-[#f6bd50] animate-sparkle-drift shrink-0" />
            <span>{HeroSectionDefaults.TAGLINE}</span>
          </motion.p>

          {/* Primary Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-5 font-serif text-5xl sm:text-7xl lg:text-8xl leading-[.95] tracking-tight text-white"
          >
            {HeroSectionDefaults.HEADLINE_PART1}
            <em className="font-normal text-[#e3c77c]">{HeroSectionDefaults.HEADLINE_EM}</em>
            <br />
            {HeroSectionDefaults.HEADLINE_PART2}
          </motion.h1>

          {/* Supporting Copy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-6 max-w-lg text-sm sm:text-base leading-7 text-white/85"
          >
            {HeroSectionDefaults.SUPPORTING_COPY}
          </motion.p>

          {/* Call-to-Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="button-light shimmer-button inline-flex items-center gap-2.5 rounded-full bg-white text-[#173d35] px-7 py-3.5 text-sm font-bold shadow-2xl hover:bg-[#f5f8f3] transition-all cursor-pointer"
              onClick={onBookingOpen}
            >
              {HeroSectionDefaults.PRIMARY_CTA} <ArrowUpRight size={18} />
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="button-ghost shimmer-button inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-white/10 backdrop-blur-xs text-white px-7 py-3.5 text-sm font-bold hover:bg-white/20 transition-all cursor-pointer"
              href="#story"
            >
              {HeroSectionDefaults.SECONDARY_CTA} <ArrowUpRight size={18} />
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Location Marker — Desktop Only */}
      <div className="absolute bottom-6 right-8 hidden items-center gap-3 text-xs text-white/60 lg:flex">
        <span className="h-px w-12 bg-white/40" /> {HeroSectionDefaults.LOCATION_TAG}
      </div>
    </section>
  )
}
