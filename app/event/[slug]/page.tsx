'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Heart, Sparkles, LogIn, X, Moon, Sun } from 'lucide-react';
import SubmissionModal from '@/components/SubmissionModal';
import confetti from 'canvas-confetti';

interface EventData {
  id: string;
  title: string;
  slug: string;
  settings?: {
    show_all_submissions?: boolean;
    accent_color?: string;
  } | null;
  background_image_url?: string | null;
}

export default function EventPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [accentColor, setAccentColor] = useState<'gold' | 'pink' | 'custom'>('gold');

  // dark mode state (manual toggle placed in mobile sticky bar)
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const saved = localStorage.getItem('guestbook-theme');
      if (saved) return saved === 'dark';
      return false; // default light
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // keep body scroll unlocked on initial mount
    document.body.style.overflow = 'auto';
  }, []);

  useEffect(() => {
    loadEventData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // lock scroll when modals are open
  useEffect(() => {
    if (showModal || showLogin) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [showModal, showLogin]);

  useEffect(() => {
    try {
      localStorage.setItem('guestbook-theme', isDark ? 'dark' : 'light');
    } catch (e) {
      // ignore
    }
  }, [isDark]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('id, title, slug, settings, background_image_url')
        .eq('slug', slug || '')
        .single();

      if (error) throw error;

      setEvent(eventData as EventData);

      const dbAccent = (eventData as any)?.settings?.accent_color ?? 'gold';
      setAccentColor(dbAccent === 'pink' ? 'pink' : dbAccent === 'gold' ? 'gold' : 'custom');
    } catch (err) {
      console.error('Error loading event:', err);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionSuccess = () => {
    setShowModal(false);
    // confetti tuned to the accent color
    const colors = accentColor === 'gold' ? ['#FFD700', '#FFF4C2', '#FFFFFF'] : ['#FF7F50', '#FFC0CB', '#FFFFFF'];
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoginError('Invalid credentials. Please try again.');
        return;
      }
      setShowLogin(false);
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error', err);
      setLoginError('Login failed.');
    }
  };

  // UI helpers for accent classes
  const accentButtonClasses = () => {
    if (accentColor === 'gold')
      return 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600';
    if (accentColor === 'pink')
      return 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600';
    return 'bg-gradient-to-br from-pink-400 to-purple-600 hover:from-pink-500 hover:to-purple-700';
  };

  // Loading / Not found screens
  if (loading)
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-neutral-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'}`}>
        <div className="text-center">
          <Sparkles className={`w-8 h-8 animate-spin mx-auto mb-3 ${isDark ? 'text-white' : 'text-purple-500'}`} />
          <p className={`${isDark ? 'text-neutral-300' : 'text-gray-600'}`}>Loading event...</p>
        </div>
      </div>
    );

  if (!event)
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-neutral-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'}`}>
        <div className="text-center p-6">
          <h1 className={`${isDark ? 'text-white' : 'text-gray-800'} text-xl font-semibold mb-2`}>Event Not Found</h1>
          <p className={`${isDark ? 'text-neutral-300' : 'text-gray-600'}`}>The event you're looking for doesn't exist.</p>
        </div>
      </div>
    );

  const backgroundImageStyle = event.background_image_url
    ? { backgroundImage: `url('${event.background_image_url}')` }
    : undefined;

  return (
    <div className={isDark ? 'dark' : ''}>
      <main
        className={`min-h-screen bg-cover bg-center bg-fixed transition-all duration-700 ${
          !event.background_image_url ? 'bg-gradient-to-br from-pink-50 via-white to-purple-50' : ''
        } dark:bg-neutral-900`}
        style={backgroundImageStyle as any}
      >
        <div className="min-h-screen w-full bg-black/40 dark:bg-black/60 backdrop-brightness-75 flex flex-col">

          {/* Header */}
          <header className={`bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800 sticky top-0 z-40`}> 
            <div className="max-w-6xl mx-auto px-4 py-2 sm:py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0 flex-1">
                  <h1 className={`text-lg md:text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{event.title}</h1>
                  <div className={`flex items-center text-xs sm:text-sm ${isDark ? 'text-neutral-300' : 'text-gray-600'} gap-1`}>
                    <Heart className={`w-3 h-3 ${accentColor === 'gold' ? 'text-yellow-400' : 'text-pink-500'}`} />
                    <span className="hidden sm:inline">Share your love and best wishes</span>
                    <span className="sm:hidden">Best Wishes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLogin(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${isDark ? 'text-neutral-200 bg-white/5 hover:bg-white/6' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                    aria-label="Admin login"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Login</span>
                    <span className="sm:hidden">Admin</span>
                  </button>

                  {/* Desktop CTA visible on sm+ */}
                  <button
                    onClick={() => setShowModal(true)}
                    className={`hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-white shadow-md transition-all duration-200 ${accentButtonClasses()}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Leave a Message
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main CTA area */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className={`text-center ${isDark ? 'bg-neutral-800/60' : 'bg-white/80'} backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-xl max-w-sm sm:max-w-md mx-auto`}> 
              <MessageSquare className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 ${isDark ? 'text-white/70' : 'text-gray-400'}`} />
              <h2 className={`${isDark ? 'text-white' : 'text-gray-800'} text-xl sm:text-2xl font-bold mb-1 sm:mb-2`}>{event.title}</h2>
              <p className={`${isDark ? 'text-neutral-300' : 'text-gray-600'} text-sm mb-4 sm:mb-5`}>Leave a private message, photo, or video for the couple — your message will not be shown publicly.</p>

              {/* Desktop CTA button duplicate for accessibility */}
              <div className="hidden sm:block">
                <button onClick={() => setShowModal(true)} className={`inline-flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-full shadow-lg text-white transition ${accentButtonClasses()}`}>
                  <MessageSquare className="w-5 h-5" />
                  Leave a Message
                </button>
              </div>
            </div>
          </div>

          {/* Mobile sticky bottom bar (contains CTA + dark toggle) */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/90 dark:bg-neutral-900/90 border-t border-gray-200 dark:border-neutral-800 backdrop-blur-md z-50 flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-full text-white shadow-lg active:scale-[0.99] transition ${accentButtonClasses()}`}
              aria-label="Leave a message"
            >
              <MessageSquare className="w-5 h-5" />
              Leave a Message
            </button>

            {/* Dark mode toggle placed in mobile sticky bar as requested */}
            <button
              onClick={() => setIsDark((s) => !s)}
              aria-label="Toggle dark mode"
              className={`p-2 rounded-full border ${isDark ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-white text-gray-700 border-gray-200'}`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Submission modal (user can submit) */}
          {showModal && (
            <SubmissionModal
              eventId={event.id}
              accentColor={accentColor}
              onClose={() => setShowModal(false)}
              onSuccess={handleSubmissionSuccess}
            />
          )}

          {/* Login Modal */}
          {showLogin && (
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 z-50">
              <div className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-6 w-full max-w-sm relative`}> 
                <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1" onClick={() => setShowLogin(false)} aria-label="Close login">
                  <X className="w-6 h-6" />
                </button>
                <h2 className={`text-xl font-semibold mb-5 text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>Admin Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 ${isDark ? 'bg-neutral-800 border-neutral-700 text-white focus:ring-purple-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-400'}`}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 ${isDark ? 'bg-neutral-800 border-neutral-700 text-white focus:ring-purple-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-400'}`}
                  />
                  {loginError && <p className="text-red-500 text-sm mt-1">{loginError}</p>}
                  <button type="submit" className={`w-full ${accentButtonClasses()} text-white py-3 rounded-xl font-semibold mt-2`}>Sign In</button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
