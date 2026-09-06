'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { StorySectionDefaults, getStoryFeatures } from './story-section.model'
import styles from './story-section.module.css'

export default function StorySection() {
  const features = getStoryFeatures()

  return (
    <section id="story" className={`container ${styles.storyContainer}`}>
      {/* Left Column — Section Header */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-[#e3eee1] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#315d4c] mb-3">
          <span className="h-2 w-2 rounded-full bg-[#315d4c] animate-ping" />
          {StorySectionDefaults.BADGE}
        </div>
        <h2 className="section-title">
          {StorySectionDefaults.TITLE_LINE1}<br /><em>{StorySectionDefaults.TITLE_LINE2}</em>
        </h2>
      </motion.div>

      {/* Right Column — Description & Feature Cards */}
      <div>
        <p className="max-w-xl text-lg leading-8 text-slate-600">
          {StorySectionDefaults.NARRATIVE}
        </p>
        <div className="mt-8 grid gap-3.5 text-sm text-[#315d4c] sm:grid-cols-2">
          {features.map((feat, idx) => (
            <motion.div
              key={feat}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={styles.featureCard}
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
