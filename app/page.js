/**
 * ============================================================================
 * SIDDHI FARM RESORT — MAIN LANDING PAGE ORCHESTRATOR
 * ============================================================================
 *
 * @fileoverview  The root customer-facing page component for Siddhi Farm Resort.
 *                Implements a component-based orchestrator architecture:
 *                - Loads and synchronizes Supabase authentication and user profile state.
 *                - Fetches real-time service pricing and flash sale configurations.
 *                - Mounts modular, documented presentational and container components:
 *                    1. Navbar (Sticky header with auth state & mobile drawer)
 *                    2. HeroSection (Visual entry & primary CTA)
 *                    3. StatsBar (Key property metrics)
 *                    4. StorySection (Philosophy & feature highlights)
 *                    5. ExperiencesGrid (Data-driven service offerings)
 *                    6. StayCards (Accommodation showcase with pricing)
 *                    7. FlashSaleShowcase (Promotional banner with live countdown)
 *                    8. AdventureSection (Upcoming attractions teaser)
 *                    9. GallerySection (Photo showcase)
 *                    10. Footer (Branding, contact & legal attribution)
 *                    11. BookingForm (Modal reservation container)
 *
 * @module        app/page
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 * @see           DESIGN_PATTERNS.md for architecture and design patterns
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import Script from 'next/script'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { siteImage } from '@/lib/siteImages'
import { LuxuryOverlayLoader } from '@/components/luxury-loader'

// ─── Customer Components (Component-Based Architecture) ─────────────────────
import Navbar from '@/components/customer/navbar'
import HeroSection from '@/components/customer/hero-section'
import StatsBar from '@/components/customer/stats-bar'
import StorySection from '@/components/customer/story-section'
import ExperiencesGrid from '@/components/customer/experiences-grid'
import StayCards from '@/components/customer/stay-cards'
import FlashSaleShowcase from '@/components/customer/flash-sale-showcase'
import AdventureSection from '@/components/customer/adventure-section'
import GallerySection from '@/components/customer/gallery-section'
import Footer from '@/components/customer/footer'
import BookingForm from '@/components/customer/booking-form'

/**
 * HomePage — Root Customer Experience Component
 *
 * @component
 * @returns {JSX.Element} The rendered landing page.
 */
