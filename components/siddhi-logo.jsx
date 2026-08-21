'use client'

export default function SiddhiLogo({
  variant = 'icon', // 'icon' | 'full' | 'nav'
  className = '',
  animated = true,
}) {
  if (variant === 'nav') {
    return (
      <div className={`flex items-center gap-3.5 select-none rounded-2xl bg-white/[0.08] backdrop-blur-md px-3.5 py-2 border border-[#e5a93c]/35 shadow-lg transition-all duration-300 hover:bg-white/[0.14] hover:border-[#e5a93c]/60 group ${className}`}>
        {/* Crisp High-Contrast Emblem */}
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f2e26]/90 p-1 border border-[#e5a93c]/40 shadow-inner">
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
              stroke="#74c69d"
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
        <div className="flex flex-col leading-none pr-1">
          <span className="font-serif text-lg font-bold tracking-[0.14em] text-white drop-shadow-sm">
            SIDDHI FARMS
          </span>
          <span className="mt-1 text-[9.5px] font-bold tracking-[0.26em] text-[#f6bd50]">
            FARM &amp; RESORT · PUNE
          </span>
        </div>
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        {/* Emblem on white/translucent luxury badge */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/[0.08] backdrop-blur-md p-3 border border-[#f6bd50]/40 shadow-xl">
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
          SIDDHI FARMS
        </h2>
        <p className="mt-1 text-[10.5px] font-bold tracking-[0.28em] text-[#f6bd50]">
          FARM &amp; RESORT · PUNE
        </p>
      </div>
    )
  }

  // Default Icon-Only Mark with High Contrast
  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
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
