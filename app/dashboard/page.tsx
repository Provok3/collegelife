import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, MessageCircle, Calendar, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get profile to check if owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check ownership
  const { data: ownerConnections } = await supabase
    .from('connections')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  const isOwner = profile?.is_owner || (ownerConnections && ownerConnections.length > 0)

  // Get recent data based on role
  let recentPhotos = []
  let recentStatus = null
  let upcomingSchedule = []
  let connectionCount = 0

  if (isOwner) {
    // Owner sees their own content
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4)
    recentPhotos = photos || []

    const { data: status } = await supabase
      .from('statuses')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    recentStatus = status

    const { data: schedule } = await supabase
      .from('schedule_items')
      .select('*')
      .eq('owner_id', user.id)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(3)
    upcomingSchedule = schedule || []

    const { count } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
    connectionCount = count || 0
  } else {
    // Viewer sees content from connected owners
    const { data: connections } = await supabase
      .from('connections')
      .select('owner_id')
      .eq('viewer_id', user.id)

    if (connections && connections.length > 0) {
      const ownerIds = connections.map(c => c.owner_id)

      const { data: photos } = await supabase
        .from('photos')
        .select('*')
        .in('owner_id', ownerIds)
        .order('created_at', { ascending: false })
        .limit(4)
      recentPhotos = photos || []

      const { data: status } = await supabase
        .from('statuses')
        .select('*')
        .in('owner_id', ownerIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      recentStatus = status

      const { data: schedule } = await supabase
        .from('schedule_items')
        .select('*')
        .in('owner_id', ownerIds)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(3)
      upcomingSchedule = schedule || []
    }
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'there'

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {displayName}!</h1>
        <p className="text-muted-foreground mt-1">
          {isOwner 
            ? "Here's what's happening with your CollegeLife" 
            : "Here's the latest updates from your student"}
        </p>
      </div>

      {/* Quick Actions for Owner */}
      {isOwner && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/dashboard/photos">
              <Camera className="w-6 h-6 text-primary" />
              <span>Add Photo</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/dashboard/status">
              <MessageCircle className="w-6 h-6 text-accent-foreground" />
              <span>Update Status</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/dashboard/schedule">
              <Calendar className="w-6 h-6 text-chart-3" />
              <span>Add Event</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/dashboard/invites">
              <Users className="w-6 h-6 text-chart-5" />
              <span>Invite People</span>
            </Link>
          </Button>
        </div>
      )}

      {/* Stats Cards for Owner */}
      {isOwner && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Photos Shared</CardDescription>
              <CardTitle className="text-3xl">{recentPhotos.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Connected People</CardDescription>
              <CardTitle className="text-3xl">{connectionCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Upcoming Events</CardDescription>
              <CardTitle className="text-3xl">{upcomingSchedule.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Mood</CardDescription>
              <CardTitle className="text-3xl">{recentStatus?.mood || '—'}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Recent Status */}
      {recentStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-accent-foreground" />
                Latest Status
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/status">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{recentStatus.content}</p>
            {recentStatus.studying_for && (
              <p className="text-muted-foreground mt-2">
                Studying for: <span className="text-foreground font-medium">{recentStatus.studying_for}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(recentStatus.created_at), { addSuffix: true })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Schedule */}
      {upcomingSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-chart-3" />
                Upcoming Schedule
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/schedule">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSchedule.map((item: { id: string; title: string; item_type: string; start_date: string }) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">{item.item_type}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(item.start_date), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Content State for Viewer */}
      {!isOwner && !recentStatus && recentPhotos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Content Yet</h3>
            <p className="text-muted-foreground">
              Your student hasn&apos;t shared any updates yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Setup Prompt for New Owner */}
      {isOwner && !recentStatus && recentPhotos.length === 0 && connectionCount === 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Get Started!</h3>
            <p className="text-muted-foreground mb-4">
              Welcome to CollegeLife! Start by inviting your family and friends, then share your first photo or status update.
            </p>
            <Button asChild>
              <Link href="/dashboard/invites">Create Your First Invite</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
