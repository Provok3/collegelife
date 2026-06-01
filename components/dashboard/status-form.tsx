'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageCircle, Send } from 'lucide-react'

const MOODS = [
  { value: 'great', label: 'Great', color: 'text-green-600' },
  { value: 'good', label: 'Good', color: 'text-blue-600' },
  { value: 'okay', label: 'Okay', color: 'text-yellow-600' },
  { value: 'tired', label: 'Tired', color: 'text-orange-600' },
  { value: 'stressed', label: 'Stressed', color: 'text-red-600' },
  { value: 'excited', label: 'Excited', color: 'text-purple-600' },
]

interface StatusFormProps {
  userId: string
}

export function StatusForm({ userId }: StatusFormProps) {
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [studyingFor, setStudyingFor] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSubmitting(true)

    const { error } = await supabase
      .from('statuses')
      .insert({
        owner_id: userId,
        content: content.trim(),
        mood: mood || null,
        studying_for: studyingFor || null,
      })

    if (!error) {
      setContent('')
      setMood('')
      setStudyingFor('')
      router.refresh()
    }

    setIsSubmitting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5" />
          Post an Update
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">What&apos;s on your mind?</Label>
            <Textarea
              id="content"
              placeholder="Share what's happening in your college life..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mood">How are you feeling?</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger id="mood">
                  <SelectValue placeholder="Select mood (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className={m.color}>{m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studyingFor">Studying for?</Label>
              <Input
                id="studyingFor"
                placeholder="e.g., Chemistry midterm"
                value={studyingFor}
                onChange={(e) => setStudyingFor(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={!content.trim() || isSubmitting}>
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Posting...' : 'Post Update'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
