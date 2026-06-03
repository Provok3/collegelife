import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { createClient } from '@/lib/supabase/server'
import {
  ALLOWED_PHOTO_CONTENT_TYPES,
  MAX_PHOTO_SIZE_BYTES,
} from '@/lib/photos/constants'
import { type NextRequest, NextResponse } from 'next/server'

// Generates short-lived, scoped tokens so the browser can upload photos
// directly to Vercel Blob. The DB row is created afterwards by
// /api/photos/confirm. The blob stays private; it's served via /api/photos/file.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const supabase = await createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error('Unauthorized')
        }

        // Lock each user into their own prefix so a token can't be used to
        // write into someone else's namespace.
        if (!pathname.startsWith(`photos/${user.id}/`)) {
          throw new Error('Invalid upload path')
        }

        return {
          allowedContentTypes: ALLOWED_PHOTO_CONTENT_TYPES,
          maximumSizeInBytes: MAX_PHOTO_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id }),
        }
      },
      // The DB write happens in /api/photos/confirm so uploads also work in
      // local dev, where Vercel can't reach this webhook on localhost.
      onUploadCompleted: async () => {},
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    const status = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
