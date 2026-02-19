import { Text, Heading, Hr, Row, Column, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './_base-layout'

export interface BookingRejectedEmailProps {
  customerName: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  bookingNumber: string
  tenantName: string
  tenantLogoUrl?: string
  tenantPhone?: string
  tenantEmail?: string
  portalUrl?: string
}

export function BookingRejectedEmail(props: BookingRejectedEmailProps) {
  const { customerName, serviceName, bookingDate, bookingTime, bookingNumber, tenantName, tenantLogoUrl, tenantPhone, tenantEmail, portalUrl } = props

  return (
    <BaseLayout tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} previewText={`Update regarding your ${serviceName} booking request`}>
      <Heading style={{ color: '#dc2626', fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>Booking Request Declined</Heading>
      <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>Hi {customerName}, unfortunately we were unable to approve your booking request at this time.</Text>
      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Service</Column><Column style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{serviceName}</Column></Row>
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Requested Date</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{bookingDate}</Column></Row>
      <Row style={{ marginBottom: '0' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Reference</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{bookingNumber}</Column></Row>
      <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
      <Text style={{ color: '#374151', fontSize: '14px', margin: '0 0 8px' }}>
        Please{' '}
        {portalUrl ? <Link href={portalUrl} style={{ color: '#6366f1' }}>try another date or time</Link> : 'contact us to explore alternatives'}
        {'.'}
      </Text>
      {(tenantPhone || tenantEmail) && (
        <Text style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
          {tenantPhone && <Link href={`tel:${tenantPhone}`} style={{ color: '#6366f1' }}>{tenantPhone}</Link>}
          {tenantPhone && tenantEmail && ' · '}
          {tenantEmail && <Link href={`mailto:${tenantEmail}`} style={{ color: '#6366f1' }}>{tenantEmail}</Link>}
        </Text>
      )}
    </BaseLayout>
  )
}
export default BookingRejectedEmail
