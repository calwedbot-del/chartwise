import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChartWise - AI-Powered Technical Analysis',
  description: 'Smart charting with auto-detected trendlines, support/resistance, and pattern recognition.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f]">{children}</body>
    </html>
  )
}
