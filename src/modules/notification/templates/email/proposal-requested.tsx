import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'

export interface ProposalRequestedEmailProps {
  recipientFirstName: string
  engagementTitle: string
  clientEmail: string
  clientNotes: string | null
  engagementDetailUrl: string
}

export function ProposalRequestedEmail({
  recipientFirstName,
  engagementTitle,
  clientEmail,
  clientNotes,
  engagementDetailUrl,
}: ProposalRequestedEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{clientEmail} requested an implementation proposal — {engagementTitle}</Preview>
      <Body
        style={{
          backgroundColor: '#FAFAF7',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif',
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 16px' }}>
          {/* Header wordmark */}
          <Section style={{ paddingBottom: '24px', textAlign: 'center' as const }}>
            <Text
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#0E1013',
                margin: 0,
                letterSpacing: '0.05em',
                textTransform: 'uppercase' as const,
              }}
            >
              Ironheart
            </Text>
          </Section>

          {/* Content card */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '40px 36px',
              border: '1px solid #E5E7EB',
              marginBottom: '24px',
            }}
          >
            <Heading
              style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#0E1013',
                margin: '0 0 16px',
              }}
            >
              {recipientFirstName} — proposal requested
            </Heading>

            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 6px' }}>
              <strong>{clientEmail}</strong> has clicked the "Request implementation proposal" button
              on their audit report.
            </Text>
            <Text style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>
              Engagement: <strong>{engagementTitle}</strong>
            </Text>

            {clientNotes && (
              <Section
                style={{
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  padding: '16px 20px',
                  marginBottom: '28px',
                }}
              >
                <Text
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#9CA3AF',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    margin: '0 0 8px',
                  }}
                >
                  Client note
                </Text>
                <Text
                  style={{
                    fontSize: '14px',
                    color: '#374151',
                    lineHeight: '1.6',
                    margin: 0,
                    whiteSpace: 'pre-line' as const,
                  }}
                >
                  {clientNotes}
                </Text>
              </Section>
            )}

            <Hr style={{ borderColor: '#E5E7EB', margin: '0 0 28px' }} />

            <Button
              href={engagementDetailUrl}
              style={{
                backgroundColor: '#0E1013',
                color: '#ffffff',
                padding: '13px 28px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Open engagement
            </Button>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#E5E7EB', margin: '0 0 16px' }} />
          <Text
            style={{
              fontSize: '11px',
              color: '#9CA3AF',
              textAlign: 'center' as const,
              margin: 0,
              lineHeight: '1.5',
            }}
          >
            You committed to responding within 2 business days.
            <br />
            Ironheart Ltd · Platform notification
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ProposalRequestedEmail
