'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { GallerySectionDefaults, getGalleryItems } from './gallery-section.model'
import styles from './gallery-section.module.css'

export default function GallerySection({ img }) {
  const items = getGalleryItems()

  return (
    <section id="gallery" className={styles.gallerySection}>
      <div className="container">
        {/* Section Header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">{GallerySectionDefaults.SUBTITLE}</p>
            <h2 className="section-title">
              {GallerySectionDefaults.TITLE_LINE1}<br /><em>{GallerySectionDefaults.TITLE_LINE2}</em>
            </h2>
          </div>
          <motion.a
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            href={GallerySectionDefaults.PDF_URL}
            target="_blank"
            rel="noreferrer"
            className="button-outline shimmer-button cursor-pointer"
          >
            {GallerySectionDefaults.CTA_TEXT} <ArrowUpRight size={16} />
          </motion.a>
        </div>

        {/* Gallery Grid */}
        <div className="gallery-grid mt-14">
          {items.map(([imageKey, label], idx) => (
            <motion.figure
              key={imageKey}
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="gallery-tile luxury-card"
            >
              <img src={img(imageKey)} alt={`${label} at Siddhi Farm Resort`} loading="lazy" />
              <figcaption>{label}</figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
