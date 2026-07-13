import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetTracker } from '@/components/dashboard/budget-tracker'

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Check if owner (student). Budget is a student-only, private feature.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_owner')
    .eq('id', user.id)
    .single()

  const { data: ownerConnections } = await supabase
    .from('connections')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  const hasConnectedViewers = !!(ownerConnections && ownerConnections.length > 0)
  const isOwner = profile?.is_owner || hasConnectedViewers

  // First day of the current month, e.g. "2026-07-01".
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonth = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`
  const monthLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  let purchases = []
  let budgetAmount: number | null = null
  let moneyRequests = []
  let hasPayHandles = false

  if (isOwner) {
    const [purchasesRes, budgetRes, requestsRes, handlesRes] = await Promise.all([
      supabase
        .from('purchases')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('budgets')
        .select('amount')
        .eq('owner_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle(),
      supabase
        .from('money_requests')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payment_handles')
        .select('venmo, cashtag, zelle, apple_cash')
        .eq('owner_id', user.id)
        .maybeSingle(),
    ])

    purchases = purchasesRes.data || []
    budgetAmount = budgetRes.data ? Number(budgetRes.data.amount) : null
    moneyRequests = requestsRes.data || []
    const h = handlesRes.data
    hasPayHandles = !!(h && (h.venmo || h.cashtag || h.zelle || h.apple_cash))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Budget</h1>
          <p className="text-muted-foreground mt-1">
            Set a monthly budget, track your spending, and ask family for help when you need it
          </p>
        </div>
      </div>

      {isOwner ? (
        <BudgetTracker
          purchases={purchases}
          moneyRequests={moneyRequests}
          userId={user.id}
          budgetAmount={budgetAmount}
          currentMonth={currentMonth}
          monthLabel={monthLabel}
          hasPayHandles={hasPayHandles}
          hasConnectedViewers={hasConnectedViewers}
        />
      ) : (
        <p className="text-muted-foreground">The budget tracker is only available for students.</p>
      )}
    </div>
  )
}
