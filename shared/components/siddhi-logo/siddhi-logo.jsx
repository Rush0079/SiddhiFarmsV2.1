'use client'

import styles from './siddhi-logo.module.css'
import { SiddhiLogoVariants, SiddhiLogoBrand } from './siddhi-logo.model'

export default function SiddhiLogo({
  variant = SiddhiLogoVariants.ICON,
  className = '',
  animated = true,
}) {
  if (variant === SiddhiLogoVariants.NAV) {
    return (
      <div className={`${styles.navWrapper} ${className}`}>
        {/* Crisp Vector Emblem */}
        <div className={styles.emblemNav}>
          <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible" fill="none">
            {/* Radiant Glowing Sun Rays */}
            <g
              stroke="#f6bd50"
              strokeWidth="7"
              strokeLinecap="round"
              className={animated ? 'animate-[pulse_2.5s_ease-in-out_infinite]' : ''}
              style={{ filter: 'drop-shadow(0 0 4px rgba(246, 189, 80, 0.6))' }}
            >
              <line x1="55" y1="95" x2="88" y2="100" />
              <line x1="78" y1="55" x2="105" y2="72" />
              <line x1="114" y1="24" x2="128" y2="52" />
              <line x1="150" y1="12" x2="150" y2="44" />
              <line x1="186" y1="24" x2="172" y2="52" />
              <line x1="222" y1="55" x2="195" y2="72" />
              <line x1="245" y1="95" x2="212" y2="100" />
            </g>

            {/* Top Golden Bud */}
            <circle cx="150" cy="116" r="6.5" fill="#f6bd50" />

            {/* Vibrant Emerald & Forest Green Leaf with Bright Outline */}
            <path
              d="M150 120 C186 152 192 200 150 228 C108 200 114 152 150 120 Z"
              fill="url(#navLeafGradient)"
              stroke="#8cd8b0"
              strokeWidth="2.5"
            />

            {/* Center Gold Vein & Stem */}
            <path
              d="M150 124 Q160 176 150 228 C145 240 136 244 112 244"
              stroke="#f6bd50"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
            />

            <defs>
              <linearGradient id="navLeafGradient" x1="150" y1="120" x2="150" y2="228" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#40916c" />
                <stop offset="50%" stopColor="#2d6a4f" />
                <stop offset="100%" stopColor="#1b4332" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Brand Typography */}
        <div className="flex flex-col leading-none pr-0.5 sm:pr-1">
          <span className="font-serif text-lg sm:text-xl font-bold tracking-[0.14em] text-white drop-shadow-sm">
            {SiddhiLogoBrand.NAME}
          </span>
          <span className="mt-1 text-[9px] sm:text-[10px] font-bold tracking-[0.26em] text-[#f6bd50]">
            {SiddhiLogoBrand.TAGLINE}
          </span>
        </div>
      </div>
    )
  }

  if (variant === SiddhiLogoVariants.FULL) {
    return (
      <div className={`${styles.fullWrapper} ${className}`}>
        {/* Emblem on white/translucent luxury badge */}
        <div className={styles.fullEmblemBadge}>
          <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible" fill="none">
            <g
              stroke="#f6bd50"
              strokeWidth="6.5"
              strokeLinecap="round"
              className={animated ? 'animate-[pulse_2.5s_ease-in-out_infinite]' : ''}
              style={{ filter: 'drop-shadow(0 0 6px rgba(246, 189, 80, 0.6))' }}
            >
              <line x1="55" y1="95" x2="88" y2="100" />
              <line x1="78" y1="55" x2="105" y2="72" />
              <line x1="114" y1="24" x2="128" y2="52" />
              <line x1="150" y1="12" x2="150" y2="44" />
              <line x1="186" y1="24" x2="172" y2="52" />
              <line x1="222" y1="55" x2="195" y2="72" />
              <line x1="245" y1="95" x2="212" y2="100" />
            </g>
            <circle cx="150" cy="116" r="6.5" fill="#f6bd50" />
            <path
              d="M150 120 C186 152 192 200 150 228 C108 200 114 152 150 120 Z"
              fill="url(#fullLeafGradient)"
              stroke="#74c69d"
              strokeWidth="2.5"
            />
            <path
              d="M150 124 Q160 176 150 228 C145 240 136 244 112 244"
              stroke="#f6bd50"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
            />
            <defs>
              <linearGradient id="fullLeafGradient" x1="150" y1="120" x2="150" y2="228" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#52b788" />
                <stop offset="100%" stopColor="#1b4332" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="mt-4 font-serif text-2xl font-bold tracking-[0.16em] text-white">
          {SiddhiLogoBrand.NAME}
        </h2>
        <p className="mt-1 text-[10.5px] font-bold tracking-[0.28em] text-[#f6bd50]">
          {SiddhiLogoBrand.TAGLINE}
        </p>
      </div>
    )
  }

  // Default Icon-Only Mark
  return (
    <div className={`${styles.iconWrapper} ${className}`}>
      <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible" fill="none">
        <g
          stroke="#f6bd50"
          strokeWidth="6"
          strokeLinecap="round"
          className={animated ? 'animate-[pulse_2.5s_ease-in-out_infinite]' : ''}
          style={{ filter: 'drop-shadow(0 0 5px rgba(246, 189, 80, 0.5))' }}
        >
          <line x1="55" y1="95" x2="88" y2="100" />
          <line x1="78" y1="55" x2="105" y2="72" />
          <line x1="114" y1="24" x2="128" y2="52" />
          <line x1="150" y1="12" x2="150" y2="44" />
          <line x1="186" y1="24" x2="172" y2="52" />
          <line x1="222" y1="55" x2="195" y2="72" />
          <line x1="245" y1="95" x2="212" y2="100" />
        </g>
        <circle cx="150" cy="116" r="6" fill="#f6bd50" />
        <path
          d="M150 120 C186 152 192 200 150 228 C108 200 114 152 150 120 Z"
          fill="#2d6a4f"
          stroke="#74c69d"
          strokeWidth="2.5"
        />
        <path
          d="M150 124 Q160 176 150 228 C145 240 136 244 112 244"
          stroke="#f6bd50"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
