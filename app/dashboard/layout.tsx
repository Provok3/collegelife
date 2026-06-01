import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user has any connections as owner (they are an owner)
  const { data: ownerConnections } = await supabase
    .from('connections')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  // Check if user is connected to any owner (they are a viewer)  
  const { data: viewerConnections } = await supabase
    .from('connections')
    .select('owner_id')
    .eq('viewer_id', user.id)

  const isOwner = profile?.is_owner || (ownerConnections && ownerConnections.length > 0)
  const connectedOwners = viewerConnections?.map(c => c.owner_id) || []

  return (
    <div className="min-h-screen flex">
      <DashboardNav 
        user={user} 
        profile={profile} 
        isOwner={isOwner || false}
        connectedOwners={connectedOwners}
      />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
