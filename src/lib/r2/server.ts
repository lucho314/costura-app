import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

function getEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required R2 env var: ${name}`)
  }

  return value
}

let client: S3Client | null = null

export function getR2Client() {
  if (client) return client

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${getEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
    },
  })

  return client
}

export function getR2BucketName() {
  return getEnv('R2_BUCKET')
}

export function getR2PublicUrl() {
  return getEnv('R2_PUBLIC_URL').replace(/\/$/, '')
}

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export async function uploadProductImage(params: {
  file: File
  productId: number
  userId: string
  order: number
}) {
  const { file, productId, userId, order } = params
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, '')) || 'imagen'
  const key = `productos/${userId}/${productId}/${Date.now()}-${order}-${safeName}.${extension}`

  const arrayBuffer = await file.arrayBuffer()

  await getR2Client().send(new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    Body: Buffer.from(arrayBuffer),
    ContentType: file.type || 'application/octet-stream',
  }))

  return {
    key,
    url: `${getR2PublicUrl()}/${key}`,
  }
}

export async function deleteProductImage(objectKey: string) {
  await getR2Client().send(new DeleteObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
  }))
}
