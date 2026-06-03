'use client'

import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand-logo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { 
  Camera, 
  MessageCircle, 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { NotificationBell } from '@/components/dashboard/notification-bell'

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  is_owner: boolean
}

interface DashboardNavProps {
  user: User
  profile: Profile | null
  isOwner: boolean
  connectedOwners: string[]
}

const ownerNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/photos', label: 'Photos', icon: Camera },
  { href: '/dashboard/status', label: 'Status', icon: MessageCircle },
  { href: '/dashboard/schedule', label: 'Schedule', icon: Calendar },
  { href: '/dashboard/invites', label: 'Invites', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const viewerNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/photos', label: 'Photos', icon: Camera },
  { href: '/dashboard/status', label: 'Status', icon: MessageCircle },
  { href: '/dashboard/schedule', label: 'Schedule', icon: Calendar },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardNav({ user, profile, isOwner, connectedOwners }: DashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = isOwner ? ownerNavItems : viewerNavItems
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User'
  const initials = displayName.slice(0, 2).toUpperCase()

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandLogo
            width={28}
            height={28}
            className="w-7 h-7"
          />
          <span className="font-bold text-lg">CollegeLife</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {isOwner ? 'Owner' : 'Viewer'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b p-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandLogo
            width={28}
            height={28}
            className="w-7 h-7"
          />
          <span className="font-bold">CollegeLife</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="lg:hidden h-16" /> {/* Spacer for mobile */}

      {/* Desktop Nav */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r">
        <NavContent />
      </aside>
    </>
  )
}
