import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GraduationCap, Camera, MessageCircle, Calendar, Heart } from 'lucide-react'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <GraduationCap className="w-4 h-4" />
            Stay Connected While Away
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-balance leading-tight">
            Share Your College Journey With the People Who Matter
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Keep family and friends updated with photos, status updates, and your schedule. 
            Because they miss you and want to know how you&apos;re doing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/auth/login">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Stay Connected</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Simple features designed to help you share your college life with loved ones
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm bg-background">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
                  <Camera className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Photo Gallery</h3>
                <p className="text-muted-foreground text-sm">
                  Share photos of your dorm, campus, and adventures with family
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-background">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto bg-accent/20 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-accent-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Status Updates</h3>
                <p className="text-muted-foreground text-sm">
                  Let everyone know what you&apos;re studying and how you&apos;re feeling
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-background">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto bg-chart-3/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-chart-3" />
                </div>
                <h3 className="font-semibold text-lg">Study Schedule</h3>
                <p className="text-muted-foreground text-sm">
                  Share your test and assignment schedule so they know when to cheer you on
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-background">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto bg-chart-5/20 rounded-xl flex items-center justify-center">
                  <Heart className="w-7 h-7 text-chart-5" />
                </div>
                <h3 className="font-semibold text-lg">Reactions & Comments</h3>
                <p className="text-muted-foreground text-sm">
                  Family can react and comment on your photos to show their support
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-balance">Ready to Keep Everyone in the Loop?</h2>
          <p className="text-muted-foreground text-lg">
            Sign up now and invite your family and friends to follow your journey.
          </p>
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/auth/login">Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">CollegeLife</span>
          </div>
          <p>Built with love for students and their families</p>
        </div>
      </footer>
    </main>
  )
}
