import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pathname = request.nextUrl.searchParams.get('pathname')

    if (!pathname) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
    }

    // Verify user has access to this photo
    const { data: photo } = await supabase
      .from('photos')
      .select('owner_id')
      .eq('blob_pathname', pathname)
      .single()

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Check if user is owner or connected viewer
    if (photo.owner_id !== user.id) {
      const { data: connection } = await supabase
        .from('connections')
        .select('id')
        .eq('owner_id', photo.owner_id)
        .eq('viewer_id', user.id)
        .single()

      if (!connection) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('Not found', { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('Error serving photo:', error)
    return NextResponse.json({ error: 'Failed to serve photo' }, { status: 500 })
  }
}
