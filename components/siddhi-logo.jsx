'use client'

export default function SiddhiLogo({ className = 'h-10 w-10', alt = 'Siddhi Farm Resort Logo' }) {
  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d5b36a]/50 shadow-md ${className}`}>
      <img
        src="/siddhi-logo.jpg"
        alt={alt}
        className="h-full w-full object-cover"
        onError={(e) => {
          // If jpg fails to load, gracefully fallback to vector SVG
          e.currentTarget.src = '/logo.svg'
        }}
      />
    </div>
  )
}
