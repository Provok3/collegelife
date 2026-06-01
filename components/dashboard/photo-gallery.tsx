'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, MessageCircle, Trash2, Send, Heart, ThumbsUp, Star, Smile } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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
  comments: Array<{
    id: string
    content: string
    created_at: string
    user: {
      id: string
      display_name: string | null
      avatar_url: string | null
    }
  }>
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

export function PhotoGallery({ photos: initialPhotos, userId, isOwner }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    const response = await fetch('/api/photos/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId }),
    })

    if (response.ok) {
      setPhotos(photos.filter(p => p.id !== photoId))
    }
  }

  const handleAddComment = async (photoId: string) => {
    if (!newComment.trim()) return
    setIsSubmitting(true)

    const { data, error } = await supabase
      .from('photo_comments')
      .insert({
        photo_id: photoId,
        user_id: userId,
        content: newComment.trim(),
      })
      .select(`
        id,
        content,
        created_at,
        user:profiles!photo_comments_user_id_fkey(id, display_name, avatar_url)
      `)
      .single()

    if (!error && data) {
      setPhotos(photos.map(p => {
        if (p.id === photoId) {
          return { ...p, comments: [...p.comments, data] }
        }
        return p
      }))
      setNewComment('')
    }
    setIsSubmitting(false)
  }

  const handleReaction = async (photoId: string, emoji: string) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return

    const existingReaction = photo.reactions.find(
      r => r.user_id === userId && r.emoji === emoji
    )

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('photo_reactions')
        .delete()
        .eq('id', existingReaction.id)

      setPhotos(photos.map(p => {
        if (p.id === photoId) {
          return {
            ...p,
            reactions: p.reactions.filter(r => r.id !== existingReaction.id)
          }
        }
        return p
      }))
    } else {
      // Add reaction
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
        setPhotos(photos.map(p => {
          if (p.id === photoId) {
            return { ...p, reactions: [...p.reactions, data] }
          }
          return p
        }))
      }
    }
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Photos Yet</h3>
          <p className="text-muted-foreground">
            {isOwner 
              ? 'Upload your first photo to share with your family!' 
              : 'No photos have been shared yet. Check back soon!'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => {
        const isExpanded = expandedPhoto === photo.id
        const reactionCounts = EMOJI_OPTIONS.map(opt => ({
          ...opt,
          count: photo.reactions.filter(r => r.emoji === opt.emoji).length,
          hasReacted: photo.reactions.some(r => r.user_id === userId && r.emoji === opt.emoji)
        }))

        return (
          <Card key={photo.id} className="overflow-hidden">
            <div className="relative aspect-square">
              <img
                src={`/api/photos/file?pathname=${encodeURIComponent(photo.blob_pathname)}`}
                alt={photo.caption || 'Photo'}
                className="w-full h-full object-cover"
              />
              {isOwner && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(photo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <CardContent className="p-4 space-y-3">
              {/* Caption */}
              {photo.caption && (
                <p className="text-sm">{photo.caption}</p>
              )}

              {/* Owner info for viewers */}
              {!isOwner && photo.owner && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={photo.owner.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(photo.owner.display_name || 'S').slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{photo.owner.display_name}</span>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(photo.created_at), { addSuffix: true })}
              </p>

              {/* Reactions */}
              <div className="flex gap-1 flex-wrap">
                {reactionCounts.map(({ emoji, icon: Icon, label, count, hasReacted }) => (
                  <Button
                    key={emoji}
                    variant={hasReacted ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-2 gap-1"
                    onClick={() => handleReaction(photo.id, emoji)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {count > 0 && <span className="text-xs">{count}</span>}
                  </Button>
                ))}
              </div>

              {/* Comments toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setExpandedPhoto(isExpanded ? null : photo.id)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {photo.comments.length} comment{photo.comments.length !== 1 ? 's' : ''}
              </Button>

              {/* Comments section */}
              {isExpanded && (
                <div className="space-y-3 pt-2 border-t">
                  {photo.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={comment.user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(comment.user.display_name || 'U').slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{comment.user.display_name || 'User'}</span>{' '}
                          {comment.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Add comment */}
                  <div className="flex gap-2">
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
                      className="text-sm"
                    />
                    <Button
                      size="icon"
                      onClick={() => handleAddComment(photo.id)}
                      disabled={!newComment.trim() || isSubmitting}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
