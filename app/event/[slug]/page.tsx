'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Heart, Sparkles, LogIn } from 'lucide-react';
import SubmissionModal from '@/components/SubmissionModal';
import confetti from 'canvas-confetti';

interface Event {
  id: string;
  title: string;
  slug: string;
  settings: {
    show_all_submissions?: boolean;
    accent_color?: string;
  };
  background_image_url: string | null;
}

export default function EventPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [accentColor, setAccentColor] = useState('gold');

  useEffect(() => {
    loadEventData();
  }, [slug]);

  const loadEventData = async () => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*, background_image_url')
        .eq('slug', slug || '')
        .single();

      if (error) throw error;

      setEvent(eventData as any);
      setAccentColor((eventData as any)?.settings?.accent_color || 'gold');
    } catch (err) {
      console.error('Error loading event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionSuccess = () => {
    setShowModal(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [accentColor === 'gold' ? '#FFD700' : '#FF7F50', '#FFFFFF', '#FFC0CB'],
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setLoginError('Invalid credentials. Please try again.');
    setShowLogin(false);
    router.push('/dashboard');
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <Sparkles className="w-10 h-10 animate-spin mx-auto mb-4 text-purple-500" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );

  if (!event)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Event Not Found</h1>
          <p className="text-gray-600">The event you're looking for doesn't exist.</p>
        </div>
      </div>
    );

  const backgroundImageStyle = event.background_image_url
    ? { backgroundImage: `url('${event.background_image_url}')` }
    : {};

  return (
    <main
      className={`min-h-screen bg-cover bg-center bg-fixed transition-all duration-700 ${
        !event.background_image_url ? 'bg-gradient-to-br from-pink-50 via-white to-purple-50' : ''
      }`}
      style={backgroundImageStyle}
    >
      <div className="min-h-screen w-full bg-black/30 backdrop-brightness-75">
        
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-semibold text-gray-900">{event.title}</h1>
                <div className="flex items-center text-sm text-gray-600 gap-1">
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      accentColor === 'gold'
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-pink-500 fill-pink-500'
                    }`}
                  />
                  <span>Share your love and best wishes</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>

                <button
                  onClick={() => setShowModal(true)}
                  className={`hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-white shadow-md transition-all duration-200 ${
                    accentColor === 'gold'
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600'
                      : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Leave a Message
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main CTA Section */}
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-center bg-white/70 backdrop-blur-md p-8 rounded-xl shadow-sm">
            <MessageSquare className="w-14 h-14 mx-auto mb-3 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Share your best wishes</h2>
            <p className="text-gray-500 mb-5 text-sm">Leave a message, photo, or video for the couple!</p>
            <button
              onClick={() => setShowModal(true)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full shadow-md text-white transition-all ${
                accentColor === 'gold'
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600'
                  : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Leave a Message
            </button>
          </div>
        </div>

        {/* Mobile Sticky Button */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 border-t border-gray-200 backdrop-blur-md z-50">
          <button
            onClick={() => setShowModal(true)}
            className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-full text-white shadow-lg active:scale-95 transition ${
              accentColor === 'gold'
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                : 'bg-gradient-to-r from-pink-500 to-rose-500'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Leave a Message
          </button>
        </div>

        {/* Submission Modal */}
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
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative">
              <button
                className="absolute top-3 right-4 text-gray-400 hover:text-gray-600"
                onClick={() => setShowLogin(false)}
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold mb-4 text-center text-gray-800">Login</h2>
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
                />
                {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-400 to-purple-500 text-white py-2.5 rounded-lg font-semibold hover:from-pink-500 hover:to-purple-600 transition text-sm"
                >
                  Sign In
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
