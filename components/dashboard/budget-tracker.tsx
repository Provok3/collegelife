'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, parseISO, isSameMonth } from 'date-fns'
import {
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Wallet,
  PiggyBank,
  HandCoins,
  Check,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'

interface Purchase {
  id: string
  owner_id: string
  name: string
  amount: number
  created_at: string
}

interface MoneyRequest {
  id: string
  owner_id: string
  amount: number
  note: string | null
  status: 'pending' | 'received'
  created_at: string
  received_at: string | null
}

interface BudgetTrackerProps {
  purchases: Purchase[]
  moneyRequests: MoneyRequest[]
  userId: string
  budgetAmount: number | null
  currentMonth: string
  monthLabel: string
  hasPayHandles: boolean
  hasConnectedViewers: boolean
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function BudgetTracker({
  purchases: initialPurchases,
  moneyRequests: initialRequests,
  userId,
  budgetAmount: initialBudget,
  currentMonth,
  monthLabel,
  hasPayHandles,
  hasConnectedViewers,
}: BudgetTrackerProps) {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases)
  const [budget, setBudget] = useState<number | null>(initialBudget)
  const [requests, setRequests] = useState<MoneyRequest[]>(initialRequests)

  // Purchase dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Budget dialog state
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)

  // Money request dialog state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestAmount, setRequestAmount] = useState('')
  const [requestNote, setRequestNote] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const spentThisMonth = useMemo(
    () =>
      purchases
        .filter((p) => isSameMonth(parseISO(p.created_at), new Date()))
        .reduce((sum, p) => sum + Number(p.amount), 0),
    [purchases],
  )

  const remaining = budget === null ? null : budget - spentThisMonth
  const percent = budget && budget > 0 ? (spentThisMonth / budget) * 100 : 0
  const barWidth = Math.min(100, percent)
  const overBudget = budget !== null && spentThisMonth > budget
  const nearBudget = percent >= 80 && !overBudget
  const barColor = overBudget
    ? 'bg-destructive'
    : nearBudget
      ? 'bg-amber-500'
      : 'bg-primary'

  const parsedAmount = Number.parseFloat(amount)
  const canSubmit = name.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount >= 0
  const isEditing = editingId !== null

  const parsedRequestAmount = Number.parseFloat(requestAmount)
  const canSendRequest = Number.isFinite(parsedRequestAmount) && parsedRequestAmount > 0

  const parsedBudget = Number.parseFloat(budgetInput)
  const canSaveBudget = Number.isFinite(parsedBudget) && parsedBudget >= 0

  const pendingRequestTotal = useMemo(
    () =>
      requests
        .filter((r) => r.status === 'pending')
        .reduce((sum, r) => sum + Number(r.amount), 0),
    [requests],
  )

  // ---- Purchases ----------------------------------------------------------
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

  // ---- Budget -------------------------------------------------------------
  const openBudgetDialog = () => {
    setBudgetInput(budget !== null ? String(budget) : '')
    setBudgetDialogOpen(true)
  }

  const handleSaveBudget = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSaveBudget || savingBudget) return

    const roundedBudget = Math.round(parsedBudget * 100) / 100
    setSavingBudget(true)

    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        { owner_id: userId, month: currentMonth, amount: roundedBudget, updated_at: new Date().toISOString() },
        { onConflict: 'owner_id,month' },
      )
      .select('amount')
      .single()

    setSavingBudget(false)

    if (error || !data) {
      toast.error('Could not save your budget. Please try again.')
      return
    }

    setBudget(Number(data.amount))
    setBudgetDialogOpen(false)
    toast.success('Monthly budget saved')
    router.refresh()
  }

  // ---- Money requests -----------------------------------------------------
  const openRequestDialog = () => {
    setRequestAmount('')
    setRequestNote('')
    setRequestDialogOpen(true)
  }

  const handleSendRequest = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSendRequest || sendingRequest) return

    const roundedAmount = Math.round(parsedRequestAmount * 100) / 100
    const trimmedNote = requestNote.trim()
    setSendingRequest(true)

    const { data, error } = await supabase
      .from('money_requests')
      .insert({
        owner_id: userId,
        amount: roundedAmount,
        note: trimmedNote.length > 0 ? trimmedNote : null,
      })
      .select()
      .single()

    setSendingRequest(false)

    if (error || !data) {
      toast.error('Could not send your request. Please try again.')
      return
    }

    setRequests((current) => [data as MoneyRequest, ...current])
    setRequestDialogOpen(false)
    toast.success(
      hasConnectedViewers ? 'Request sent to your family' : 'Request saved',
    )
    router.refresh()
  }

  const handleMarkReceived = async (id: string) => {
    setUpdatingRequestId(id)
    const { data, error } = await supabase
      .from('money_requests')
      .update({ status: 'received', received_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    setUpdatingRequestId(null)

    if (error || !data) {
      toast.error('Could not update the request. Please try again.')
      return
    }

    setRequests((current) =>
      current.map((r) => (r.id === id ? (data as MoneyRequest) : r)),
    )
    toast.success('Marked as received')
    router.refresh()
  }

  const handleDeleteRequest = async (id: string) => {
    setUpdatingRequestId(id)
    const { error } = await supabase.from('money_requests').delete().eq('id', id)
    setUpdatingRequestId(null)

    if (error) {
      toast.error('Could not delete the request. Please try again.')
      return
    }

    setRequests((current) => current.filter((r) => r.id !== id))
    toast.success('Request removed')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Monthly budget hero */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <PiggyBank className="h-4 w-4" />
              {monthLabel} budget
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openBudgetDialog}>
              {budget === null ? 'Set budget' : 'Edit budget'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {budget === null ? (
            <p className="text-sm text-muted-foreground">
              Set a monthly budget to see how much you have left to spend.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-3xl font-bold tabular-nums">
                    {currency.format(spentThisMonth)}
                    <span className="text-base font-medium text-muted-foreground">
                      {' '}
                      / {currency.format(budget)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Spent this month</p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-2xl font-semibold tabular-nums',
                      overBudget ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {currency.format(Math.abs(remaining ?? 0))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {overBudget ? 'over budget' : 'remaining'}
                  </p>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', barColor)}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              {overBudget && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  You&apos;ve gone over your {monthLabel} budget.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Card className="w-full sm:max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Spent this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{currency.format(spentThisMonth)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {purchases.length} {purchases.length === 1 ? 'purchase' : 'purchases'} total
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={openRequestDialog} className="self-start sm:self-auto">
            <HandCoins className="h-4 w-4" />
            Ask for money
          </Button>
          <Button onClick={openCreateDialog} className="self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            Add purchase
          </Button>
        </div>
      </div>

      {/* Money requests */}
      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HandCoins className="h-5 w-5" />
              Money requests
              {pendingRequestTotal > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {currency.format(pendingRequestTotal)} pending
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {requests.map((request) => (
                <li key={request.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">
                        {currency.format(Number(request.amount))}
                      </span>
                      {request.status === 'received' ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Received</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                    {request.note && (
                      <p className="truncate text-sm text-muted-foreground">{request.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(request.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  {request.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-emerald-600"
                      onClick={() => handleMarkReceived(request.id)}
                      disabled={updatingRequestId === request.id}
                    >
                      <Check className="h-4 w-4" />
                      Got it
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteRequest(request.id)}
                    disabled={updatingRequestId === request.id}
                    aria-label="Delete request"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Purchases */}
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

      {/* Purchase dialog */}
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

      {/* Budget dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{budget === null ? 'Set' : 'Edit'} {monthLabel} budget</DialogTitle>
            <DialogDescription>
              How much do you want to spend this month? We&apos;ll track your purchases against it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget-amount">Monthly budget</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="budget-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(event.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  autoFocus
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBudgetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSaveBudget || savingBudget}>
                {savingBudget ? 'Saving...' : 'Save budget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Money request dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ask family for money</DialogTitle>
            <DialogDescription>
              {hasConnectedViewers
                ? 'Your connected family members will get a notification with a link to send it.'
                : 'This saves your request. Connect a family member to have them notified.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendRequest} className="space-y-4">
            {!hasPayHandles && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-muted-foreground">
                  You haven&apos;t added any payment handles yet, so family won&apos;t have a
                  one-tap way to pay.{' '}
                  <Link href="/dashboard/settings" className="font-medium text-foreground underline">
                    Add them in Settings
                  </Link>
                  .
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="request-amount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="request-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={requestAmount}
                  onChange={(event) => setRequestAmount(event.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  autoFocus
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-note">What&apos;s it for? (optional)</Label>
              <Textarea
                id="request-note"
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
                placeholder="e.g. Textbooks for the semester"
                rows={3}
                maxLength={280}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSendRequest || sendingRequest}>
                {sendingRequest ? 'Sending...' : 'Send request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
