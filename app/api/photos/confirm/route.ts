import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

// Records a photo in the database after the browser has uploaded it directly
// to Vercel Blob. The blob is already stored; here we just create the row that
// maps it to its owner (and gates access in /api/photos/file).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pathname, caption } = (await request.json()) as {
      pathname?: unknown
      caption?: unknown
    }

    if (typeof pathname !== 'string' || !pathname) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
    }

    // Only allow confirming blobs uploaded under the caller's own prefix.
    if (!pathname.startsWith(`photos/${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 403 })
    }

    const { data: photo, error } = await supabase
      .from('photos')
      .insert({
        owner_id: user.id,
        blob_pathname: pathname,
        caption: typeof caption === 'string' && caption ? caption : null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    return NextResponse.json({ photo, pathname })
  } catch (error) {
    console.error('Confirm error:', error)
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
  }
}
