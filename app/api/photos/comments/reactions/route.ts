import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { commentId, emoji } = await request.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!commentId || !emoji) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Toggle reaction
    const { data: existingReaction } = await supabase
      .from('photo_comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single()

    if (existingReaction) {
      // Remove reaction
      const { error } = await supabase
        .from('photo_comment_reactions')
        .delete()
        .eq('id', existingReaction.id)

      if (error) throw error
      return NextResponse.json({ deleted: true })
    } else {
      // Add reaction
      const { data, error } = await supabase
        .from('photo_comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          emoji,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Error toggling comment reaction:', error)
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}
