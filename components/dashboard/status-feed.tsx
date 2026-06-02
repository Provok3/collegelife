'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Trash2, BookOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Status {
  id: string
  owner_id: string
  content: string
  mood: string | null
  studying_for: string | null
  created_at: string
  owner?: {
    display_name: string | null
    avatar_url: string | null
  }
}

interface StatusFeedProps {
  statuses: Status[]
  userId: string
  isOwner: boolean
}

const MOOD_STYLES: Record<string, { bg: string; text: string }> = {
  great: { bg: 'bg-green-100', text: 'text-green-700' },
  good: { bg: 'bg-blue-100', text: 'text-blue-700' },
  okay: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  tired: { bg: 'bg-orange-100', text: 'text-orange-700' },
  stressed: { bg: 'bg-red-100', text: 'text-red-700' },
  excited: { bg: 'bg-purple-100', text: 'text-purple-700' },
}

export function StatusFeed({ statuses: initialStatuses, userId, isOwner }: StatusFeedProps) {
  const [statuses, setStatuses] = useState(initialStatuses)
  const router = useRouter()
  const supabase = createClient()

  // Keep the feed in sync with refreshed server data — e.g. after posting a
  // new update, router.refresh() re-fetches and the new status arrives here.
  useEffect(() => {
    setStatuses(initialStatuses)
  }, [initialStatuses])

  const handleDelete = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status?')) return

    const { error } = await supabase
      .from('statuses')
      .delete()
      .eq('id', statusId)
      .eq('owner_id', userId)

    if (!error) {
      setStatuses(statuses.filter(s => s.id !== statusId))
    }
  }

  if (statuses.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-white/10 text-white shadow-none">
        <CardContent className="py-12 text-center">
          <MessageCircle className="w-12 h-12 mx-auto text-white/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">No Status Updates</h3>
          <p className="text-white/70">
            {isOwner 
              ? 'Share your first status update with your family!' 
              : 'No updates yet. Check back soon!'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {statuses.map((status) => {
        const moodStyle = status.mood ? MOOD_STYLES[status.mood] : null

        return (
          <Card
            key={status.id}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-white/10 text-white shadow-none"
          >
            <CardContent className="pt-6">
              <div className="flex gap-4">
                {/* Avatar for viewers */}
                {!isOwner && status.owner && (
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={status.owner.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(status.owner.display_name || 'S').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isOwner && status.owner && (
                        <span className="font-semibold text-white">{status.owner.display_name}</span>
                      )}
                      {moodStyle && (
                        <Badge variant="secondary" className={`${moodStyle.bg} ${moodStyle.text} capitalize`}>
                          {status.mood}
                        </Badge>
                      )}
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/60 hover:text-destructive hover:bg-white/10"
                        onClick={() => handleDelete(status.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Content */}
                  <p className="text-white whitespace-pre-wrap">{status.content}</p>

                  {/* Studying for */}
                  {status.studying_for && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-white/80">
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <span>
                        Studying for:{' '}
                        <span className="font-medium text-white">{status.studying_for}</span>
                      </span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-white/70 mt-3">
                    {formatDistanceToNow(new Date(status.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
