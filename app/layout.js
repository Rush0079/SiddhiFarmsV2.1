import './globals.css'
import AiConcierge from '@/components/ai-concierge'
import SessionTimeout from '@/components/session-timeout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://siddhifarms.com'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Siddhi Farms | Luxury Resort, Private Pool Villas & Farmstay',
    template: '%s | Siddhi Farms',
  },
  description: 'Book luxury private pool villas, cozy tents, cottages, and day picnics at Siddhi Farms & Resort. Authentic farm-fresh meals, swimming pool, agro-tourism, and event celebrations.',
  keywords: [
    'Siddhi Farms',
    'Siddhi Farm Resort',
    'Siddhi Resort',
    'Farmstay near Pune',
    'Farmstay near Mumbai',
    'Private pool villa farm resort',
    'Weekend getaway resort',
    'Agro tourism resort',
    'Day picnic farm resort',
  ],
  authors: [{ name: 'Siddhi Farm Resort', url: SITE_URL }],
  creator: 'Siddhi Farm Resort',
  publisher: 'Siddhi Farm Resort',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Siddhi Farms',
    title: 'Siddhi Farms | Luxury Resort, Private Pool Villas & Nature Farmstay',
    description: 'Experience peace, private pool villas, delicious farm-fresh meals, and nature stays at Siddhi Farms & Resort.',
    images: [
      {
        url: '/siddhi-logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Siddhi Farms Resort Entrance and Villas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Siddhi Farms | Luxury Nature Resort & Private Pool Villas',
    description: 'Book your relaxing countryside stay and celebrations at Siddhi Farms & Resort.',
    images: ['/siddhi-logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/siddhi-logo.jpg', type: 'image/jpeg' },
      { url: '/icon.png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/siddhi-logo.jpg',
  },
  manifest: '/manifest.json',
}

// JSON-LD Structured Data for Google Knowledge Graph & Local SEO
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Resort',
  name: 'Siddhi Farms',
  alternateName: ['Siddhi Farm & Resort', 'Siddhi Farmstay'],
  url: SITE_URL,
  logo: `${SITE_URL}/siddhi-logo.jpg`,
  image: `${SITE_URL}/siddhi-logo.jpg`,
  description: 'A peaceful farm resort offering private pool villas, cottages, luxury tents, and authentic farm dining.',
  priceRange: '₹₹ - ₹₹₹',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Maharashtra',
    addressCountry: 'IN',
  },
  amenityFeature: [
    { '@type': 'LocationFeatureSpecification', name: 'Swimming Pool', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Private Pool Villa', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Farm Fresh Food', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Kids Play Area', value: true },
    { '@type': 'LocationFeatureSpecification', name: 'Free Parking', value: true },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        {children}
        <AiConcierge />
        <SessionTimeout />
      </body>
    </html>
  )
}