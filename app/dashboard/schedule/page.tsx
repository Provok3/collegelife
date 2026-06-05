import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleCalendar } from '@/components/dashboard/schedule-calendar'

export default async function SchedulePage() {
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

  // Get schedule items based on role
  let scheduleItems = []
  let calendarSources = []
  
  if (isOwner) {
    const { data } = await supabase
      .from('schedule_items')
      .select('*')
      .eq('owner_id', user.id)
      .order('start_date', { ascending: true })
    scheduleItems = data || []

    const { data: sources } = await supabase
      .from('calendar_sources')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    calendarSources = sources || []
  } else {
    // Get from connected owners
    const { data: connections } = await supabase
      .from('connections')
      .select('owner_id')
      .eq('viewer_id', user.id)

    if (connections && connections.length > 0) {
      const ownerIds = connections.map(c => c.owner_id)
      const { data } = await supabase
        .from('schedule_items')
        .select(`
          *,
          owner:profiles!schedule_items_owner_id_fkey(display_name, avatar_url)
        `)
        .in('owner_id', ownerIds)
        .order('start_date', { ascending: true })
      scheduleItems = data || []
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            {isOwner ? 'Manage classes, work, studying, and social plans' : 'View upcoming events'}
          </p>
        </div>
      </div>

      <ScheduleCalendar
        items={scheduleItems}
        sources={calendarSources}
        userId={user.id}
        isOwner={isOwner}
      />
    </div>
  )
}
