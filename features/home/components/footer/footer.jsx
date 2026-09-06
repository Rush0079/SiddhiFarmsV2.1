'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { MapPin, Phone, Instagram } from 'lucide-react'
import SiddhiLogo from '@/components/siddhi-logo'
import { FooterDefaults } from './footer.model'
import styles from './footer.module.css'

export default function Footer() {
  return (
    <footer id="contact" className={styles.footerSection}>
      <div className={`container ${styles.footerGrid}`}>
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
            href={FooterDefaults.MAPS_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Open Google Maps location for Siddhi Farm Resort"
          >
            {FooterDefaults.LOCATION_LABEL} <MapPin size={14} className="text-[#d5b36a]" />
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
              href={FooterDefaults.PHONE_TEL}
              aria-label={`Call Siddhi Farm Resort at ${FooterDefaults.PHONE}`}
            >
              <Phone size={14} className="text-[#d5b36a]" /> {FooterDefaults.PHONE}
            </motion.a>
            <motion.a
              whileHover={{ x: 6, color: '#f6bd50' }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-[#f6bd50] transition-colors"
              href={FooterDefaults.INSTAGRAM_URL}
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
        <span>{FooterDefaults.COPYRIGHT}</span>
        <span className="text-[12px] text-white/70 font-medium tracking-wide">
          Developed &amp; Maintained by <span className="text-emerald-300 font-semibold">{FooterDefaults.DEVELOPER_NAME}</span>
        </span>
        <p className="max-w-xl text-[11px] leading-relaxed text-white/45 font-normal">
          A serene 10-acre agro-tourism &amp; luxury farm retreat nestled in the countryside near Pune. Offering private pool villas, authentic organic dining, water park adventures &amp; open-air celebration lawns.
        </p>
      </motion.div>
    </footer>
  )
}
