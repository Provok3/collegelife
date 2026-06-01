import { del } from '@vercel/blob'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { photoId } = await request.json()

    if (!photoId) {
      return NextResponse.json({ error: 'No photo ID provided' }, { status: 400 })
    }

    // Get photo and verify ownership
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .eq('owner_id', user.id)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found or unauthorized' }, { status: 404 })
    }

    // Delete from blob storage
    try {
      await del(photo.blob_pathname)
    } catch {
      // Continue even if blob delete fails
    }

    // Delete from database (cascades to comments and reactions)
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
