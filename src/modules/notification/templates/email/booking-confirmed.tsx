import { Text, Heading, Hr, Row, Column, Link, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './_base-layout'

export interface BookingConfirmedEmailProps {
  customerName: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  bookingDuration?: string
  bookingNumber: string
  bookingUrl: string
  locationAddress?: string
  tenantName: string
  tenantLogoUrl?: string
  tenantPhone?: string
  tenantEmail?: string
}

export function BookingConfirmedEmail(props: BookingConfirmedEmailProps) {
  const { customerName, serviceName, bookingDate, bookingTime, bookingDuration, bookingNumber, bookingUrl, locationAddress, tenantName, tenantLogoUrl, tenantPhone, tenantEmail } = props

  return (
    <BaseLayout tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} previewText={`Your ${serviceName} booking is confirmed for ${bookingDate}`}>
      <Heading style={{ color: '#059669', fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>Booking Confirmed</Heading>
      <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>Hi {customerName}, your booking has been confirmed.</Text>
      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Service</Column><Column style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{serviceName}</Column></Row>
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Date</Column><Column style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{bookingDate}</Column></Row>
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Time</Column><Column style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{bookingTime}</Column></Row>
      {bookingDuration && <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Duration</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{bookingDuration}</Column></Row>}
      {locationAddress && <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Location</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{locationAddress}</Column></Row>}
      <Row style={{ marginBottom: '0' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Reference</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{bookingNumber}</Column></Row>
      <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
      <Button href={bookingUrl} style={{ backgroundColor: '#059669', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}>View Booking</Button>
      {(tenantPhone || tenantEmail) && (
        <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '24px' }}>
          Questions?{' '}
          {tenantPhone && <Link href={`tel:${tenantPhone}`} style={{ color: '#059669' }}>{tenantPhone}</Link>}
          {tenantPhone && tenantEmail && ' · '}
          {tenantEmail && <Link href={`mailto:${tenantEmail}`} style={{ color: '#059669' }}>{tenantEmail}</Link>}
        </Text>
      )}
    </BaseLayout>
  )
}
export default BookingConfirmedEmail
