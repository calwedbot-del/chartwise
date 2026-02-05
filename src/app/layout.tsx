import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChartWise - AI-Powered Technical Analysis',
  description: 'Smart charting with auto-detected trendlines, support/resistance, and pattern recognition.',
  keywords: ['trading', 'technical analysis', 'charts', 'crypto', 'stocks', 'AI'],
  openGraph: {
    title: 'ChartWise - AI-Powered Technical Analysis',
    description: 'Smart charting with AI-powered indicators, pattern detection, and strategy backtesting.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}
