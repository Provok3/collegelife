import { put } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const caption = formData.get('caption') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to Vercel Blob (private)
    const blob = await put(`photos/${user.id}/${Date.now()}-${file.name}`, file, {
      access: 'private',
    })

    // Save to database
    const { data: photo, error } = await supabase
      .from('photos')
      .insert({
        owner_id: user.id,
        blob_pathname: blob.pathname,
        caption: caption || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    return NextResponse.json({ photo, pathname: blob.pathname })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
