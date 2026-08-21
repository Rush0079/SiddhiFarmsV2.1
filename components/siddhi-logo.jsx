'use client'

export default function SiddhiLogo({
  variant = 'icon', // 'icon' | 'full' | 'nav'
  className = '',
  textColor = 'text-[#244d3d]',
  subColor = 'text-[#b77c4e]',
  animated = true,
}) {
  if (variant === 'nav') {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        {/* Animated Leaf & Sunburst Emblem */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible" fill="none">
            {/* Gentle breathing Sun Rays */}
            <g
              stroke="#e5a93c"
              strokeWidth="5.5"
              strokeLinecap="round"
              className={animated ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}
            >
              <line x1="60" y1="95" x2="88" y2="100" />
              <line x1="82" y1="58" x2="105" y2="72" />
              <line x1="116" y1="30" x2="128" y2="52" />
              <line x1="150" y1="20" x2="150" y2="46" />
              <line x1="184" y1="30" x2="172" y2="52" />
              <line x1="218" y1="58" x2="195" y2="72" />
              <line x1="240" y1="95" x2="212" y2="100" />
            </g>

            {/* Top Golden Bud */}
            <circle cx="150" cy="118" r="5" fill="#e5a93c" />

            {/* Symmetrical Green Leaf */}
            <path
              d="M150 122 C182 152 188 196 150 222 C112 196 118 152 150 122 Z"
              fill="#244d3d"
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
            />

            {/* Center Gold Vein & Stem */}
            <path
              d="M150 125 Q158 172 150 222 C146 232 139 236 118 236"
              stroke="#e5a93c"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Brand Typography */}
        <div className="flex flex-col leading-none">
          <span className="font-serif text-xl font-bold tracking-[0.14em] text-white">
            SIDDHI FARMS
          </span>
          <span className="mt-1 text-[9px] font-semibold tracking-[0.24em] text-[#d5b36a]">
            FARM &amp; RESORT · PUNE
          </span>
        </div>
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        {/* Emblem */}
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible" fill="none">
            <g
              stroke="#e5a93c"
              strokeWidth="5.5"
              strokeLinecap="round"
              className={animated ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}
            >
              <line x1="60" y1="95" x2="88" y2="100" />
              <line x1="82" y1="58" x2="105" y2="72" />
              <line x1="116" y1="30" x2="128" y2="52" />
              <line x1="150" y1="20" x2="150" y2="46" />
              <line x1="184" y1="30" x2="172" y2="52" />
              <line x1="218" y1="58" x2="195" y2="72" />
              <line x1="240" y1="95" x2="212" y2="100" />
            </g>
            <circle cx="150" cy="118" r="5" fill="#e5a93c" />
            <path
              d="M150 122 C182 152 188 196 150 222 C112 196 118 152 150 122 Z"
              fill="#244d3d"
            />
            <path
              d="M150 125 Q158 172 150 222 C146 232 139 236 118 236"
              stroke="#e5a93c"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        <h2 className={`mt-3 font-serif text-2xl font-bold tracking-[0.16em] ${textColor}`}>
          SIDDHI FARMS
        </h2>
        <p className={`mt-1 text-[10px] font-semibold tracking-[0.28em] ${subColor}`}>
          FARM &amp; RESORT · PUNE
        </p>
      </div>
    )
  }

  // Default Icon-Only Mark
  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`}>
      <svg viewBox="0 0 300 300" className="h-full w-full overflow-visible" fill="none">
        <g
          stroke="#e5a93c"
          strokeWidth="5.5"
          strokeLinecap="round"
          className={animated ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}
        >
          <line x1="60" y1="95" x2="88" y2="100" />
          <line x1="82" y1="58" x2="105" y2="72" />
          <line x1="116" y1="30" x2="128" y2="52" />
          <line x1="150" y1="20" x2="150" y2="46" />
          <line x1="184" y1="30" x2="172" y2="52" />
          <line x1="218" y1="58" x2="195" y2="72" />
          <line x1="240" y1="95" x2="212" y2="100" />
        </g>
        <circle cx="150" cy="118" r="5" fill="#e5a93c" />
        <path
          d="M150 122 C182 152 188 196 150 222 C112 196 118 152 150 122 Z"
          fill="#244d3d"
        />
        <path
          d="M150 125 Q158 172 150 222 C146 232 139 236 118 236"
          stroke="#e5a93c"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
