/**
 * ============================================================================
 * NAVBAR COMPONENT — Site Navigation Bar
 * ============================================================================
 *
 * @fileoverview  Sticky navigation header for the Siddhi Farm Resort homepage.
 *                Renders the logo, desktop nav links, auth controls, mobile
 *                hamburger menu, and the promotional Flash Sale announcement bar.
 *
 * @module        components/customer/navbar
 * @author        Rushikesh Nigade
 * @design-pattern Compound Component — desktop nav, mobile drawer, and
 *                flash-sale banner composed within a single header element.
 *
 * @param {Object}   props
 * @param {Object|null} props.user         - Supabase auth user object.
 * @param {Object|null} props.profile      - User profile from `profiles` table.
 * @param {Object|null} props.flashSale    - Active flash sale config, or null.
 * @param {string}   props.saleTimeRemaining - Live countdown string for flash sale.
 * @param {Function} props.onBookingOpen   - Callback to open the booking panel.
 * @param {Function} props.onSignOut       - Callback to sign out the current user.
 * ============================================================================
 */
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Clock, LogOut, Menu, User, X, Zap } from 'lucide-react'
import SiddhiLogo from '@/components/siddhi-logo'
import { NAV_LINKS } from '@/lib/helpers/formatting'

/**
 * Navbar — Primary site navigation component.
 *
 * Renders a transparent header that overlays the hero image, with:
 * - Optional flash sale announcement bar (when a sale is active)
 * - Desktop navigation links + auth state indicators
 * - Mobile hamburger menu with slide-down animation
 *
 * @param   {Object} props - See @fileoverview for prop descriptions.
 * @returns {JSX.Element} The header element containing navigation.
 */
export default function Navbar({ user, profile, flashSale, saleTimeRemaining, onBookingOpen, onSignOut }) {
  /** @state {boolean} menuOpen - Controls mobile menu visibility */
  const [menuOpen, setMenuOpen] = useState(false)

  // ─── Derived State ──────────────────────────────────────────────────────────
  /** Check if user has admin/staff privileges to show the admin link */
  const isStaff = profile && ['staff', 'manager', 'super_admin'].includes(profile.role)

  console.log('[UI:Navbar:RENDER] Rendering navbar', { isStaff, hasFlashSale: !!flashSale, isLoggedIn: !!user })

  return (
    <header className="absolute left-0 right-0 top-0 z-20 w-full">

      {/* ─── Flash Sale Announcement Bar ──────────────────────────────────── */}
      {flashSale && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-30 overflow-hidden bg-gradient-to-r from-[#0d2a23] via-[#144237] to-[#0a231d] text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-medium shadow-md border-b border-[#d5b36a]/40"
        >
          <div className="container relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 font-bold tracking-wide">
              <motion.span
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-full bg-gradient-to-r from-[#d5b36a] to-[#c79d48] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black uppercase text-[#0d2a23] shadow-xs flex items-center gap-1 shrink-0"
              >
                <Zap size={12} className="fill-[#0d2a23] text-[#0d2a23]" />
                {flashSale.badgeText || '⚡ FLASH SALE'}
              </motion.span>
              <span className="text-[#f7ebd0] font-bold text-xs sm:text-sm">
                {flashSale.name || 'Special Promotional Offer'}:
              </span>
              <span className="text-white/85 font-medium text-xs">
                {flashSale.bannerMessage || (flashSale.discountType === 'percentage' ? `Get ${flashSale.discountValue}% OFF across stays!` : `Get ₹${flashSale.discountValue} OFF across stays!`)}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
              {saleTimeRemaining && (
                <div className="flex items-center gap-1 rounded-lg bg-black/30 border border-[#d5b36a]/30 px-2 py-0.5 font-mono text-[11px] sm:text-xs font-bold text-[#f7ebd0]">
                  <Clock size={12} />
                  <span>{saleTimeRemaining}</span>
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBookingOpen}
                className="rounded-full bg-gradient-to-r from-[#d5b36a] via-[#f3dfa8] to-[#c79d48] px-3.5 py-1 text-[11px] sm:text-xs font-extrabold text-[#0d2a23] hover:brightness-110 transition shadow-sm cursor-pointer shrink-0"
              >
                Book Now →
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Main Navigation Bar ─────────────────────────────────────────── */}
      <nav className="container">
        <div className="flex h-20 sm:h-24 items-center justify-between">

          {/* Logo */}
          <motion.a
            href="#top"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group block transition"
          >
            <SiddhiLogo variant="nav" />
          </motion.a>

          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-2 text-sm font-medium text-white/85 md:flex">
            {NAV_LINKS.map(([href, label]) => (
              <motion.a
                key={href}
                href={href}
                whileHover={{ y: -1, backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full px-4 py-1.5 text-white/85 transition-colors duration-200 hover:text-white"
              >
                {label}
              </motion.a>
            ))}
            {isStaff && (
              <motion.a
                href="/admin"
                whileHover={{ y: -1, backgroundColor: 'rgba(246, 189, 80, 0.15)' }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full px-4 py-1.5 text-[#f6bd50] font-semibold transition-colors duration-200 hover:text-white"
              >
                Admin
              </motion.a>
            )}
          </div>

          {/* Desktop Auth Controls & CTA */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white"><User size={13} /> {profile?.full_name || user.email}</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSignOut}
                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                >
                  <LogOut size={13} className="mr-1 inline" /> Sign out
                </motion.button>
              </>
            ) : (
              <motion.a
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                href="/login"
                className="rounded-full border border-white/25 px-4 py-1.5 text-xs text-white/85 hover:bg-white/10 hover:border-white/40 transition-all shadow-xs"
              >
                Sign in
              </motion.a>
            )}
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="button-light shimmer-button shadow-lg text-xs sm:text-sm font-bold"
              onClick={onBookingOpen}
            >
              Plan your visit <ArrowUpRight size={16} />
            </motion.button>
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="rounded-full border border-white/30 p-2 text-white md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle mobile menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>

        {/* ─── Mobile Slide-Down Menu ───────────────────────────────────── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="mx-4 rounded-3xl bg-[#123830]/95 backdrop-blur-xl border border-white/15 p-6 text-white shadow-2xl md:hidden"
            >
              <div className="grid gap-4 text-base font-medium">
                <a href="#stay" onClick={() => setMenuOpen(false)} className="hover:text-[#f6bd50] transition">Stay</a>
                <a href="#experiences" onClick={() => setMenuOpen(false)} className="hover:text-[#f6bd50] transition">Experiences</a>
                <a href="#story" onClick={() => setMenuOpen(false)} className="hover:text-[#f6bd50] transition">Our story</a>
                <a href="#contact" onClick={() => setMenuOpen(false)} className="hover:text-[#f6bd50] transition">Contact</a>
                {isStaff ? <a href="/admin" className="text-[#f6bd50]">Admin dashboard</a> : null}
                <div className="border-t border-white/15 pt-4 mt-2 flex flex-col gap-3">
                  {user ? (
                    <button onClick={onSignOut} className="text-left text-sm text-white/70">Sign out</button>
                  ) : (
                    <a href="/login" className="text-left text-sm text-[#f6bd50]">Sign in / Staff login</a>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); onBookingOpen() }}
                    className="button-light shimmer-button w-full justify-center text-sm font-bold mt-1"
                  >
                    Plan your visit ↗
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
