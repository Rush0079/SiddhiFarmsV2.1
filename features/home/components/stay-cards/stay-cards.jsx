'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { StayCardsDefaults, getStayCards } from './stay-cards.model'
import styles from './stay-cards.module.css'

export default function StayCards({ pricing = {}, img, onBookingOpen }) {
  const cards = getStayCards()

  return (
    <section id="stay" className={`container ${styles.staySection}`}>
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{StayCardsDefaults.SUBTITLE}</p>
          <h2 className="section-title">
            {StayCardsDefaults.TITLE_LINE1}<br /><em>{StayCardsDefaults.TITLE_LINE2}</em>
          </h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="button-outline shimmer-button cursor-pointer"
          onClick={onBookingOpen}
        >
          {StayCardsDefaults.CTA_TEXT} <ArrowUpRight size={16} />
        </motion.button>
      </div>

      {/* Accommodation Cards Grid */}
      <div className={styles.cardsGrid}>
        {cards.map(([slug, no, title, desc, priceKey, imageKey], idx) => (
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
