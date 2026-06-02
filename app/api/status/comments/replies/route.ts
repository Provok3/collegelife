import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { commentId, statusId, content } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!commentId || !statusId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Authorization: the parent comment must exist on a status the user can see
    // (SELECT RLS enforces visibility), and its status must match statusId so a
    // reply can't be attached across scopes.
    const { data: parentComment } = await supabase
      .from('status_comments')
      .select('id, status_id')
      .eq('id', commentId)
      .single()

    if (!parentComment || parentComment.status_id !== statusId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Insert reply as a comment with parent_id set to the comment being replied to
    const { data, error } = await supabase
      .from('status_comments')
      .insert({
        status_id: statusId,
        user_id: user.id,
        content: content.trim(),
        parent_id: commentId,
      })
      .select(`
        id,
        content,
        created_at,
        parent_id,
        user:profiles!status_comments_user_id_fkey(id, display_name, avatar_url)
      `)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error adding status reply:', error)
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const replyId = searchParams.get('id')

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user owns the reply (which is just a comment with parent_id)
    const { data: reply } = await supabase
      .from('status_comments')
      .select('user_id, parent_id')
      .eq('id', replyId)
      .single()

    if (!reply || reply.user_id !== user.id || !reply.parent_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('status_comments')
      .delete()
      .eq('id', replyId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting status reply:', error)
    return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 })
  }
}
