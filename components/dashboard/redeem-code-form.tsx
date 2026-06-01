'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, AlertCircle, CheckCircle } from 'lucide-react'

interface RedeemCodeFormProps {
  userId: string
  hasConnection: boolean
}

export function RedeemCodeForm({ userId, hasConnection }: RedeemCodeFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const normalizedCode = code.toUpperCase().replace(/\s/g, '')

    // Find the invite code
    const { data: inviteCode, error: fetchError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single()

    if (fetchError || !inviteCode) {
      setError('Invalid invite code. Please check and try again.')
      setIsLoading(false)
      return
    }

    if (inviteCode.used_by) {
      setError('This invite code has already been used.')
      setIsLoading(false)
      return
    }

    if (inviteCode.owner_id === userId) {
      setError('You cannot use your own invite code.')
      setIsLoading(false)
      return
    }

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .eq('owner_id', inviteCode.owner_id)
      .eq('viewer_id', userId)
      .single()

    if (existingConnection) {
      setError('You are already connected to this person.')
      setIsLoading(false)
      return
    }

    // Create connection
    const { error: connectionError } = await supabase
      .from('connections')
      .insert({
        owner_id: inviteCode.owner_id,
        viewer_id: userId,
        invite_code_id: inviteCode.id,
      })

    if (connectionError) {
      setError('Failed to connect. Please try again.')
      setIsLoading(false)
      return
    }

    // Mark invite code as used
    await supabase
      .from('invite_codes')
      .update({ 
        used_by: userId, 
        used_at: new Date().toISOString() 
      })
      .eq('id', inviteCode.id)

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2000)
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-green-900">Connected Successfully!</h3>
          <p className="text-green-700 mt-2">Redirecting to your dashboard...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {hasConnection ? 'Add Another Connection' : 'Enter Invite Code'}
        </CardTitle>
        <CardDescription>
          Enter the invite code you received to connect with a student
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRedeem} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="code">Invite Code</Label>
            <Input
              id="code"
              placeholder="Enter 8-character code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono text-lg tracking-wider text-center"
              maxLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={code.length < 8 || isLoading}>
            {isLoading ? 'Connecting...' : 'Connect'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
