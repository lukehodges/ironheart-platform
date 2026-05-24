import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'

export interface ReportPublishedEmailProps {
  recipientFirstName: string
  engagementTitle: string
  reportUrl: string
  companyName: string
}

export function ReportPublishedEmail({
  recipientFirstName,
  engagementTitle,
  reportUrl,
  companyName,
}: ReportPublishedEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your audit report for {engagementTitle} is ready to view</Preview>
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
                fontSize: '26px',
                fontWeight: '700',
                color: '#0E1013',
                margin: '0 0 8px',
              }}
            >
              Hi {recipientFirstName},
            </Heading>
            <Text style={{ fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '0 0 20px' }}>
              Your audit report for <strong>{engagementTitle}</strong> is ready. We've identified
              specific opportunities to address operational waste and accelerate growth.
            </Text>
            <Hr style={{ borderColor: '#E5E7EB', margin: '0 0 28px' }} />
            <Text style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6', margin: '0 0 28px' }}>
              The report includes our findings across five operational lenses, prioritised
              recommendations, and a phased implementation roadmap. You'll also find options to book
              a walkthrough call or request a tailored implementation proposal.
            </Text>
            <Button
              href={reportUrl}
              style={{
                backgroundColor: '#D13A1F',
                color: '#ffffff',
                padding: '13px 28px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              View your audit report
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
            Ironheart Ltd · {companyName}
            <br />
            This is an automated message. Please do not reply directly to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ReportPublishedEmail
