import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteManager } from '@/components/dashboard/invite-manager'

export default async function InvitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')

  // Check if user is owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_owner')
    .eq('id', user.id)
    .single()

  // Get user's invite codes
  const { data: inviteCodes } = await supabase
    .from('invite_codes')
    .select(`
      *,
      used_by_profile:profiles!invite_codes_used_by_fkey(display_name, avatar_url)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  // Get connected viewers
  const { data: connections } = await supabase
    .from('connections')
    .select(`
      *,
      viewer:profiles!connections_viewer_id_fkey(id, display_name, avatar_url)
    `)
    .eq('owner_id', user.id)

  // If not owner yet, set them as owner
  if (!profile?.is_owner) {
    await supabase
      .from('profiles')
      .update({ is_owner: true })
      .eq('id', user.id)
  }

  return (
    <InviteManager 
      userId={user.id}
      inviteCodes={inviteCodes || []}
      connections={connections || []}
    />
  )
}
