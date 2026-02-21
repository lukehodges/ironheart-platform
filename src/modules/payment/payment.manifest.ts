import type { ModuleManifest } from '@/shared/module-system/types'

export const paymentManifest: ModuleManifest = {
  slug: 'payment',
  name: 'Payments',
  description: 'Invoice generation, payment processing, and financial tracking',
  icon: 'CreditCard',
  category: 'finance',
  dependencies: ['booking'],
  routes: [
    { path: '/admin/payments', label: 'Payments', permission: 'payments:read' },
    { path: '/admin/invoices', label: 'Invoices', permission: 'payments:read' },
  ],
  sidebarItems: [
    { title: 'Payments', href: '/admin/payments', icon: 'CreditCard', section: 'finance', permission: 'payments:read' },
    { title: 'Invoices', href: '/admin/invoices', icon: 'Receipt', section: 'finance', permission: 'payments:read' },
  ],
  analyticsWidgets: [
    { id: 'revenue-kpi', type: 'kpi', label: 'Revenue', size: '1x1',
      dataSource: { procedure: 'payment.analytics.revenue' } },
    { id: 'revenue-trend', type: 'line', label: 'Revenue Trend', size: '2x1',
      dataSource: { procedure: 'payment.analytics.revenueTrend' } },
    { id: 'payment-methods', type: 'donut', label: 'Payment Methods', size: '1x1',
      dataSource: { procedure: 'payment.analytics.methodBreakdown' } },
  ],
  permissions: ['payments:read', 'payments:write', 'payments:refund'],
  eventsProduced: ['payment/completed', 'payment/refunded', 'invoice/created'],
  eventsConsumed: ['booking/completed'],
  isCore: false,
  availability: 'standard',
  settingsTab: { slug: 'payment-settings', label: 'Payment Settings', icon: 'CreditCard', section: 'module' },
  auditResources: ['payment', 'invoice', 'refund'],
}
