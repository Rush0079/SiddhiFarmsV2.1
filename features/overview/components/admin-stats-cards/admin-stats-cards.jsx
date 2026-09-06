'use client'

import React from 'react'
import { formatStatCards } from './admin-stats-cards.model'
import styles from './admin-stats-cards.module.css'

export default function AdminStatsCards({ summary = {} }) {
  const statItems = formatStatCards(summary)

  return (
    <div className={styles.statsGrid}>
      {statItems.map(({ title, value }) => (
        <div
          className={`stat-card-motion ${styles.statCard}`}
          key={title}
        >
          <p className={styles.statTitle}>{title}</p>
          <p className={styles.statValue}>{value}</p>
        </div>
      ))}
    </div>
  )
}
