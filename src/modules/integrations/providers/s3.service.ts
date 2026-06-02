// src/modules/integrations/providers/s3.service.ts
/**
 * Thin S3 wrapper. NOT an IntegrationProvider — file storage doesn't fit
 * the webhook/event model. Other modules call these helpers directly and
 * store the returned `key` in their own jsonb fields.
 *
 * Tenant isolation: every key is auto-prefixed with `tenants/{tenantId}/`.
 *
 * Credentials: env-based by default (S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY)
 * but the SDK's default chain (IAM role, EC2 metadata, etc.) will be used
 * when those env vars are absent — fine for prod.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from '@/shared/logger'

const log = logger.child({ module: 's3.service' })

// ---------------------------------------------------------------------------
// Client + bucket resolution
// ---------------------------------------------------------------------------

let _client: S3Client | null = null

function getClient(): S3Client {
  if (_client) return _client
  const region = process.env.S3_REGION
  if (!region) throw new Error('S3_REGION is not set')

  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

  _client = new S3Client({
    region,
    // When env creds absent, SDK falls back to its default chain (IAM role etc.)
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  })
  return _client
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error('S3_BUCKET is not set')
  return bucket
}

/** Test seam — replace the cached client (and bucket via env). */
export function _setS3ClientForTests(client: S3Client | null): void {
  _client = client
}

function tenantKey(tenantId: string, key: string): string {
  const stripped = key.replace(/^\/+/, '')
  return `tenants/${tenantId}/${stripped}`
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  // Node Readable
  if (stream && typeof (stream as { on?: unknown }).on === 'function') {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      const s = stream as NodeJS.ReadableStream
      s.on('data', (chunk: Buffer | string) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      )
      s.on('end', () => resolve(Buffer.concat(chunks)))
      s.on('error', reject)
    })
  }
  // Web ReadableStream (Node 20+)
  if (stream && typeof (stream as { getReader?: unknown }).getReader === 'function') {
    const reader = (stream as ReadableStream<Uint8Array>).getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)))
  }
  if (Buffer.isBuffer(stream)) return stream
  if (stream instanceof Uint8Array) return Buffer.from(stream)
  throw new Error('s3.service.streamToBuffer: unrecognised stream type')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PutInput {
  tenantId: string
  key: string
  body: Buffer | Uint8Array | string
  contentType?: string
  metadata?: Record<string, string>
}

export interface PutResult {
  key: string // tenant-prefixed
  url: string // virtual-hosted-style URL (NOT signed)
  etag: string
}

export async function putObject(input: PutInput): Promise<PutResult> {
  const client = getClient()
  const bucket = getBucket()
  const key = tenantKey(input.tenantId, input.key)

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: input.body,
    ContentType: input.contentType,
    Metadata: input.metadata,
  })

  const res = await client.send(cmd)
  const region = process.env.S3_REGION
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`

  log.debug({ tenantId: input.tenantId, key, etag: res.ETag }, 'S3 putObject')

  return {
    key,
    url,
    etag: res.ETag ?? '',
  }
}

export interface GetResult {
  body: Buffer
  contentType: string
  metadata?: Record<string, string>
}

export async function getObject(tenantId: string, key: string): Promise<GetResult> {
  const client = getClient()
  const bucket = getBucket()
  const fullKey = tenantKey(tenantId, key)

  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: fullKey }))
  const body = await streamToBuffer(res.Body)

  return {
    body,
    contentType: res.ContentType ?? 'application/octet-stream',
    metadata: res.Metadata,
  }
}

export async function getSignedUrl(
  tenantId: string,
  key: string,
  expiresInSeconds: number,
): Promise<string> {
  const client = getClient()
  const bucket = getBucket()
  const fullKey = tenantKey(tenantId, key)

  return awsGetSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: fullKey }),
    { expiresIn: expiresInSeconds },
  )
}

export async function deleteObject(tenantId: string, key: string): Promise<void> {
  const client = getClient()
  const bucket = getBucket()
  const fullKey = tenantKey(tenantId, key)
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: fullKey }))
  log.debug({ tenantId, key: fullKey }, 'S3 deleteObject')
}

export interface ListedObject {
  key: string
  size: number
  lastModified: Date
}

export async function listObjects(tenantId: string, prefix: string): Promise<ListedObject[]> {
  const client = getClient()
  const bucket = getBucket()
  const fullPrefix = tenantKey(tenantId, prefix)

  const out: ListedObject[] = []
  let continuationToken: string | undefined

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: fullPrefix,
        ContinuationToken: continuationToken,
      }),
    )
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue
      out.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(0),
      })
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (continuationToken)

  return out
}
