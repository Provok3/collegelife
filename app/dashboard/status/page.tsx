import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatusFeed } from '@/components/dashboard/status-feed'
import { StatusForm } from '@/components/dashboard/status-form'
import { fetchStatusesForFeed, type FeedStatus } from '@/lib/status/fetch-statuses'

export default async function StatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')

  // Check if owner
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

  // Get statuses (with nested comments) based on role
  let statuses: FeedStatus[] = []

  if (isOwner) {
    statuses = await fetchStatusesForFeed(supabase, { ownerId: user.id })
  } else {
    const { data: connections } = await supabase
      .from('connections')
      .select('owner_id')
      .eq('viewer_id', user.id)

    if (connections && connections.length > 0) {
      const ownerIds = connections.map((c) => c.owner_id)
      statuses = await fetchStatusesForFeed(supabase, { ownerIds })
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Status Updates</h1>
        <p className="text-muted-foreground mt-1">
          {isOwner ? "Share what you're up to" : 'See how your student is doing'}
        </p>
      </div>

      {isOwner && <StatusForm userId={user.id} />}

      <StatusFeed statuses={statuses} userId={user.id} isOwner={isOwner} />
    </div>
  )
}
