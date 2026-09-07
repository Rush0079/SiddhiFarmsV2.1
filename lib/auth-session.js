const JWT_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'siddhi-farm-resort-2fa-secret-salt-2026'

function bytesToBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function stringToBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToString(b64) {
  let str = b64.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return decodeURIComponent(escape(atob(str)))
}

async function computeHmacSignature(dataStr) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataStr))
  return bytesToBase64Url(new Uint8Array(sig))
}

/**
 * Creates a cryptographically signed 2FA session token using standard Web Crypto
 */
export async function create2FASessionToken({ userId, email, role }) {
  const payloadStr = JSON.stringify({
    userId,
    email,
    role,
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
    iat: Date.now(),
  })
  const payloadB64 = stringToBase64Url(payloadStr)
  const signature = await computeHmacSignature(payloadB64)
  return `${payloadB64}.${signature}`
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Verifies a 2FA session token using standard Web Crypto
 */
export async function verify2FASessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return null

  try {
    const expectedSig = await computeHmacSignature(payloadB64)
    if (!timingSafeEqualStr(signature, expectedSig)) return null

    const payload = JSON.parse(base64UrlToString(payloadB64))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
