/**
 * Google reCAPTCHA v3 Server-Side Verification Helper
 */
export async function verifyRecaptcha(token, expectedAction = '') {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  // If secret key is not set, allow in development/staging mode with a warning
  if (!secretKey) {
    return { success: true, score: 1.0, isBypassed: true }
  }

  if (!token) {
    return { success: false, error: 'reCAPTCHA token is missing. Please refresh and try again.' }
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    })

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data = await response.json()

    if (!data.success) {
      console.warn('[reCAPTCHA Verification Failed]', data['error-codes'])
      return { success: false, error: 'Bot verification failed. Please try again.' }
    }

    // Google reCAPTCHA v3 score ranges from 0.0 (bot) to 1.0 (human)
    const score = typeof data.score === 'number' ? data.score : 1.0
    if (score < 0.4) {
      console.warn(`[reCAPTCHA Low Score] Suspicious request rejected with score ${score}`)
      return { success: false, score, error: 'Security verification failed due to suspicious activity.' }
    }

    return { success: true, score, action: data.action }
  } catch (err) {
    console.error('[reCAPTCHA Exception]', err.message)
    // On unexpected network failure to Google, allow genuine users to proceed
    return { success: true, score: 0.5, error: err.message }
  }
}
