import { Text, Heading, Hr, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './_base-layout'

export interface ReviewRequestEmailProps {
  customerName: string
  serviceName: string
  bookingDate: string
  staffName?: string
  reviewUrl: string
  tenantName: string
  tenantLogoUrl?: string
}

export function ReviewRequestEmail(props: ReviewRequestEmailProps) {
  const { customerName, serviceName, bookingDate, staffName, reviewUrl, tenantName, tenantLogoUrl } = props

  return (
    <BaseLayout tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} previewText={`How was your ${serviceName} experience?`}>
      <Heading style={{ color: '#6366f1', fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>How did we do?</Heading>
      <Text style={{ color: '#374151', fontSize: '14px', margin: '0 0 16px' }}>
        Hi {customerName}, we hope you enjoyed your {serviceName} on {bookingDate}
        {staffName ? ` with ${staffName}` : ''}.
      </Text>
      <Text style={{ color: '#374151', fontSize: '14px', margin: '0 0 24px' }}>
        We&apos;d love to hear your feedback. It takes less than a minute and helps us improve.
      </Text>
      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />
      <Button href={reviewUrl} style={{ backgroundColor: '#6366f1', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}>Leave a Review</Button>
      <Text style={{ color: '#9ca3af', fontSize: '12px', marginTop: '24px' }}>
        This review link is unique to your booking and expires in 30 days.
      </Text>
    </BaseLayout>
  )
}
export default ReviewRequestEmail
