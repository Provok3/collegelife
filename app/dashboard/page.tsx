import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Camera, MessageCircle, Calendar, Users, Settings, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get profile
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
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'there'

  // Get recent data based on role
  let recentPhotos = []
  let recentStatus = null
  let upcomingSchedule = []
  let connectionCount = 0

  if (isOwner) {
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
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
        .limit(6)
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

  return (
    <div className="space-y-8">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/5 border border-white/10 p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white">
            Hey {displayName}! 👋
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {isOwner 
              ? 'Stay connected with your loved ones' 
              : 'Checking in on your student today'}
          </p>
        </div>
      </div>

      {/* Quick Actions Grid - Bento Style */}
      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/dashboard/photos"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 p-6 hover:border-primary/60 transition-smooth hover:shadow-lg hover:shadow-primary/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/30 flex items-center justify-center group-hover:scale-110 transition-smooth">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-white">Photos</p>
                <p className="text-xs text-muted-foreground">Share moments</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/dashboard/status"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-secondary/15 to-secondary/5 border border-secondary/30 p-6 hover:border-secondary/60 transition-smooth hover:shadow-lg hover:shadow-secondary/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/30 flex items-center justify-center group-hover:scale-110 transition-smooth">
                <MessageCircle className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-white">Status</p>
                <p className="text-xs text-muted-foreground">How are you?</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/dashboard/schedule"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/30 p-6 hover:border-accent/60 transition-smooth hover:shadow-lg hover:shadow-accent/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/30 flex items-center justify-center group-hover:scale-110 transition-smooth">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-white">Schedule</p>
                <p className="text-xs text-muted-foreground">Add events</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/dashboard/invites"
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-chart-1/15 to-chart-1/5 border border-chart-1/30 p-6 hover:border-chart-1/60 transition-smooth hover:shadow-lg hover:shadow-chart-1/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-chart-1/30 flex items-center justify-center group-hover:scale-110 transition-smooth">
                <Users className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="font-semibold text-white">Invite</p>
                <p className="text-xs text-muted-foreground">Share codes</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Stats Cards - Bento */}
      {isOwner && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl p-6 backdrop-blur-xl hover:border-white/20 transition-smooth">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-sm font-medium">Connected</p>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-black text-white">{connectionCount}</p>
            <p className="text-xs text-muted-foreground mt-2">people staying connected</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl p-6 backdrop-blur-xl hover:border-white/20 transition-smooth">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-sm font-medium">Shared</p>
              <Camera className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-3xl font-black text-white">{recentPhotos.length}</p>
            <p className="text-xs text-muted-foreground mt-2">photos and stories</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl p-6 backdrop-blur-xl hover:border-white/20 transition-smooth">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-sm font-medium">Upcoming</p>
              <Calendar className="w-4 h-4 text-accent" />
            </div>
            <p className="text-3xl font-black text-white">{upcomingSchedule.length}</p>
            <p className="text-xs text-muted-foreground mt-2">events coming up</p>
          </div>
        </div>
      )}

      {/* Latest Status - Large Card */}
      {recentStatus && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-8 backdrop-blur-xl hover:border-white/20 transition-smooth">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-white">Latest Update</h3>
            </div>
            <Link href="/dashboard/status" className="text-sm text-primary hover:text-primary/80 transition-smooth font-semibold">
              View All
            </Link>
          </div>
          <p className="text-xl text-white leading-relaxed">{recentStatus.content}</p>
          {recentStatus.studying_for && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-white/70">Currently studying:</p>
              <p className="text-lg font-semibold text-white mt-1">{recentStatus.studying_for}</p>
            </div>
          )}
          <p className="text-xs text-white/70 mt-4">
            {formatDistanceToNow(new Date(recentStatus.created_at), { addSuffix: true })}
          </p>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingSchedule.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-8 backdrop-blur-xl hover:border-white/20 transition-smooth">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-bold text-white">Up Next</h3>
            </div>
            <Link href="/dashboard/schedule" className="text-sm text-primary hover:text-primary/80 transition-smooth font-semibold">
              Full Schedule
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingSchedule.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-smooth">
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="text-sm text-muted-foreground capitalize mt-1">{item.item_type}</p>
                </div>
                <p className="text-sm text-accent font-medium">
                  {formatDistanceToNow(new Date(item.start_date), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State or Setup */}
      {isOwner && !recentStatus && recentPhotos.length === 0 && connectionCount === 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/5 border border-white/10 p-12 backdrop-blur-xl text-center">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10"></div>
          <div className="relative z-10 space-y-4">
            <h3 className="text-2xl font-bold text-white">Welcome to CollegeLife! 🎓</h3>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Start by inviting your family and friends, then share your first photo, status, or schedule event.
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Link 
                href="/dashboard/invites"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:shadow-lg hover:shadow-primary/50 transition-smooth"
              >
                <Plus className="w-5 h-5" />
                Create Invite
              </Link>
              <Link 
                href="/dashboard/photos"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary/60 text-white rounded-lg font-bold hover:border-primary hover:bg-primary/5 transition-smooth"
              >
                <Camera className="w-5 h-5" />
                Upload Photo
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
