export interface TourStep {
  id: string
  title: string
  description: string
  selector?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  section?: string
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to WiBill',
    description: 'This is your ISP management dashboard. Let\'s walk through the key features so you can get started quickly.',
    section: 'overview',
  },
  {
    id: 'sidebar',
    title: 'Navigation Sidebar',
    description: 'Use the sidebar to navigate between sections. It\'s organized into Overview, Billing, and Config groups. You can collapse it by clicking the chevron.',
    selector: '.desktop-sidebar',
    position: 'right',
    section: 'overview',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Your daily snapshot. See today\'s revenue, active sessions, recent payments, and quick actions — all at a glance.',
    selector: '[data-nav="/dashboard"]',
    position: 'right',
    section: 'overview',
  },
  {
    id: 'network',
    title: 'Network Monitoring',
    description: 'Track your hotspot health. View connected devices, router status, bandwidth usage, and the last time your router synced.',
    selector: '[data-nav="/dashboard/network"]',
    position: 'right',
    section: 'overview',
  },
  {
    id: 'sessions',
    title: 'Active Sessions',
    description: 'See who\'s currently online. View session details, data usage, remaining time, and manage individual sessions — extend, suspend, or disconnect users.',
    selector: '[data-nav="/dashboard/sessions"]',
    position: 'right',
    section: 'billing',
  },
  {
    id: 'vouchers',
    title: 'Voucher Management',
    description: 'Create and manage access codes. Generate batches, copy codes, void unused ones, and track which vouchers have been redeemed. Right-click any code for quick actions.',
    selector: '[data-nav="/dashboard/vouchers"]',
    position: 'right',
    section: 'billing',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'View all payment history. Track M-Pesa transactions, voucher purchases, and manual adjustments with full audit trails.',
    selector: '[data-nav="/dashboard/transactions"]',
    position: 'right',
    section: 'billing',
  },
  {
    id: 'packages',
    title: 'Packages & Plans',
    description: 'Define your internet packages — set durations, prices, speed limits, and data caps. These appear on your customer portal for purchase.',
    selector: '[data-nav="/dashboard/packages"]',
    position: 'right',
    section: 'config',
  },
  {
    id: 'mikrotik',
    title: 'MikroTik Router',
    description: 'Connect your MikroTik hotspot router. Configure the bridge URL, router IP, and hotspot settings. This is how WiBill controls internet access.',
    selector: '[data-nav="/dashboard/mikrotik"]',
    position: 'right',
    section: 'config',
  },
  {
    id: 'mpesa',
    title: 'M-Pesa Integration',
    description: 'Set up Lipa na M-Pesa for automated payments. Configure STK push, Paybill credentials, and payment callbacks so customers can pay from their phones.',
    selector: '[data-nav="/dashboard/mpesa"]',
    position: 'right',
    section: 'config',
  },
  {
    id: 'portal-design',
    title: 'Portal Design',
    description: 'Customize your customer-facing hotspot portal. Choose a template, set your logo, colors, and sticker image. This is what your users see when they connect to WiFi.',
    selector: '[data-nav="/dashboard/wizard"]',
    position: 'right',
    section: 'config',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Manage your account, notification preferences, and billing details. Update your ISP name, email, and portal URL from here.',
    selector: '[data-nav="/dashboard/settings"]',
    position: 'right',
    section: 'config',
  },
  {
    id: 'support',
    title: 'Need Help?',
    description: 'Click the Support button in the sidebar footer to contact our team or take this tour again anytime.',
    selector: '.sidebar-support-btn',
    position: 'right',
    section: 'overview',
  },
]