export default function HomePage() {
  // ─── State Management ─────────────────────────────────────────────────────
  /** @state {boolean} bookingOpen - Controls booking modal visibility */
  const [bookingOpen, setBookingOpen] = useState(false)

  /** @state {Object|null} user - Authenticated Supabase user object */
  const [user, setUser] = useState(null)

  /** @state {Object|null} profile - User record from `profiles` table */
  const [profile, setProfile] = useState(null)

  /** @state {Object} pricing - Current rate-card pricing object */
  const [pricing, setPricing] = useState({})

  /** @state {Object} images - CMS image slot overrides from /api/images */
  const [images, setImages] = useState({})

  /** @state {Object|null} flashSale - Active promotional sale config */
  const [flashSale, setFlashSale] = useState(null)

  /** @state {string} saleTimeRemaining - Formatted countdown timer string */
  const [saleTimeRemaining, setSaleTimeRemaining] = useState('')

  /** @state {boolean} isAuthLoading - Loader flag for sign-out or session changes */
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  /** @memo supabase - Supabase browser client singleton */
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  /** Image resolver helper merging dynamic CMS overrides with local fallback assets */
  const img = (key) => siteImage(images, key)

  // ─── Authentication & Profile Sync ────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    console.log('[UI:HomePage:AUTH] Initializing Supabase auth listener')

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        fetchUserProfile(currentUser.id)
      }
    })

    // Listen for auth state mutations (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      console.log(`[UI:HomePage:AUTH] Event: ${event}`)
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        fetchUserProfile(currentUser.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  /**
   * Fetches user profile data from Supabase `profiles` table.
   *
   * @async
   * @param {string} userId - Supabase auth UID.
   */
  async function fetchUserProfile(userId) {
    try {
      console.log(`[UI:HomePage:PROFILE] Fetching profile for user: ${userId}`)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.warn('[UI:HomePage:PROFILE:WARN] Could not load profile:', err.message)
    }
  }

  // ─── Pricing, Images & Flash Sale Ingestion ──────────────────────────────
  useEffect(() => {
    console.log('[UI:HomePage:DATA] Loading pricing, images & flash-sale data')

    // Ingest pricing
    fetch('/api/pricing')
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed to load pricing')))
      .then((data) => {
        console.log('[UI:HomePage:DATA] Pricing loaded successfully', data)
        setPricing(data)
      })
      .catch((err) => console.error('[UI:HomePage:DATA:ERROR] Pricing error:', err))

    // Ingest image CMS overrides
    fetch('/api/images')
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        console.log('[UI:HomePage:DATA] Site images loaded')
        setImages(data || {})
      })
      .catch((err) => console.warn('[UI:HomePage:DATA:WARN] Images error:', err))

    // Ingest active flash sale
    fetch(`/api/flash-sale?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.active && data?.sale) {
          console.log('[UI:HomePage:DATA] Active flash sale loaded:', data.sale.name)
          setFlashSale(data.sale)
        } else {
          setFlashSale(null)
        }
      })
      .catch((err) => console.warn('[UI:HomePage:DATA:WARN] Flash sale error:', err))
  }, [])

  // ─── Flash Sale Countdown Loop ────────────────────────────────────────────
  useEffect(() => {
    const target = flashSale?.isTeaser
      ? (flashSale.startDateTimeIso || flashSale.startDateIso || flashSale.startDateTime)
      : (flashSale?.endDateTimeIso || flashSale?.endDateIso || flashSale?.endDateTime || flashSale?.endDate)

    if (!flashSale || !target) return

    const updateTimer = () => {
      const diff = new Date(target).getTime() - Date.now()
      if (diff <= 0) {
        setSaleTimeRemaining(flashSale?.isTeaser ? 'STARTING NOW' : 'EXPIRED')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setSaleTimeRemaining(
        days > 0
          ? `${days}d ${hours}h ${minutes}m`
          : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [flashSale])

  // ─── User Actions ─────────────────────────────────────────────────────────
  /**
   * Handles user sign-out with feedback overlay loader.
   *
   * @async
   */
  async function handleSignOut() {
    try {
      console.log('[UI:HomePage:AUTH] Signing out user')
      setIsAuthLoading(true)
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {})
      await supabase.auth.signOut()
      try {
        localStorage.removeItem('siddhi_user_role')
        sessionStorage.clear()
        document.cookie = 'siddhi_2fa_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0'
      } catch {}
      setUser(null)
      setProfile(null)
    } catch (err) {
      console.error('[UI:HomePage:AUTH:ERROR] Sign out failed:', err)
    } finally {
      setIsAuthLoading(false)
    }
  }

  return (
    <>
      {/* Google reCAPTCHA v3 script tag */}
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      )}

      {/* Auth state transition overlay loader */}
      {isAuthLoading && (
        <LuxuryOverlayLoader
          show={isAuthLoading}
          title="Signing Out..."
          subtitle="Clearing your session securely"
        />
      )}

      <main className="relative min-h-screen bg-[#fcfbf7] text-[#173d35] selection:bg-[#d5b36a]/30">
        {/* 1. Header Navigation Bar */}
        <Navbar
          user={user}
          profile={profile}
          flashSale={flashSale}
          saleTimeRemaining={saleTimeRemaining}
          onBookingOpen={() => setBookingOpen(true)}
          onSignOut={handleSignOut}
        />

        {/* 2. Hero Section */}
        <HeroSection
          heroImage={img('homeHero')}
          onBookingOpen={() => setBookingOpen(true)}
        />

        {/* 3. Property Highlights Stats Bar */}
        <StatsBar />

        {/* 4. Brand Story Section */}
        <StorySection />

        {/* 5. Service Offerings Grid */}
        <ExperiencesGrid pricing={pricing} />

        {/* 6. Accommodation Stay Cards */}
        <StayCards
          pricing={pricing}
          img={img}
          onBookingOpen={() => setBookingOpen(true)}
        />

        {/* 7. Promotional Flash Sale Showcase Banner */}
        {flashSale && (
          <FlashSaleShowcase
            flashSale={flashSale}
            timeLeft={saleTimeRemaining}
            onBook={() => setBookingOpen(true)}
          />
        )}

        {/* 8. Coming Soon Adventure Teaser */}
        <AdventureSection img={img} />

        {/* 9. Photo Gallery Showcase Grid */}
        <GallerySection img={img} />

        {/* 10. Site Footer & Developer Attribution */}
        <Footer />

        {/* 11. Interactive Multi-Step Reservation Modal */}
        {bookingOpen && (
          <BookingForm
            pricing={pricing}
            user={user}
            flashSale={flashSale}
            onClose={() => setBookingOpen(false)}
          />
        )}
      </main>
    </>
  )
}
