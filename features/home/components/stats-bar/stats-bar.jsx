'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { getPropertyStats } from './stats-bar.model'
import styles from './stats-bar.module.css'

export default function StatsBar() {
  const stats = getPropertyStats()

  return (
    <section className={styles.statsSection}>
      <div className={`container ${styles.statsGrid} divide-x divide-[#dfe6dc]`}>
        {stats.map(([n, label], idx) => (
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
