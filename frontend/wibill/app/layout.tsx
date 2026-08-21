import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { ToastProvider } from '@/context/ToastContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ACCENT_INLINE_SCRIPT } from '@/lib/theme'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'WiBill — ISP Management',
  description: 'HonestBill ISP Dashboard',
  icons: {
    icon: '/logos/wibill-wb-monogram-192.png',
    apple: '/logos/wibill-wb-monogram-180.png',
  },
  openGraph: {
    title: 'WiBill — ISP Management',
    description: 'HonestBill ISP Dashboard',
    images: ['/logos/wibill-wordmark-badge-2048.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* Apply saved accent before first paint so the theme persists across
            logins/logouts and on every route without flashing the default gold. */}
        <script dangerouslySetInnerHTML={{ __html: ACCENT_INLINE_SCRIPT }} />
      </head>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}