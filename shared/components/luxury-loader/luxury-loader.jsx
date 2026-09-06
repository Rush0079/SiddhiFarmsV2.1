'use client'

import { motion } from 'framer-motion'
import SiddhiLogo from '@/shared/components/siddhi-logo/siddhi-logo'
import styles from './luxury-loader.module.css'
import { LuxuryLoaderDefaults } from './luxury-loader.model'

/**
 * Luxury Full-Screen or Container Page Loader
 */
export function LuxuryPageLoader({
  title = LuxuryLoaderDefaults.PAGE_TITLE,
  subtitle = LuxuryLoaderDefaults.PAGE_SUBTITLE,
  fullScreen = true,
}) {
  return (
    <div
      className={`${styles.loaderContainer} ${
        fullScreen ? styles.fullScreen : styles.inline
      }`}
    >
      {/* Ambient background glow orbs */}
      <div className={`${styles.goldAmbientGlow} animate-pulse`} />
      <div className={styles.emeraldAmbientGlow} />

      {/* Main Animated Hub */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Outer Rotating Celestial Ring */}
        <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center">
          <svg className="h-full w-full animate-spin [animation-duration:6s]" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(213, 179, 106, 0.15)"
              strokeWidth="2"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="url(#goldGradient)"
              strokeWidth="2.5"
              strokeDasharray="60 160"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d5b36a" />
                <stop offset="100%" stopColor="#f3dfa8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Counter Rotating Inner Emerald Ring */}
          <svg className="absolute h-20 w-20 sm:h-24 sm:w-24 animate-spin [animation-duration:3.5s] [animation-direction:reverse]" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#40916c"
              strokeWidth="2"
              strokeDasharray="40 180"
              strokeLinecap="round"
            />
          </svg>

          {/* Centered Logo with Gentle Breathing Animation */}
          <motion.div
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute flex items-center justify-center"
          >
            <SiddhiLogo className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-[0_0_15px_rgba(213,179,106,0.5)]" />
          </motion.div>
        </div>

        {/* Brand & Status Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 flex flex-col items-center text-center"
        >
          <h3 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-[#f7ebd0]">
            {title}
          </h3>
          <p className="mt-1 text-xs sm:text-sm font-medium text-white/70 max-w-xs animate-pulse">
            {subtitle}
          </p>

          {/* Shimmering Progress Bar */}
          <div className="relative mt-4 h-1 w-48 overflow-hidden rounded-full bg-white/10">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full w-24 rounded-full bg-gradient-to-r from-transparent via-[#d5b36a] to-transparent shadow-[0_0_8px_#d5b36a]"
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/**
 * Luxury Overlay Transition Loader (used during login redirection, payment processing, booking creation)
 */
export function LuxuryOverlayLoader({
  show = true,
  title = LuxuryLoaderDefaults.OVERLAY_TITLE,
  subtitle = LuxuryLoaderDefaults.OVERLAY_SUBTITLE,
  progressMessage = LuxuryLoaderDefaults.PROGRESS_MESSAGE,
}) {
  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={styles.overlayBackdrop}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={styles.overlayCard}
      >
        {/* Glow behind modal */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-[#d5b36a]/20 blur-3xl" />

        {/* Rotating Vector Emblem */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <svg className="h-full w-full animate-spin [animation-duration:5s]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(213, 179, 106, 0.2)" strokeWidth="2" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="#d5b36a"
              strokeWidth="2.5"
              strokeDasharray="70 150"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [0.92, 1.08, 0.92] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <SiddhiLogo className="h-10 w-10 drop-shadow-[0_0_12px_rgba(213,179,106,0.6)]" />
            </motion.div>
          </div>
        </div>

        <h3 className="mt-5 font-serif text-xl sm:text-2xl font-bold text-white tracking-wide">
          {title}
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm text-[#f7ebd0]/80">
          {subtitle}
        </p>

        {/* Live Status indicator pill */}
        <div className={styles.statusPill}>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="truncate">{progressMessage}</span>
        </div>

        {/* Animated Progress Bar */}
        <div className="relative mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#d5b36a] to-emerald-400 shadow-[0_0_10px_#d5b36a]"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
