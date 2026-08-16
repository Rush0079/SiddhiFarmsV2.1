import './globals.css'

export const metadata = {
  title: 'Siddhi Farm Resort | Come for the green',
  description: 'A quiet countryside farm resort for stays, agro tourism and celebrations.',
}

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>
}