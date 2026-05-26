import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'WiBill — ISP Management',
  description: 'HonestBill ISP Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
