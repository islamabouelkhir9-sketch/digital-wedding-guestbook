"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, LayoutDashboard, FolderOpen, Settings, LogOut, Presentation, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

// DashboardLayout.tsx
// - RTL-ready layout
// - Wedding theme: Pink → Purple diagonal soft gradient
// - Built-in dark-mode support (Tailwind's `dark` class assumed)
// - Off-canvas sidebar for mobile, fixed sidebar for desktop
// - Accessible controls and scroll-lock when sidebar open

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || false;
  });

  // redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // lock body scroll when sidebar open on small screens
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isSidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (e) {
      console.error('Sign out error', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b1220]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/submissions', icon: FolderOpen, label: 'Submissions' },
    { href: '/dashboard/slideshow', icon: Presentation, label: 'Slideshow' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={`${isDark ? 'dark' : ''}`} dir="rtl">
      {/* Theme variables + utility styles — you can move these to global.css */}
      <style jsx global>{`
        :root {
          /* Primary wedding palette (pink -> purple diagonal soft) */
          --wedding-pink: #fb7185;
          --wedding-purple: #7c3aed;
          --wedding-50: #fff8fb;
          --card-bg: #ffffff;
          --muted: #6b7280;
        }

        /* dark mode overrides */
        .dark {
          --card-bg: #071122;
          --wedding-50: #071122;
          --muted: #9ca3af;
        }

        /* gradient utility for brand */
        .brand-gradient {
          background-image: linear-gradient(135deg, var(--wedding-pink) 0%, var(--wedding-purple) 100%);
        }
      `}</style>

      <div className="flex h-screen bg-gray-50 dark:bg-[#04060a]">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto bg-white dark:bg-[#071122] border-r border-gray-200 dark:border-gray-800 shadow-lg ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
          aria-label="Sidebar navigation"
        >
          <div className="h-full flex flex-col justify-between overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 brand-gradient rounded-lg flex items-center justify-center shadow-sm">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 dark:text-gray-100">Guestbook</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dashboard</p>
                </div>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                      isActive
                        ? 'bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                    }`}>
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800">
              <div className="mb-3 p-3 bg-gray-50 dark:bg-[#07152a] rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.email}</p>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setIsDark((s) => !s)}
                  className="px-3 py-2 rounded-md bg-white/80 dark:bg-white/5 border border-gray-100 dark:border-gray-700 text-sm"
                >
                  Toggle Theme
                </button>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden px-2 py-2 rounded-md bg-white/80 dark:bg-white/5 border border-gray-100 dark:border-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile when sidebar is open */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0 h-full lg:ml-64">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 bg-white dark:bg-[#071122] border-b border-gray-100 dark:border-gray-800 lg:hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Open menu"
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Dashboard</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDark((s) => !s)}
                  aria-label="Toggle dark mode"
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  {isDark ? 'Light' : 'Dark'}
                </button>
              </div>
            </div>
          </header>

          {/* content wrapper — padding controlled by pages */}
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#04060a]">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
