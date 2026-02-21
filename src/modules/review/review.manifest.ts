import type { ModuleManifest } from '@/shared/module-system/types'

export const reviewManifest: ModuleManifest = {
  slug: 'review',
  name: 'Reviews',
  description: 'Customer review collection, moderation, and analytics',
  icon: 'Star',
  category: 'automation',
  dependencies: ['customer', 'booking'],
  routes: [
    { path: '/admin/reviews', label: 'Reviews', permission: 'reviews:read' },
  ],
  sidebarItems: [
    { title: 'Reviews', href: '/admin/reviews', icon: 'Star', section: 'automation', permission: 'reviews:read' },
  ],
  analyticsWidgets: [
    { id: 'avg-rating', type: 'kpi', label: 'Average Rating', size: '1x1',
      dataSource: { procedure: 'review.analytics.avgRating' } },
  ],
  permissions: ['reviews:read', 'reviews:write'],
  eventsProduced: ['review/submitted'],
  eventsConsumed: ['review/request.send'],
  isCore: false,
  availability: 'standard',
  auditResources: ['review', 'review-request'],
}
