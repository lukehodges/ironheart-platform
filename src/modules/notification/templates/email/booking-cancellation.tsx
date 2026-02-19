import { Text, Heading, Hr, Row, Column, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './_base-layout'

export interface BookingCancellationEmailProps {
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

export function BookingCancellationEmail(props: BookingCancellationEmailProps) {
  const { customerName, serviceName, bookingDate, bookingTime, bookingNumber, tenantName, tenantLogoUrl, tenantPhone, tenantEmail, portalUrl } = props

  return (
    <BaseLayout tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} previewText={`Your ${serviceName} booking has been cancelled`}>
      <Heading style={{ color: '#dc2626', fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>Booking Cancelled</Heading>
      <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>Hi {customerName}, your booking has been cancelled.</Text>
      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Service</Column><Column style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{serviceName}</Column></Row>
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Date</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{bookingDate}</Column></Row>
      <Row style={{ marginBottom: '0' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Reference</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{bookingNumber}</Column></Row>
      <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
      <Text style={{ color: '#374151', fontSize: '14px', margin: '0 0 16px' }}>
        If you&apos;d like to rebook, please{' '}
        {portalUrl ? <Link href={portalUrl} style={{ color: '#6366f1' }}>visit our booking page</Link> : 'contact us'}
        {' '}or get in touch:
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
export default BookingCancellationEmail
