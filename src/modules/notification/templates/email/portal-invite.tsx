import { Text, Heading, Hr, Button, Link } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './_base-layout'

export interface PortalInviteEmailProps {
  customerName: string
  tenantName: string
  tenantLogoUrl?: string
  portalUrl: string
  tenantPhone?: string
  tenantEmail?: string
}

export function PortalInviteEmail(props: PortalInviteEmailProps) {
  const { customerName, tenantName, tenantLogoUrl, portalUrl, tenantPhone, tenantEmail } = props

  return (
    <BaseLayout tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} previewText={`You've been invited to ${tenantName}'s client portal`}>
      <Heading style={{ color: '#6366f1', fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>You&apos;re Invited</Heading>
      <Text style={{ color: '#374151', fontSize: '14px', margin: '0 0 16px' }}>
        Hi {customerName}, {tenantName} has invited you to their client portal.
      </Text>
      <Text style={{ color: '#374151', fontSize: '14px', margin: '0 0 24px' }}>
        Through the portal you can view your booking history, manage upcoming appointments, and update your details.
      </Text>
      <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 24px' }} />
      <Button href={portalUrl} style={{ backgroundColor: '#6366f1', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}>Access Your Portal</Button>
      {(tenantPhone || tenantEmail) && (
        <Text style={{ color: '#6b7280', fontSize: '14px', marginTop: '24px' }}>
          Questions?{' '}
          {tenantPhone && <Link href={`tel:${tenantPhone}`} style={{ color: '#6366f1' }}>{tenantPhone}</Link>}
          {tenantPhone && tenantEmail && ' · '}
          {tenantEmail && <Link href={`mailto:${tenantEmail}`} style={{ color: '#6366f1' }}>{tenantEmail}</Link>}
        </Text>
      )}
    </BaseLayout>
  )
}
export default PortalInviteEmail
