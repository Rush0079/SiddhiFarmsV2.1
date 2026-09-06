/**
 * ============================================================================
 * FOOTER COMPONENT — Site-Wide Customer Footer
 * ============================================================================
 *
 * @fileoverview  Footer component for Siddhi Farm Resort customer pages.
 *                Includes branding, location link, contact phone & Instagram,
 *                legal copyright and developer attribution.
 *
 * @module        components/customer/footer
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Instagram } from 'lucide-react'
import SiddhiLogo from '@/components/siddhi-logo'

/**
 * Footer Component
 *
 * @component
 * @description   Provides site-wide footer navigation, contact details, Google Maps
 *                location link, Instagram handle, and legal attribution.
 * @returns {JSX.Element} The rendered footer section.
 */
export default function Footer() {
  return (
    <footer id="contact" className="bg-[#102f29] pt-14 pb-4 text-white">
      <div className="container grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        {/* Brand Column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="md:col-span-2"
        >
          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="flex items-center gap-4 cursor-pointer inline-flex"
          >
            <SiddhiLogo variant="icon" className="h-14 w-14" />
            <div className="flex flex-col">
              <p className="font-serif text-3xl font-bold tracking-[0.12em] text-white">SIDDHI FARMS</p>
              <p className="text-[10px] font-semibold tracking-[0.24em] text-[#d5b36a]">FARM &amp; RESORT · PUNE</p>
            </div>
          </motion.div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
            A farm resort for slow days, full hearts and stories worth taking home.
          </p>
        </motion.div>

        {/* Location Column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="eyebrow text-[#d5b36a]">Find us</p>
          <motion.a
            whileHover={{ x: 6, color: '#f6bd50' }}
            transition={{ duration: 0.2 }}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-[#f6bd50] transition-colors"
            href="https://maps.app.goo.gl/iBiKXi45sJ99vrV69"
            target="_blank"
            rel="noreferrer"
            aria-label="Open Google Maps location for Siddhi Farm Resort"
          >
            Maharashtra, India <MapPin size={14} className="text-[#d5b36a]" />
          </motion.a>
        </motion.div>

        {/* Connect / Social Column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="eyebrow text-[#d5b36a]">Connect</p>
          <div className="mt-4 flex flex-col gap-3">
            <motion.a
              whileHover={{ x: 6, color: '#f6bd50' }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#f6bd50] transition-colors"
              href="tel:7083682768"
              aria-label="Call Siddhi Farm Resort at 7083682768"
            >
              <Phone size={14} className="text-[#d5b36a]" /> 7083682768
            </motion.a>
            <motion.a
              whileHover={{ x: 6, color: '#f6bd50' }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#f6bd50] transition-colors"
              href="https://www.instagram.com/siddhi_farm_resort"
              target="_blank"
              rel="noreferrer"
              aria-label="Visit Siddhi Farm Resort on Instagram"
            >
              <Instagram size={14} className="text-[#d5b36a]" /> Instagram
            </motion.a>
          </div>
        </motion.div>
      </div>

      {/* Attribution & Copyright */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="container mt-12 flex flex-col items-center justify-center gap-2 border-t border-white/10 pt-6 pb-6 text-center text-xs text-white/50"
      >
        <span>© 2026 Siddhi Farm Resort · All Rights Reserved · Come as you are</span>
        <span className="text-[12px] text-white/70 font-medium tracking-wide">
          Developed &amp; Maintained by <span className="text-emerald-300 font-semibold">Rushikesh Nigade</span>
        </span>
        <p className="max-w-xl text-[11px] leading-relaxed text-white/45 font-normal">
          A serene 10-acre agro-tourism &amp; luxury farm retreat nestled in the countryside near Pune. Offering private pool villas, authentic organic dining, water park adventures &amp; open-air celebration lawns.
        </p>
      </motion.div>
    </footer>
  )
}
