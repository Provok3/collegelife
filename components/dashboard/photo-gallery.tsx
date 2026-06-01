'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, MessageCircle, Trash2, Send, Heart, ThumbsUp, Star, Smile } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface CommentReaction {
  id: string
  emoji: string
  user_id: string
}

interface PhotoComment {
  id: string
  content: string
  created_at: string
  parent_id: string | null
  user: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  reactions?: CommentReaction[]
}

interface CommentThreadNode extends PhotoComment {
  replies: CommentThreadNode[]
}

interface Photo {
  id: string
  owner_id: string
  blob_pathname: string
  caption: string | null
  created_at: string
  owner?: {
    display_name: string | null
    avatar_url: string | null
  }
  comments?: PhotoComment[]
  reactions: Array<{
    id: string
    emoji: string
    user_id: string
  }>
}

interface PhotoGalleryProps {
  photos: Photo[]
  userId: string
  isOwner: boolean
}

const EMOJI_OPTIONS = [
  { emoji: 'heart', icon: Heart, label: 'Love' },
  { emoji: 'like', icon: ThumbsUp, label: 'Like' },
  { emoji: 'star', icon: Star, label: 'Star' },
  { emoji: 'smile', icon: Smile, label: 'Smile' },
]

const COMMENT_SELECT_FULL = `
  id,
  content,
  created_at,
  parent_id,
  user:profiles!photo_comments_user_id_fkey(id, display_name, avatar_url),
  reactions:photo_comment_reactions(
    id,
    emoji,
    user_id
  )
`

const COMMENT_SELECT_BASIC = `
  id,
  content,
  created_at,
  user:profiles!photo_comments_user_id_fkey(id, display_name, avatar_url)
`

function normalizeComment(
  comment: PhotoComment & { parent_id?: string | null },
): PhotoComment {
  return {
    ...comment,
    parent_id: comment.parent_id ?? null,
    reactions: comment.reactions ?? [],
  }
}

function updatePhotoComment(
  photos: Photo[],
  photoId: string,
  commentId: string,
  updater: (comment: PhotoComment) => PhotoComment,
): Photo[] {
  return photos.map((photo) => {
    if (photo.id !== photoId) return photo
    return {
      ...photo,
      comments: (photo.comments ?? []).map((comment) =>
        comment.id === commentId ? updater(comment) : comment,
      ),
    }
  })
}

