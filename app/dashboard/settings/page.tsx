import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from '@/components/dashboard/settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: ownedConnections } = await supabase
    .from('connections')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  const { data: viewerConnections } = await supabase
    .from('connections')
    .select(`
      *,
      owner:profiles!connections_owner_id_fkey(id, display_name, avatar_url)
    `)
    .eq('viewer_id', user.id)

  const isOwner = profile?.is_owner || (ownedConnections && ownedConnections.length > 0)

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and connections</p>
      </div>

      <SettingsClient
        user={user}
        profile={profile}
        isOwner={isOwner || false}
        viewerConnections={viewerConnections || []}
      />
    </div>
  )
}
