// Lightweight in-memory sliding window rate limiter
// Protects sensitive public API endpoints from bot flooding, brute-forcing, and denial-of-service

const tracker = new Map()

// Clean up stale IP records every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of tracker.entries()) {
      if (now - entry.timestamp > entry.windowMs) {
        tracker.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

/**
 * Check if a request from a client IP has exceeded the allowed limit within a time window
 * @param {string} ip - Client IP identifier
 * @param {string} action - Route/Action identifier (e.g. 'booking', 'razorpay_order')
 * @param {number} maxRequests - Max allowed requests in the window
 * @param {number} windowMs - Window duration in milliseconds (default: 60,000ms = 1 min)
 * @returns {{ allowed: boolean, remaining: number, resetInSeconds: number }}
 */
export function checkRateLimit(ip, action = 'default', maxRequests = 20, windowMs = 60 * 1000) {
  const cleanIp = String(ip || 'anonymous').trim()
  const key = `${action}:${cleanIp}`
  const now = Date.now()
  const record = tracker.get(key)

  if (!record || now - record.timestamp > windowMs) {
    tracker.set(key, { count: 1, timestamp: now, windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetInSeconds: Math.ceil(windowMs / 1000) }
  }

  if (record.count >= maxRequests) {
    const resetInSeconds = Math.max(1, Math.ceil((record.timestamp + windowMs - now) / 1000))
    return { allowed: false, remaining: 0, resetInSeconds }
  }

  record.count += 1
  const resetInSeconds = Math.max(1, Math.ceil((record.timestamp + windowMs - now) / 1000))
  return { allowed: true, remaining: maxRequests - record.count, resetInSeconds }
}

/**
 * Extract client IP from Next.js request headers
 */
export function getClientIp(request) {
  if (!request) return '127.0.0.1'
  if (request.ip) return String(request.ip).trim()
  const realIp = request.headers?.get ? request.headers.get('x-real-ip') : null
  if (realIp) return String(realIp).trim()
  const cfIp = request.headers?.get ? request.headers.get('cf-connecting-ip') : null
  if (cfIp) return String(cfIp).trim()
  const forwarded = request.headers?.get ? request.headers.get('x-forwarded-for') : null
  if (forwarded) {
    const candidate = forwarded.split(',')[0].trim()
    if (/^[a-fA-F0-9:.]+(\/\d+)?$/.test(candidate)) return candidate
  }
  return '127.0.0.1'
}
