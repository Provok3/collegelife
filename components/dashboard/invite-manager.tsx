'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users, Copy, Check, Trash2, Plus, Link as LinkIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface InviteCode {
  id: string
  code: string
  label: string | null
  used_by: string | null
  used_at: string | null
  expires_at: string | null
  created_at: string
  used_by_profile: {
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface Connection {
  id: string
  viewer: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  created_at: string
}

interface InviteManagerProps {
  userId: string
  inviteCodes: InviteCode[]
  connections: Connection[]
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function InviteManager({ userId, inviteCodes: initialCodes, connections: initialConnections }: InviteManagerProps) {
  const [inviteCodes, setInviteCodes] = useState(initialCodes)
  const [connections, setConnections] = useState(initialConnections)
  const [label, setLabel] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const createInviteCode = async () => {
    setIsCreating(true)
    const code = generateCode()
    
    const { data, error } = await supabase
      .from('invite_codes')
      .insert({
        owner_id: userId,
        code,
        label: label || null,
      })
      .select()
      .single()

    if (!error && data) {
      setInviteCodes([{ ...data, used_by_profile: null }, ...inviteCodes])
      setLabel('')
    }
    setIsCreating(false)
  }

  const deleteInviteCode = async (id: string) => {
    await supabase.from('invite_codes').delete().eq('id', id)
    setInviteCodes(inviteCodes.filter(c => c.id !== id))
  }

  const removeConnection = async (id: string) => {
    await supabase.from('connections').delete().eq('id', id)
    setConnections(connections.filter(c => c.id !== id))
    router.refresh()
  }

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const unusedCodes = inviteCodes.filter(c => !c.used_by)
  const usedCodes = inviteCodes.filter(c => c.used_by)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Invite People</h1>
        <p className="text-muted-foreground mt-1">
          Generate invite codes to share with family and friends
        </p>
      </div>

      {/* Create New Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Invite Code
          </CardTitle>
          <CardDescription>
            Generate a unique code that someone can use to connect with you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="label" className="sr-only">Label (optional)</Label>
              <Input
                id="label"
                placeholder="Label (e.g., Mom, Dad, Grandma)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <Button onClick={createInviteCode} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Generate Code'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unused Codes */}
      {unusedCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Available Codes
            </CardTitle>
            <CardDescription>
              Share these codes with people you want to invite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unusedCodes.map((invite) => (
                <div 
                  key={invite.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-mono font-bold tracking-wider">
                        {invite.code}
                      </code>
                      {invite.label && (
                        <Badge variant="secondary">{invite.label}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCode(invite.code, invite.id)}
                    >
                      {copiedId === invite.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteInviteCode(invite.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected People */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connected People ({connections.length})
          </CardTitle>
          <CardDescription>
            People who can view your photos, status, and schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No one connected yet. Share an invite code to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <div 
                  key={connection.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={connection.viewer.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(connection.viewer.display_name || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {connection.viewer.display_name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Connected {formatDistanceToNow(new Date(connection.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConnection(connection.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Used Codes History */}
      {usedCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Used Codes</CardTitle>
            <CardDescription>Codes that have been redeemed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usedCodes.map((invite) => (
                <div 
                  key={invite.id}
                  className="flex items-center justify-between p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-muted-foreground">{invite.code}</code>
                    {invite.label && (
                      <Badge variant="outline">{invite.label}</Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    Used by {invite.used_by_profile?.display_name || 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
