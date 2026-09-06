'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { ExperiencesGridDefaults, getExperiences } from './experiences-grid.model'
import styles from './experiences-grid.module.css'

export default function ExperiencesGrid({ pricing = {} }) {
  const experiences = getExperiences()

  return (
    <section id="experiences" className={styles.experiencesSection}>
      <div className="container">
        {/* Section Header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-[#d5b36a]">{ExperiencesGridDefaults.SUBTITLE}</p>
            <h2 className="section-title text-white">
              {ExperiencesGridDefaults.TITLE_LINE1}<br /><em>{ExperiencesGridDefaults.TITLE_LINE2}</em>
            </h2>
          </div>
          <Sparkles
            className="block text-[#d5b36a] animate-spin-round cursor-pointer hover:opacity-80 transition-opacity h-8 w-8 sm:h-11 sm:w-11"
            strokeWidth={1.2}
            style={{ filter: 'drop-shadow(0 0 10px rgba(213, 179, 106, 0.45))' }}
          />
        </div>

        {/* Experience Cards Grid */}
        <div className={styles.experiencesGrid}>
          {experiences.map(([slug, title, desc, priceKey, unit], i) => {
            const rate = pricing[priceKey] || 0
            return (
              <motion.a
                href={`/details/${slug}`}
                key={slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.98 }}
                className="luxury-card group block bg-[#214b40] p-8 transition-colors duration-300 hover:bg-[#28574a] sm:p-10"
              >
                <span className="text-sm font-bold text-[#d5b36a]">0{i + 1}</span>
                <h3 className="mt-20 font-serif text-3xl transition-transform duration-300 group-hover:translate-x-1">{title}</h3>
                <p className="mt-4 min-h-14 text-sm leading-6 text-white/65">{desc}</p>
                <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-5 text-sm">
                  <span className="font-medium text-[#e3c77c]">
                    ₹{rate.toLocaleString('en-IN')} <span className="text-white/50 text-xs">/ {unit.replace('per ', '')}</span>
                  </span>
                  <ArrowUpRight className="transition group-hover:translate-x-1 group-hover:-translate-y-1 text-[#d5b36a]" size={18} />
                </div>
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
