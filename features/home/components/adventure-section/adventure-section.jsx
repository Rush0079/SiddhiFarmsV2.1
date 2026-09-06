'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { AdventureSectionDefaults, getAdventureActivities } from './adventure-section.model'
import styles from './adventure-section.module.css'

export default function AdventureSection({ img }) {
  const activities = getAdventureActivities()

  return (
    <section className={`container ${styles.adventureSection}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6 }}
        className={styles.teaserCard}
      >
        <div className="relative z-10 max-w-xl">
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#315d4c] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#d5b36a] shadow-xs">
            <Sparkles size={13} className="animate-spin text-[#d5b36a]" style={{ animationDuration: '4s' }} /> {AdventureSectionDefaults.BADGE}
          </div>

          {/* Headline */}
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl leading-none text-[#173d35]">
            {AdventureSectionDefaults.TITLE_LINE1}<br /><em>{AdventureSectionDefaults.TITLE_LINE2}</em>
          </h2>

          {/* Description */}
          <p className="mt-5 max-w-sm leading-7 text-[#315d4c]/85 text-sm sm:text-base">
            {AdventureSectionDefaults.DESCRIPTION}
          </p>

          {/* Floating Activity Badges */}
          <div className="mt-7 flex flex-wrap gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#173d35]">
            {activities.map(([name, delay]) => (
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
