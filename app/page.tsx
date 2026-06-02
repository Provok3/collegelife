'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    });
  };

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
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="CollegeLife Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <h1 className="text-3xl font-black text-white">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  CollegeLife
                </span>
              </h1>
            </div>
            <button
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:shadow-lg hover:shadow-primary/50 transition-smooth disabled:opacity-60"
            >
              {isSigningIn ? 'Signing in...' : 'Sign In'}
            </button>
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
                <button
                  onClick={handleGoogleLogin}
                  disabled={isSigningIn}
                  className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg font-bold hover:shadow-xl hover:shadow-primary/50 transition-smooth disabled:opacity-60"
                >
                  {isSigningIn ? 'Signing in...' : 'Get Started'}
                </button>
                <button 
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-3.5 border-2 border-primary/60 text-white rounded-lg font-bold hover:border-primary hover:bg-primary/5 transition-smooth"
                >
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
          <div id="how-it-works" className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-primary/30 rounded-2xl p-12 mb-24 scroll-mt-24 backdrop-blur-xl">
            <div className="max-w-3xl">
              <h3 className="text-3xl font-bold text-white mb-8">How It Works</h3>
              <div className="space-y-8">
                <div className="flex gap-5 items-start">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold flex-shrink-0 text-white">
                    1
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Sign in with Google</h4>
                    <p className="text-gray-300">Quick and secure — no passwords needed</p>
                  </div>
                </div>
                <div className="flex gap-5 items-start">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold flex-shrink-0 text-white">
                    2
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Generate invite codes</h4>
                    <p className="text-gray-300">Create personal codes to share with family and friends</p>
                  </div>
                </div>
                <div className="flex gap-5 items-start">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold flex-shrink-0 text-white">
                    3
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">They join and stay connected</h4>
                    <p className="text-gray-300">They sign in with Google, enter your code, and instantly see all your updates</p>
                  </div>
                </div>
              </div>

              {/* Sign in CTA inline */}
              <div className="mt-10 pt-8 border-t border-slate-700">
                <p className="text-white font-semibold mb-4">Ready? Start here:</p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isSigningIn}
                  className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-semibold transition-smooth hover:shadow-lg disabled:opacity-60"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isSigningIn ? 'Redirecting...' : 'Sign in with Google'}
                </button>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center py-20 mb-12">
            <h3 className="text-4xl font-bold text-white mb-4">Ready to connect?</h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Start sharing your college journey with the people who care about you most.
            </p>
            <button
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="inline-flex items-center gap-3 px-10 py-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold hover:shadow-2xl transition-smooth text-lg disabled:opacity-60"
            >
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isSigningIn ? 'Redirecting...' : 'Sign in with Google'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
