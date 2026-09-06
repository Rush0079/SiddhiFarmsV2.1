/**
 * ============================================================================
 * GALLERY SECTION COMPONENT — Photo Showcase Grid
 * ============================================================================
 *
 * @fileoverview  Six-image masonry gallery showcasing resort areas
 *                (farmhouse, villa, pool, restaurant, lawn, kids area).
 *                Includes a CTA link to the full photo story PDF.
 *
 * @module        components/customer/gallery-section
 * @author        Rushikesh Nigade
 * @design-pattern Presentational Component — stateless, data-driven.
 *
 * @param {Object}   props
 * @param {Function} props.img - Image resolver function: (key) => url.
 * ============================================================================
 */
'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { GALLERY_ITEMS } from '@/lib/helpers/formatting'

/**
 * GallerySection — Animated image grid with hover effects and lazy loading.
 *
 * @param   {Object} props - See @fileoverview for prop descriptions.
 * @returns {JSX.Element} The gallery section element.
 */
export default function GallerySection({ img }) {
  console.log('[UI:GallerySection:RENDER] Rendering', GALLERY_ITEMS.length, 'gallery images')

  return (
    <section id="gallery" className="bg-[#f0f3ec] py-24 sm:py-32">
      <div className="container">
        {/* Section Header */}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">A glimpse of Siddhi</p>
            <h2 className="section-title">
              The place is<br /><em>the experience.</em>
            </h2>
          </div>
          <motion.a
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            href="https://customer-assets-wrfwihn1.emergentagent.net/job_siddhi-farm-dev/artifacts/wgys6sb0_Siddhi%20Farm.pdf"
            target="_blank"
            rel="noreferrer"
            className="button-outline shimmer-button"
          >
            View full photo story <ArrowUpRight size={16} />
          </motion.a>
        </div>

        {/* Gallery Grid */}
        <div className="gallery-grid mt-14">
          {GALLERY_ITEMS.map(([imageKey, label], idx) => (
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
