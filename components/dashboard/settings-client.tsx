'use client'

import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThemeModeToggle } from '@/components/theme-mode-toggle'
import { RedeemCodeForm } from '@/components/dashboard/redeem-code-form'
import { Users, UserPlus, Settings, Accessibility } from 'lucide-react'

interface Profile {
  display_name: string | null
  avatar_url: string | null
  is_owner: boolean
}

interface ViewerConnection {
  id: string
  owner?: {
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface SettingsClientProps {
  user: User
  profile: Profile | null
  isOwner: boolean
  viewerConnections: ViewerConnection[]
}

export function SettingsClient({
  user,
  profile,
  isOwner,
  viewerConnections,
}: SettingsClientProps) {
  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList>
        <TabsTrigger value="general" className="gap-2">
          <Settings className="size-4" />
          General
        </TabsTrigger>
        <TabsTrigger value="accessibility" className="gap-2">
          <Accessibility className="size-4" />
          Accessibility
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-8 mt-0">
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

        {viewerConnections.length > 0 && (
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

        <RedeemCodeForm
          userId={user.id}
          hasConnection={viewerConnections.length > 0}
        />
      </TabsContent>

      <TabsContent value="accessibility" className="space-y-8 mt-0">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Choose light or dark mode for the app. Your preference is saved on this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Color mode</p>
              <ThemeModeToggle />
            </div>
            <p className="text-sm text-muted-foreground">
              Dark mode is the default. Light mode keeps dashboard stat cards in dark blue with
              easier-to-read labels.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
