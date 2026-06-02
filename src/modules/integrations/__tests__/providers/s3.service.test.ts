// src/modules/integrations/__tests__/providers/s3.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

import { putObject, _setS3ClientForTests } from '../../providers/s3.service'
import {
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'

const TENANT = '00000000-0000-0000-0000-000000000001'

describe('s3.service.putObject', () => {
  let sendMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env.S3_BUCKET = 'test-bucket'
    process.env.S3_REGION = 'eu-west-2'
    sendMock = vi.fn(async () => ({ ETag: '"abc123"' }))
    _setS3ClientForTests({ send: sendMock } as unknown as S3Client)
  })

  it('prefixes the key with tenants/{tenantId}/ before sending', async () => {
    const result = await putObject({
      tenantId: TENANT,
      key: 'audits/2026-05/report.pdf',
      body: Buffer.from('hello'),
      contentType: 'application/pdf',
    })

    expect(sendMock).toHaveBeenCalledOnce()
    const cmd = sendMock.mock.calls[0]?.[0] as PutObjectCommand
    expect(cmd).toBeInstanceOf(PutObjectCommand)
    expect(cmd.input.Bucket).toBe('test-bucket')
    expect(cmd.input.Key).toBe(`tenants/${TENANT}/audits/2026-05/report.pdf`)
    expect(cmd.input.ContentType).toBe('application/pdf')

    expect(result.key).toBe(`tenants/${TENANT}/audits/2026-05/report.pdf`)
    expect(result.etag).toBe('"abc123"')
    expect(result.url).toContain('test-bucket.s3.eu-west-2.amazonaws.com')
  })

  it('strips leading slashes from caller-supplied keys before prefixing', async () => {
    await putObject({
      tenantId: TENANT,
      key: '/foo/bar.txt',
      body: 'x',
    })
    const cmd = sendMock.mock.calls[0]?.[0] as PutObjectCommand
    expect(cmd.input.Key).toBe(`tenants/${TENANT}/foo/bar.txt`)
  })
})
