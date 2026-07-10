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

  const isOwner = profile?.is_owner || (ownerConnections && ownerConnections.length > 0)

  let purchases = []

  if (isOwner) {
    const { data } = await supabase
      .from('purchases')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    purchases = data || []
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Budget</h1>
          <p className="text-muted-foreground mt-1">
            Track your spending and keep a running total of your purchases
          </p>
        </div>
      </div>

      {isOwner ? (
        <BudgetTracker purchases={purchases} userId={user.id} />
      ) : (
        <p className="text-muted-foreground">The budget tracker is only available for students.</p>
      )}
    </div>
  )
}
