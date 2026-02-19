import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Hr,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface BaseLayoutProps {
  children: React.ReactNode
  tenantName: string
  tenantLogoUrl?: string
  previewText?: string
}

export function BaseLayout({ children, tenantName, tenantLogoUrl, previewText }: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        {previewText && (
          <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden', opacity: 0 }}>
            {previewText}
          </div>
        )}
      </Head>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>
          {/* Header */}
          <Section style={{ padding: '24px 0', textAlign: 'center' as const }}>
            {tenantLogoUrl ? (
              <Img src={tenantLogoUrl} alt={tenantName} width="150" height="40" style={{ objectFit: 'contain', display: 'inline-block' }} />
            ) : (
              <Text style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>{tenantName}</Text>
            )}
          </Section>

          {/* Content card */}
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 16px' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: 0 }}>
            {tenantName} · This is an automated message, please do not reply directly to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
