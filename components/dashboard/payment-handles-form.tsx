'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface PaymentHandles {
  venmo: string | null
  cashtag: string | null
  zelle: string | null
  apple_cash: string | null
}

interface PaymentHandlesFormProps {
  userId: string
  handles: PaymentHandles | null
}

// Strip a leading @ or $ so we store the bare handle and can build clean links.
const clean = (value: string, prefix?: string) => {
  let v = value.trim()
  if (prefix && v.startsWith(prefix)) v = v.slice(prefix.length)
  return v
}

export function PaymentHandlesForm({ userId, handles }: PaymentHandlesFormProps) {
  const [venmo, setVenmo] = useState(handles?.venmo ?? '')
  const [cashtag, setCashtag] = useState(handles?.cashtag ?? '')
  const [zelle, setZelle] = useState(handles?.zelle ?? '')
  const [appleCash, setAppleCash] = useState(handles?.apple_cash ?? '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)

    const payload = {
      owner_id: userId,
      venmo: clean(venmo, '@') || null,
      cashtag: clean(cashtag, '$') || null,
      zelle: zelle.trim() || null,
      apple_cash: appleCash.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('payment_handles')
      .upsert(payload, { onConflict: 'owner_id' })

    setSaving(false)

    if (error) {
      toast.error('Could not save your payment handles. Please try again.')
      return
    }

    toast.success('Payment handles saved')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Payment handles
        </CardTitle>
        <CardDescription>
          Used only when you ask family for money. When you send a request, your connected family
          members see these so they can pay you back. They stay private otherwise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venmo">Venmo username</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <Input
                id="venmo"
                value={venmo}
                onChange={(e) => setVenmo(e.target.value)}
                placeholder="your-venmo"
                className="pl-7"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashtag">Cash App $Cashtag</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="cashtag"
                value={cashtag}
                onChange={(e) => setCashtag(e.target.value)}
                placeholder="YourCashtag"
                className="pl-7"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zelle">Zelle (email or phone)</Label>
            <Input
              id="zelle"
              value={zelle}
              onChange={(e) => setZelle(e.target.value)}
              placeholder="you@example.com"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apple-cash">Apple Cash (phone number)</Label>
            <Input
              id="apple-cash"
              value={appleCash}
              onChange={(e) => setAppleCash(e.target.value)}
              placeholder="(555) 123-4567"
              inputMode="tel"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Zelle and Apple Cash don&apos;t support one-tap links, so family will see the handle to
              send manually. Venmo and Cash App open with the amount pre-filled.
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save handles'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
