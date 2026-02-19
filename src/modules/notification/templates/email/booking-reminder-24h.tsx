import { Text, Heading, Hr, Row, Column, Link, Button } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './_base-layout'

export interface BookingReminder24hEmailProps {
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

export function BookingReminder24hEmail(props: BookingReminder24hEmailProps) {
  const { customerName, serviceName, bookingDate, bookingTime, bookingDuration, bookingNumber, bookingUrl, locationAddress, tenantName, tenantLogoUrl, tenantPhone, tenantEmail } = props

  return (
    <BaseLayout tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} previewText={`Reminder: Your ${serviceName} is tomorrow at ${bookingTime}`}>
      <Heading style={{ color: '#d97706', fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>Booking Reminder</Heading>
      <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>Hi {customerName}, this is a reminder that your booking is tomorrow.</Text>
      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Service</Column><Column style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{serviceName}</Column></Row>
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Date</Column><Column style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{bookingDate}</Column></Row>
      <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Time</Column><Column style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{bookingTime}</Column></Row>
      {bookingDuration && <Row style={{ marginBottom: '12px' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Duration</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{bookingDuration}</Column></Row>}
      {locationAddress && <Row style={{ marginBottom: '0' }}><Column style={{ color: '#6b7280', fontSize: '14px', width: '40%' }}>Location</Column><Column style={{ color: '#111827', fontSize: '14px' }}>{locationAddress}</Column></Row>}
      <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />
      <Button href={bookingUrl} style={{ backgroundColor: '#d97706', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}>View Booking Details</Button>
      {(tenantPhone || tenantEmail) && (
        <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '24px' }}>
          Need to cancel or reschedule?{' '}
          {tenantPhone && <Link href={`tel:${tenantPhone}`} style={{ color: '#d97706' }}>{tenantPhone}</Link>}
          {tenantPhone && tenantEmail && ' · '}
          {tenantEmail && <Link href={`mailto:${tenantEmail}`} style={{ color: '#d97706' }}>{tenantEmail}</Link>}
        </Text>
      )}
    </BaseLayout>
  )
}
export default BookingReminder24hEmail
