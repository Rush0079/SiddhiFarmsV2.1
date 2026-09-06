'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, Zap, Sparkles } from 'lucide-react'
import { FlashSaleBannerDefaults } from './flash-sale-banner.model'
import styles from './flash-sale-banner.module.css'

export default function FlashSaleBanner({ flashSale, onBook, timeLeft }) {
  if (!flashSale) return null

  const isTeaser = Boolean(flashSale.isTeaser)
  const badgeText = flashSale.badgeText || FlashSaleBannerDefaults.BADGE
  const title = flashSale.name || FlashSaleBannerDefaults.DEFAULT_TITLE
  const discountFormatted = flashSale.discountType === 'percentage'
    ? `${flashSale.discountValue || 10}% OFF`
    : `₹${flashSale.discountValue || 1000} FLAT DISCOUNT`
  const message = flashSale.bannerMessage || FlashSaleBannerDefaults.DEFAULT_MESSAGE
  const image = flashSale.imageUrl || '/siddhi/page-02.jpg'

  return (
    <section className="container py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className={styles.bannerCard}
      >
        <div className={styles.ambientGlowGold} />
        <div className={styles.ambientGlowEmerald} />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={styles.badge}>
                {isTeaser ? <Sparkles size={14} className="text-[#f6bd50]" /> : <Zap size={14} className="text-[#f6bd50]" />}
                {badgeText} {isTeaser ? '· UPCOMING' : '· LIVE NOW'}
              </span>
              {timeLeft && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 border border-white/10 px-3 py-1 text-xs font-mono text-white/90">
                  <Clock size={13} className="text-[#f6bd50]" /> {timeLeft} {isTeaser ? 'Until Start' : 'Remaining'}
                </span>
              )}
            </div>

            <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {title}
            </h2>

            <div className="mt-3 inline-block rounded-xl bg-gradient-to-r from-[#d5b36a]/20 to-emerald-400/10 border border-[#d5b36a]/40 px-3.5 py-1.5 text-base sm:text-lg font-bold text-[#f7ebd0]">
              ✨ {discountFormatted} {isTeaser ? '(Coming Soon)' : '(Applied Automatically)'}
            </div>

            <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed max-w-xl">
              {message}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={onBook}
                className="rounded-2xl bg-gradient-to-r from-[#d5b36a] to-[#b89547] px-7 py-3.5 text-sm font-bold text-[#0c2a22] shadow-xl shadow-[#d5b36a]/20 transition-all hover:brightness-110 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                {isTeaser ? 'Plan & Reserve Ahead' : FlashSaleBannerDefaults.CLAIM_BUTTON_TEXT} <ArrowUpRight size={16} />
              </button>
            </div>
          </div>

          <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        </div>
      </motion.div>
    </section>
  )
}
