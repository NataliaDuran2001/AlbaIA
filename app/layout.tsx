import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ChatBubble } from '@/components/assistant/chat-bubble'
import { LocaleProvider } from '@/lib/i18n/locale-context'
import { getLocale } from '@/lib/i18n/server'
import { getCurrentUser } from '@/lib/data'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AlbaIA — Formalize your business in Guatemala',
  description:
    'AlbaIA is your AI guide to formalizing a business in Guatemala. Analyze your idea, get a recommended legal structure, and follow a step-by-step roadmap to completion.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0052ff',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()])
  return (
    <html lang={locale} className={`${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>
          {children}
          {/* In-app AI assistant — only for signed-in users. */}
          {user && <ChatBubble />}
        </LocaleProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
