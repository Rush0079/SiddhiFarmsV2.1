'use client'

/**
 * Executes Google reCAPTCHA v3 and returns token
 * Safe and non-blocking if reCAPTCHA key is not yet configured.
 */
export async function executeRecaptcha(action = 'submit') {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  if (!siteKey) {
    return null // Graceful bypass when site key is not configured
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null)

    // Load reCAPTCHA script dynamically if not already loaded
    if (!window.grecaptcha) {
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.grecaptcha && window.grecaptcha.ready) {
          window.grecaptcha.ready(() => {
            window.grecaptcha.execute(siteKey, { action }).then(resolve).catch(() => resolve(null))
          })
        } else {
          resolve(null)
        }
      }
      script.onerror = () => resolve(null)
      document.head.appendChild(script)
    } else {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(siteKey, { action }).then(resolve).catch(() => resolve(null))
      })
    }
  })
}
