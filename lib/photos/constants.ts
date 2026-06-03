// Photos are uploaded directly from the browser to Vercel Blob (bypassing the
// 4.5 MB serverless request-body limit), so we can allow much larger files.
// Vercel Blob supports up to 5 TB via multipart; 50 MB is a sane cap for photos.
export const MAX_PHOTO_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB
export const MAX_PHOTO_SIZE_LABEL = '50 MB'

// Files above this size are uploaded in parallel multipart chunks.
export const PHOTO_MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024 // 5 MB

export const ALLOWED_PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
]
