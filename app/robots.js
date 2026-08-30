export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://siddhifarms.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/jarvis', '/login', '/pay/', '/invoice/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