function buildCommentTree(comments: PhotoComment[]): CommentThreadNode[] {
  const sorted = [...comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const byId = new Map<string, CommentThreadNode>()
  const roots: CommentThreadNode[] = []

  for (const comment of sorted) {
    byId.set(comment.id, { ...normalizeComment(comment), replies: [] })
  }

  for (const comment of sorted) {
    const node = byId.get(comment.id)!
    if (!comment.parent_id) {
      roots.push(node)
      continue
    }
    const parent = byId.get(comment.parent_id)
    if (parent) {
      parent.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

function CommentReactionBar({
  comment,
  userId,
  onReact,
}: {
  comment: PhotoComment
  userId: string
  onReact: (commentId: string, emoji: string) => void
}) {
  const reactions = comment.reactions ?? []

  return (
    <div className="flex items-center gap-0.5">
      {EMOJI_OPTIONS.map(({ emoji, icon: Icon, label }) => {
        const count = reactions.filter((r) => r.emoji === emoji).length
        const hasReacted = reactions.some((r) => r.user_id === userId && r.emoji === emoji)

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(comment.id, emoji)}
            className={`flex items-center gap-0.5 rounded-md px-1.5 py-1 transition-smooth ${
              hasReacted
                ? 'bg-primary/30 text-primary'
                : 'text-muted-foreground hover:bg-white/10 hover:text-white'
            }`}
            title={label}
            aria-label={`${label}${count > 0 ? `, ${count}` : ''}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {count > 0 && <span className="text-[10px] font-medium leading-none">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

function CommentBubble({
  comment,
  depth = 0,
}: {
  comment: PhotoComment
  depth?: number
}) {
  const isNested = depth > 0
  return (
    <div className="flex gap-2">
      <Avatar className={`flex-shrink-0 ${isNested ? 'w-6 h-6' : 'w-7 h-7'}`}>
        <AvatarImage src={comment.user.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-secondary/20 text-secondary">
          {(comment.user.display_name || 'U').slice(0, 1)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
          <p className="text-sm">
            <span className="font-semibold text-white">{comment.user.display_name || 'User'}</span>
            <br />
            <span className="text-muted-foreground">{comment.content}</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

export function PhotoGallery({ photos: initialPhotos, userId, isOwner }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState(() =>
    initialPhotos.map((photo) => ({
      ...photo,
      comments: (photo.comments ?? []).map((comment) => normalizeComment(comment)),
    })),
  )
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<{ photoId: string; commentId: string } | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    const response = await fetch('/api/photos/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId }),
    })

    if (response.ok) {
      setPhotos(photos.filter((p) => p.id !== photoId))
    }
  }

  const handleAddComment = async (photoId: string, parentId: string | null = null) => {
    const content = parentId ? replyText.trim() : newComment.trim()
    if (!content) return

    setIsSubmitting(true)

    const insertPayload: {
      photo_id: string
      user_id: string
      content: string
      parent_id?: string
    } = {
      photo_id: photoId,
      user_id: userId,
      content,
    }
    if (parentId) insertPayload.parent_id = parentId

    let { data, error } = await supabase
      .from('photo_comments')
      .insert(insertPayload)
      .select(COMMENT_SELECT_FULL)
      .single()

    if (error && parentId) {
      const fallback = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photoId,
          user_id: userId,
          content,
        })
        .select(COMMENT_SELECT_BASIC)
        .single()
      data = fallback.data
      error = fallback.error
    } else if (error) {
      const fallback = await supabase
        .from('photo_comments')
        .insert(insertPayload)
        .select(COMMENT_SELECT_BASIC)
        .single()
      data = fallback.data
      error = fallback.error
    }

    if (!error && data) {
      setPhotos(
        photos.map((p) => {
          if (p.id === photoId) {
            return { ...p, comments: [...(p.comments ?? []), normalizeComment(data)] }
          }
          return p
        }),
      )
      if (parentId) {
        setReplyText('')
        setReplyingTo(null)
      } else {
        setNewComment('')
      }
    }
    setIsSubmitting(false)
  }

  const handleCommentReaction = async (
    photoId: string,
    commentId: string,
    emoji: string,
  ) => {
    const photo = photos.find((p) => p.id === photoId)
    const comment = photo?.comments?.find((c) => c.id === commentId)
    if (!comment) return

    const reactions = comment.reactions ?? []
    const existingReaction = reactions.find(
      (r) => r.user_id === userId && r.emoji === emoji,
    )

    if (existingReaction) {
      await supabase
        .from('photo_comment_reactions')
        .delete()
        .eq('id', existingReaction.id)

      setPhotos(
        updatePhotoComment(photos, photoId, commentId, (c) => ({
          ...c,
          reactions: (c.reactions ?? []).filter((r) => r.id !== existingReaction.id),
        })),
      )
    } else {
      const { data } = await supabase
        .from('photo_comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: userId,
          emoji,
        })
        .select('id, emoji, user_id')
        .single()

      if (data) {
        setPhotos(
          updatePhotoComment(photos, photoId, commentId, (c) => ({
            ...c,
            reactions: [...(c.reactions ?? []), data],
          })),
        )
      }
    }
  }

  const handleReaction = async (photoId: string, emoji: string) => {
    if (isOwner) return

    const photo = photos.find((p) => p.id === photoId)
    if (!photo) return

    const existingReaction = photo.reactions.find(
      (r) => r.user_id === userId && r.emoji === emoji,
    )

    if (existingReaction) {
      await supabase.from('photo_reactions').delete().eq('id', existingReaction.id)

      setPhotos(
        photos.map((p) => {
          if (p.id === photoId) {
            return {
              ...p,
              reactions: p.reactions.filter((r) => r.id !== existingReaction.id),
            }
          }
          return p
        }),
      )
    } else {
      const { data } = await supabase
        .from('photo_reactions')
        .insert({
          photo_id: photoId,
          user_id: userId,
          emoji,
        })
        .select()
        .single()

      if (data) {
        setPhotos(
          photos.map((p) => {
            if (p.id === photoId) {
              return { ...p, reactions: [...p.reactions, data] }
            }
            return p
          }),
        )
      }
    }
  }

  const startReply = (photoId: string, commentId: string) => {
    setReplyingTo({ photoId, commentId })
    setReplyText('')
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setReplyText('')
  }

  const renderCommentThread = (
    photo: Photo,
    nodes: CommentThreadNode[],
    depth = 0,
  ) =>
    nodes.map((node) => {
      const isReplyingToThis =
        replyingTo?.photoId === photo.id && replyingTo.commentId === node.id
      const replyTargetName = node.user.display_name || 'User'

      return (
        <div key={node.id} className="space-y-2">
          <CommentBubble comment={node} depth={depth} />

          <div
            className={`flex items-center gap-2 flex-wrap ${depth === 0 ? 'ml-9' : 'ml-8'}`}
          >
            <CommentReactionBar
              comment={node}
              userId={userId}
              onReact={(commentId, emoji) =>
                handleCommentReaction(photo.id, commentId, emoji)
              }
            />
            <button
              type="button"
              onClick={() =>
                isReplyingToThis ? cancelReply() : startReply(photo.id, node.id)
              }
              className="text-xs font-medium text-primary hover:text-primary/80 transition-smooth"
            >
              {isReplyingToThis ? 'Cancel' : 'Reply'}
            </button>
          </div>

          {isReplyingToThis && (
            <div
              className="flex gap-2"
              style={{ marginLeft: `${Math.min(depth + 1, 6) * 12}px` }}
            >
              <Input
                placeholder={`Reply to ${replyTargetName}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment(photo.id, node.id)
                  }
                }}
                className="text-sm bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                autoFocus
              />
              <Button
                size="icon"
                onClick={() => handleAddComment(photo.id, node.id)}
                disabled={!replyText.trim() || isSubmitting}
                className="flex-shrink-0 bg-primary hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {node.replies.length > 0 && (
            <div className="space-y-3 ml-3 pl-3 border-l border-white/10">
              {renderCommentThread(photo, node.replies, depth + 1)}
            </div>
          )}
        </div>
      )
    })

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-bold text-white mb-2">No Photos Yet</h3>
        <p className="text-muted-foreground">
          {isOwner
            ? 'Upload your first photo to share with your family!'
            : 'No photos have been shared yet. Check back soon!'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-max">
      {photos.map((photo) => {
        const isExpanded = expandedPhoto === photo.id
        const photoComments = photo.comments ?? []
        const commentTree = buildCommentTree(photoComments)
        const totalComments = photoComments.length
        const reactionCounts = EMOJI_OPTIONS.map((opt) => ({
          ...opt,
          count: photo.reactions.filter((r) => r.emoji === opt.emoji).length,
          hasReacted: photo.reactions.some((r) => r.user_id === userId && r.emoji === opt.emoji),
        }))

        return (
          <div
            key={photo.id}
            className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl hover:border-white/20 transition-smooth hover:shadow-xl hover:shadow-primary/10"
          >
            <div className="relative aspect-square overflow-hidden bg-slate-900">
              <img
                src={`/api/photos/file?pathname=${encodeURIComponent(photo.blob_pathname)}`}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {isOwner && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={() => handleDelete(photo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="p-5 space-y-4">
              {photo.caption && (
                <p className="text-sm text-white leading-relaxed">{photo.caption}</p>
              )}

              {!isOwner && photo.owner && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b border-white/10">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={photo.owner.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {(photo.owner.display_name || 'S').slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{photo.owner.display_name}</span>
                </div>
              )}

              <div className="grid grid-cols-4 gap-1">
                {reactionCounts.map(({ emoji, icon: Icon, label, count, hasReacted }) =>
                  isOwner ? (
                    <div
                      key={emoji}
                      className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-white/5 border border-white/10 text-muted-foreground"
                      title={count > 0 ? `${count} ${label}` : label}
                    >
                      <Icon className="w-4 h-4" />
                      {count > 0 && <span className="text-xs mt-0.5">{count}</span>}
                    </div>
                  ) : (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReaction(photo.id, emoji)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-smooth ${
                        hasReacted
                          ? 'bg-primary/30 border border-primary/60 text-primary'
                          : 'bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20'
                      }`}
                      title={label}
                    >
                      <Icon className="w-4 h-4" />
                      {count > 0 && <span className="text-xs mt-0.5">{count}</span>}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setExpandedPhoto(isExpanded ? null : photo.id)
                  if (isExpanded) cancelReply()
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-smooth text-sm text-muted-foreground hover:text-white font-medium"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {totalComments} comment{totalComments !== 1 ? 's' : ''}
                </span>
              </button>

              {isExpanded && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  {commentTree.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No comments yet. Be the first to say something!
                    </p>
                  )}

                  <div className="space-y-4">{renderCommentThread(photo, commentTree)}</div>

                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddComment(photo.id)
                        }
                      }}
                      className="text-sm bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                    />
                    <Button
                      size="icon"
                      onClick={() => handleAddComment(photo.id)}
                      disabled={!newComment.trim() || isSubmitting}
                      className="flex-shrink-0 bg-primary hover:bg-primary/90"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-1">
                {formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
