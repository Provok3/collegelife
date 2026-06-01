import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Users, UserPlus, Settings } from 'lucide-react'
import Link from 'next/link'
import { RedeemCodeForm } from '@/components/dashboard/redeem-code-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user is an owner
  const { data: ownedConnections } = await supabase
    .from('connections')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  // Get connections as viewer
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

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {(profile?.display_name || user.email || 'U').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{profile?.display_name || 'No name set'}</p>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Role: {isOwner ? 'Owner (Student)' : 'Viewer (Family/Friend)'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owner Setup */}
      {!isOwner && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Want to be a Student Owner?</CardTitle>
            <CardDescription>
              If you&apos;re a student who wants to share with your own family, you can become an owner
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/invites">
                <UserPlus className="w-4 h-4 mr-2" />
                Set Up as Owner
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connections as Viewer */}
      {viewerConnections && viewerConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Students You Follow
            </CardTitle>
            <CardDescription>
              You can view updates from these students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {viewerConnections.map((connection) => (
                <div 
                  key={connection.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <Avatar>
                    <AvatarImage src={connection.owner?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(connection.owner?.display_name || 'S').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{connection.owner?.display_name || 'Student'}</p>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redeem Code Form */}
      <RedeemCodeForm 
        userId={user.id} 
        hasConnection={viewerConnections ? viewerConnections.length > 0 : false} 
      />
    </div>
  )
}
