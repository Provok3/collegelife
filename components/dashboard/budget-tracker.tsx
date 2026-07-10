'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Plus, Pencil, Trash2, Receipt, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Purchase {
  id: string
  owner_id: string
  name: string
  amount: number
  created_at: string
}

interface BudgetTrackerProps {
  purchases: Purchase[]
  userId: string
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function BudgetTracker({ purchases: initialPurchases, userId }: BudgetTrackerProps) {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const total = useMemo(
    () => purchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0),
    [purchases],
  )

  const parsedAmount = Number.parseFloat(amount)
  const canSubmit = name.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount >= 0
  const isEditing = editingId !== null

  const openCreateDialog = () => {
    setEditingId(null)
    setName('')
    setAmount('')
    setDialogOpen(true)
  }

  const openEditDialog = (purchase: Purchase) => {
    setEditingId(purchase.id)
    setName(purchase.name)
    setAmount(String(purchase.amount))
    setDialogOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return

    const trimmedName = name.trim()
    const roundedAmount = Math.round(parsedAmount * 100) / 100

    setIsSubmitting(true)

    if (isEditing) {
      const { data, error } = await supabase
        .from('purchases')
        .update({ name: trimmedName, amount: roundedAmount })
        .eq('id', editingId)
        .select()
        .single()

      setIsSubmitting(false)

      if (error || !data) {
        toast.error('Could not update purchase. Please try again.')
        return
      }

      setPurchases((current) =>
        current.map((purchase) => (purchase.id === editingId ? (data as Purchase) : purchase)),
      )
      setDialogOpen(false)
      toast.success('Purchase updated')
      router.refresh()
      return
    }

    const { data, error } = await supabase
      .from('purchases')
      .insert({
        owner_id: userId,
        name: trimmedName,
        amount: roundedAmount,
      })
      .select()
      .single()

    setIsSubmitting(false)

    if (error || !data) {
      toast.error('Could not add purchase. Please try again.')
      return
    }

    setPurchases((current) => [data as Purchase, ...current])
    setDialogOpen(false)
    toast.success('Purchase added')
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const { error } = await supabase.from('purchases').delete().eq('id', id)
    setDeletingId(null)

    if (error) {
      toast.error('Could not delete purchase. Please try again.')
      return
    }

    setPurchases((current) => current.filter((purchase) => purchase.id !== id))
    toast.success('Purchase removed')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Card className="w-full sm:max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Total spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{currency.format(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {purchases.length} {purchases.length === 1 ? 'purchase' : 'purchases'}
            </p>
          </CardContent>
        </Card>

        <Button onClick={openCreateDialog} className="self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add purchase
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Receipt className="h-8 w-8" />
              <p className="text-sm">No purchases yet. Add your first one to start tracking.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {purchases.map((purchase) => (
                <li key={purchase.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{purchase.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(purchase.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {currency.format(Number(purchase.amount))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => openEditDialog(purchase)}
                    aria-label={`Edit ${purchase.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(purchase.id)}
                    disabled={deletingId === purchase.id}
                    aria-label={`Delete ${purchase.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit purchase' : 'Add purchase'}</DialogTitle>
            <DialogDescription>Record what you bought and how much it cost.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-name">Purchase</Label>
              <Input
                id="purchase-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Taco Bell"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-amount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="purchase-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting
                  ? isEditing
                    ? 'Saving...'
                    : 'Adding...'
                  : isEditing
                    ? 'Save changes'
                    : 'Add purchase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
