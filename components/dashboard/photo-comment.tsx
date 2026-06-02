'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart, ThumbsUp, Star, Smile, ChevronDown, ChevronUp, Trash2, Send } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface CommentReply {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface CommentReaction {
  id: string
  emoji: string
  user_id: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  replies?: CommentReply[]
  reactions?: CommentReaction[]
}

interface PhotoCommentProps {
  comment: Comment
  userId: string
  onDelete?: (commentId: string) => void
  onReplyAdded?: (reply: CommentReply) => void
}

const EMOJI_OPTIONS = [
  { emoji: 'heart', icon: Heart, label: 'Love' },
  { emoji: 'like', icon: ThumbsUp, label: 'Like' },
  { emoji: 'star', icon: Star, label: 'Star' },
  { emoji: 'smile', icon: Smile, label: 'Smile' },
]

export function PhotoComment({ comment, userId, onDelete, onReplyAdded }: PhotoCommentProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<CommentReply[]>(comment.replies || [])
  const [reactions, setReactions] = useState<CommentReaction[]>(comment.reactions || [])
  const [newReply, setNewReply] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleToggleReaction = async (emoji: string) => {
    const existingReaction = reactions.find(r => r.user_id === userId && r.emoji === emoji)

    if (existingReaction) {
      await fetch('/api/photos/comments/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, emoji }),
      })

      setReactions(reactions.filter(r => r.id !== existingReaction.id))
    } else {
      const response = await fetch('/api/photos/comments/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, emoji }),
      })

      if (response.ok) {
        const data = await response.json()
        setReactions([...reactions, data])
      }
    }
  }

  const handleAddReply = async () => {
    if (!newReply.trim()) return
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/photos/comments/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, content: newReply.trim() }),
      })

      if (response.ok) {
        const reply = await response.json()
        setReplies([...replies, reply])
        setNewReply('')
        onReplyAdded?.(reply)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm('Delete this reply?')) return

    const response = await fetch(`/api/photos/comments/replies?id=${replyId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setReplies(replies.filter(r => r.id !== replyId))
    }
  }

  const reactionCounts = EMOJI_OPTIONS.map(opt => ({
    ...opt,
    count: reactions.filter(r => r.emoji === opt.emoji).length,
    hasReacted: reactions.some(r => r.user_id === userId && r.emoji === opt.emoji)
  }))

  return (
    <div className="space-y-2">
      {/* Main comment */}
      <div className="flex gap-2">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarImage src={comment.user.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-secondary/20 text-secondary">
            {(comment.user.display_name || 'U').slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
            <p className="text-sm">
              <span className="font-semibold text-white">{comment.user.display_name || 'User'}</span>
              <br />
              <span className="text-muted-foreground">{comment.content}</span>
            </p>
          </div>

          {/* Comment reactions */}
          {reactionCounts.some(r => r.count > 0) && (
            <div className="flex flex-wrap gap-1">
              {reactionCounts.map(({ emoji, icon: Icon, count, hasReacted }) =>
                count > 0 && (
                  <button
                    key={emoji}
                    onClick={() => handleToggleReaction(emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-smooth ${
                      hasReacted
                        ? 'bg-primary/30 border border-primary/60 text-primary'
                        : 'bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{count}</span>
                  </button>
                )
              )}
            </div>
          )}

          {/* Comment meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{replies.length} repl{replies.length !== 1 ? 'ies' : 'y'}</span>
            </button>
            {comment.user.id === userId && (
              <button
                onClick={() => onDelete?.(comment.id)}
                className="text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Add reaction buttons inline */}
          <div className="flex gap-1">
            {reactionCounts.map(({ emoji, icon: Icon, label, hasReacted }) => (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                title={label}
                className={`p-1 rounded transition-smooth ${
                  hasReacted
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Replies */}
      {showReplies && (
        <div className="ml-6 space-y-2 pt-2 border-l border-white/10 pl-4">
          {/* Existing replies */}
          {replies.map(reply => (
            <div key={reply.id} className="flex gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarImage src={reply.user.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-accent/20 text-accent">
                  {(reply.user.display_name || 'U').slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                  <p className="text-xs">
                    <span className="font-semibold text-white">{reply.user.display_name || 'User'}</span>
                    <br />
                    <span className="text-muted-foreground">{reply.content}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                  {reply.user.id === userId && (
                    <button
                      onClick={() => handleDeleteReply(reply.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add reply */}
          <div className="flex gap-2 pt-2 border-t border-white/10">
            <Input
              placeholder="Reply..."
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddReply()
                }
              }}
              className="text-xs bg-white/5 border-white/10 text-white placeholder:text-muted-foreground h-8"
            />
            <Button
              size="sm"
              onClick={handleAddReply}
              disabled={!newReply.trim() || isSubmitting}
              className="flex-shrink-0 bg-primary hover:bg-primary/90 h-8"
            >
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
