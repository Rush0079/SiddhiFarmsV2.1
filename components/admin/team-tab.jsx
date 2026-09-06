/**
 * ============================================================================
 * TEAM TAB COMPONENT — User & Staff Roles Management
 * ============================================================================
 *
 * @fileoverview  Administer staff and manager accounts, assign operational roles,
 *                and safeguard Super Admin privileges with 2FA authorization.
 *
 * @module        components/admin/team-tab
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'
import { Plus, Users, ShieldCheck, Trash2, Loader2 } from 'lucide-react'

/**
 * TeamTab Component
 *
 * @component
 * @param {Object}   props
 * @param {Array}    props.customers      - All user records with roles.
 * @param {string}   props.rootAdminId    - Primary owner ID that cannot be deleted.
 * @param {Object}   props.newAdmin       - Form state for creating staff { name, email, password, role }.
 * @param {Function} props.setNewAdmin    - Setter for newAdmin.
 * @param {boolean}  props.creatingAdmin  - Loading indicator during 2FA challenge initiation.
 * @param {Function} props.onInitiateUser - Callback to trigger OTP generation.
 * @param {Function} props.onChangeRole   - Callback to promote/demote user role.
 * @param {Function} props.onRemoveRole   - Callback to demote user back to customer.
 * @param {Function} props.onDeleteUser   - Callback to permanently delete a user account.
 * @returns {JSX.Element}
 */
export default function TeamTab({
  customers = [],
  rootAdminId,
  newAdmin = { name: '', email: '', password: '', role: 'staff' },
  setNewAdmin,
  creatingAdmin = false,
  onInitiateUser,
  onChangeRole,
  onRemoveRole,
  onDeleteUser,
}) {
  console.log('[UI:TeamTab:RENDER] Rendering team and staff user accounts. Total:', customers.length)

  return (
    <div className="space-y-8 mt-8">
      {/* ─── Add Staff or Manager Form ──────────────────────────────────── */}
      <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-[#173d35]" />
          <p className="eyebrow">User Management</p>
        </div>
        <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Add Staff or Manager</h2>
        <p className="mt-1 text-sm text-slate-500">
          Provision authenticated accounts for resort staff or managers. The primary Super Admin account is exclusive.
        </p>

        <form onSubmit={onInitiateUser} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-semibold text-slate-700">
            Full Name *
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Email Address *
            <input
              type="email"
              required
              placeholder="staff@siddhifarm.com"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Password (10+ chars, 1 uppercase, 1 digit, 1 special) *
            <input
              type="password"
              required
              minLength={10}
              placeholder="e.g. Secret@2026!"
              value={newAdmin.password}
              onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            />
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Role *
            <select
              value={newAdmin.role}
              onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
            >
              <option value="staff">Staff (Bookings &amp; Check-ins)</option>
              <option value="manager">Manager (Pricing, Content &amp; Coupons)</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={creatingAdmin}
              className="flex h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-[#173d35] px-4 font-semibold text-white shadow-sm hover:bg-[#1f4e44] disabled:opacity-50 transition cursor-pointer"
            >
              {creatingAdmin ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {creatingAdmin ? 'Sending OTP…' : 'Add Team Member'}
            </button>
          </div>
        </form>
      </section>

      {/* ─── Registered Users & Access Permissions Table ───────────────── */}
      <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#173d35]" />
              <p className="eyebrow">Team &amp; Customers</p>
            </div>
            <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Registered Users &amp; Roles</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage permissions, promote team members, or delete accounts.
            </p>
          </div>
          <span className="rounded-full bg-[#eef4ec] px-3 py-1 text-xs font-medium text-[#173d35]">
            {customers.length} total users
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">User</th>
                <th className="pb-3 font-semibold">Email</th>
                <th className="pb-3 font-semibold">Phone</th>
                <th className="pb-3 font-semibold">Role</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2eb]">
              {customers.map((user) => {
                const isRoot = user.id === rootAdminId
                const isSuperAdmin = user.role === 'super_admin'
                return (
                  <tr
                    className="transition-colors hover:bg-[#fbfcfb]"
                    key={user.id}
                  >
                    <td className="py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#173d35]/10 text-xs font-bold text-[#173d35]">
                          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span>{user.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 font-mono text-xs">{user.email}</td>
                    <td className="py-3 text-slate-500">{user.phone || '—'}</td>
                    <td className="py-3">
                      {isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#173d35] bg-[#eef4ec] px-2.5 py-1 rounded-lg">
                          <ShieldCheck size={13} className="text-[#315d4c]" /> Super Admin (Owner)
                        </span>
                      ) : (
                        <select
                          className="m-0 w-auto rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-slate-800"
                          value={user.role}
                          onChange={(e) => onChangeRole(user.id, e.target.value)}
                        >
                          <option value="customer">Customer</option>
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {isRoot || isSuperAdmin ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md"
                          title="The primary super admin account cannot be modified"
                        >
                          <ShieldCheck size={13} /> Primary Owner
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          {user.role !== 'customer' && (
                            <button
                              onClick={() => onRemoveRole(user.id)}
                              title="Demote back to regular customer"
                              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                            >
                              Demote
                            </button>
                          )}
                          <button
                            onClick={() =>
                              onDeleteUser(user.id, user.full_name || user.email)
                            }
                            title="Permanently delete user account"
                            className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 hover:text-red-700 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
