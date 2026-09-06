/**
 * @file team.service.js
 * @description API service for staff account creation, 2FA authorization, and role updates.
 */

export class TeamService {
  /**
   * Request Super Admin 2FA authorization OTP to create staff
   * @param {Object} payload
   * @returns {Promise<{ success: boolean, maskedEmail?: string, maskedPhone?: string, error?: string }>}
   */
  static async initiateAdminCreation(payload) {
    try {
      const res = await fetch('/api/admin/create-admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true, maskedEmail: data.maskedEmail, maskedPhone: data.maskedPhone }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Update user role
   * @param {string} userId
   * @param {string} role
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async updateUserRole(userId, role) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Delete user account
   * @param {string} userId
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async deleteUser(userId) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
