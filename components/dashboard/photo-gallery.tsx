'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, MessageCircle, Trash2, Send, Heart, ThumbsUp, Star, Smile, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PhotoComment } from './photo-comment'

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
    replies?: Array<{
      id: string
      content: string
      created_at: string
      user: {
        id: string
        display_name: string | null
        avatar_url: string | null
      }
    }>
    reactions?: Array<{
      id: string
      emoji: string
      user_id: string
    }>
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
      <div className="text-center py-12">
        <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-bold text-foreground mb-2">No Photos Yet</h3>
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
        const reactionCounts = EMOJI_OPTIONS.map(opt => ({
          ...opt,
          count: photo.reactions.filter(r => r.emoji === opt.emoji).length,
          hasReacted: photo.reactions.some(r => r.user_id === userId && r.emoji === opt.emoji)
        }))

        return (
          <div
            key={photo.id}
            className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-smooth hover:shadow-xl hover:shadow-primary/10"
          >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-muted">
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

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Caption */}
              {photo.caption && (
                <p className="text-sm text-foreground leading-relaxed">{photo.caption}</p>
              )}

              {/* Owner info for viewers */}
              {!isOwner && photo.owner && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pb-2 border-b border-border">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={photo.owner.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {(photo.owner.display_name || 'S').slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{photo.owner.display_name}</span>
                </div>
              )}

              {/* Reactions Grid */}
              <div className="grid grid-cols-4 gap-1">
                {reactionCounts.map(({ emoji, icon: Icon, label, count, hasReacted }) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(photo.id, emoji)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-smooth border ${
                      hasReacted
                        ? 'bg-primary/20 border-primary/60 text-primary'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:border-primary/30'
                    }`}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                    {count > 0 && <span className="text-xs mt-0.5">{count}</span>}
                  </button>
                ))}
              </div>

              {/* Comments Button */}
              <button
                onClick={() => setExpandedPhoto(isExpanded ? null : photo.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-muted border border-border hover:bg-muted/80 hover:border-primary/30 transition-smooth text-sm text-muted-foreground hover:text-foreground font-medium"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {photo.comments.length} comment{photo.comments.length !== 1 ? 's' : ''}
                </span>
              </button>

              {/* Comments section */}
              {isExpanded && (
                <div className="space-y-3 pt-3 border-t border-border">
                  {photo.comments.map((comment) => (
                    <PhotoComment
                      key={comment.id}
                      comment={comment}
                      photoId={photo.id}
                      userId={userId}
                      onDelete={(commentId) => handleDeleteComment(photo.id, commentId)}
                    />
                  ))}

                  {/* Add comment */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Input
                      placeholder="Say something..."
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
                      className="flex-shrink-0 bg-primary hover:bg-primary/90"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Timestamp */}
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
