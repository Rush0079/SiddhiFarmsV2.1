/**
 * ============================================================================
 * ADMIN HEADER COMPONENT — Operations Center Top Navigation
 * ============================================================================
 *
 * @fileoverview  Sticky top header for the Siddhi Admin Operations Center.
 *                Displays resort branding, current administrator role badge,
 *                live customer site return link, and sign-out action.
 *
 * @module        components/admin/admin-header
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'
import { ArrowLeft, LogOut } from 'lucide-react'
import SiddhiLogo from '@/components/siddhi-logo'

/**
 * AdminHeader Component
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.profile - Current authenticated staff profile.
 * @param {Function} props.onSignOut - Callback to sign out the user.
 * @returns {JSX.Element}
 */
export default function AdminHeader({ profile, onSignOut }) {
  console.log('[UI:AdminHeader:RENDER] Mounting header for role:', profile?.role)

  return (
    <header className="border-b border-[#dbe4d7] bg-[#173d35] text-white">
      <div className="container flex min-h-20 items-center justify-between">
        {/* Brand & Role Tag */}
        <div className="flex items-center gap-3">
          <SiddhiLogo className="h-10 w-10" />
          <div>
            <p className="font-serif text-xl">Siddhi Admin</p>
            <p className="text-[10px] uppercase tracking-[.18em] text-white/55">
              Operations centre · {profile?.role?.replace('_', ' ') || 'staff'}
            </p>
          </div>
        </div>

        {/* Navigation & Sign Out */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={15} /> Site
          </a>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20 transition-all cursor-pointer"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
