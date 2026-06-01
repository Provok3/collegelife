'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setIsLoggedIn(true);
          router.push('/dashboard');
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [supabase.auth, router]);

  if (isLoading) return null;

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-secondary/15 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl opacity-40"></div>
      </div>

      {/* Content */}
      <div className="relative pt-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Navigation */}
          <nav className="flex justify-between items-center mb-24 animate-slide-in">
            <h1 className="text-3xl font-black text-white">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                CollegeLife
              </span>
            </h1>
            <Link
              href="/auth/login"
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:shadow-lg hover:shadow-primary/50 transition-smooth"
            >
              Sign In
            </Link>
          </nav>

          {/* Hero Section */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
            <div className="space-y-8">
              <div className="space-y-4 animate-slide-in">
                <h2 className="text-5xl lg:text-6xl font-black text-white leading-tight">
                  Share Your
                  <br />
                  <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    College
                  </span>
                  <br />
                  Experience
                </h2>
                <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                  Post your best moments, share what you&apos;re studying, and keep family and friends in the loop about your college life.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Link
                  href="/auth/login"
                  className="px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg font-bold hover:shadow-xl hover:shadow-primary/50 transition-smooth"
                >
                  Get Started
                </Link>
                <button className="px-8 py-3.5 border-2 border-primary/60 text-white rounded-lg font-bold hover:border-primary hover:bg-primary/5 transition-smooth">
                  How It Works
                </button>
              </div>
            </div>

            {/* Bento Grid Preview */}
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/30 rounded-2xl p-6 backdrop-blur-xl animate-slide-in hover:border-primary/60 transition-smooth cursor-pointer">
                  <div className="w-12 h-12 bg-primary rounded-lg mb-4 animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-primary/50 rounded-full w-3/4"></div>
                    <div className="h-2 bg-primary/30 rounded-full w-1/2"></div>
                  </div>
                </div>
                <div
                  className="bg-gradient-to-br from-secondary/20 via-secondary/5 to-transparent border border-secondary/30 rounded-2xl p-6 backdrop-blur-xl hover:border-secondary/60 transition-smooth cursor-pointer"
                  style={{ animationDelay: '100ms' }}
                >
                  <div className="w-12 h-12 bg-secondary rounded-lg mb-4 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-secondary/50 rounded-full w-2/3"></div>
                    <div className="h-2 bg-secondary/30 rounded-full w-1/2"></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4 pt-8">
                <div
                  className="bg-gradient-to-br from-accent/20 via-accent/5 to-transparent border border-accent/30 rounded-2xl p-6 backdrop-blur-xl row-span-2 hover:border-accent/60 transition-smooth cursor-pointer"
                  style={{ animationDelay: '200ms' }}
                >
                  <div className="w-16 h-16 bg-accent rounded-lg mb-4 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-accent/50 rounded-full w-4/5"></div>
                    <div className="h-3 bg-accent/50 rounded-full w-3/5"></div>
                    <div className="h-2 bg-accent/30 rounded-full mt-4 w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Bento Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-24">
            {[
              {
                title: 'Photos & Stories',
                desc: 'Share your campus moments with reactions and comments',
                icon: '📸',
                color: 'from-primary',
                delay: 0,
              },
              {
                title: 'Status Updates',
                desc: 'Post what you&apos;re studying and how you&apos;re feeling today',
                icon: '💭',
                color: 'from-secondary',
                delay: 100,
              },
              {
                title: 'Study Schedule',
                desc: 'Share your tests and assignments with the calendar',
                icon: '📅',
                color: 'from-accent',
                delay: 200,
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className={`bg-gradient-to-br ${feature.color} to-transparent/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl hover:border-white/30 transition-smooth animate-slide-in group cursor-pointer`}
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-smooth">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border border-white/10 rounded-2xl p-12 mb-24 backdrop-blur-xl">
            <div className="max-w-3xl">
              <h3 className="text-3xl font-bold text-white mb-8">How It Works</h3>
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Sign in with Google</h4>
                    <p className="text-muted-foreground">Quick and secure authentication in seconds</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Generate invite codes</h4>
                    <p className="text-muted-foreground">Create codes to share with family and friends</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">They join and stay connected</h4>
                    <p className="text-muted-foreground">They sign in, enter your code, and see all your updates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center py-20 mb-12">
            <h3 className="text-4xl font-bold text-white mb-4">Ready to connect?</h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Start sharing your college journey with the people who care about you most.
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-10 py-4 bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground rounded-lg font-bold hover:shadow-2xl hover:shadow-primary/50 transition-smooth text-lg"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
