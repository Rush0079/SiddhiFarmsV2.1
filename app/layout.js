import './globals.css'
import AiConcierge from '@/components/ai-concierge'
import SessionTimeout from '@/components/session-timeout'

export const metadata = {
  title: 'Siddhi Farm Resort | Come for the green',
  description: 'A quiet countryside farm resort for stays, agro tourism and celebrations.',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/siddhi-logo.jpg', type: 'image/jpeg' },
      { url: '/icon.png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/siddhi-logo.jpg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AiConcierge />
        <SessionTimeout />
      </body>
    </html>
  )
}