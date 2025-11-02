'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Heart, Sparkles, LogIn, X } from 'lucide-react'; 
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
    // التأكد من إزالة scroll-lock عند التحميل
    document.body.style.overflow = 'auto'; 
  }, [slug]);

  // 💡 إضافة useEffect لمعالجة scroll-lock عند فتح المودال
  useEffect(() => {
    if (showModal || showLogin) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [showModal, showLogin]);

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

  // --- شاشات التحميل والخطأ ---
  // 💡 تقليص حجم الـ Loader لجعلها أقل إزعاجاً
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <Sparkles className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-500" />
          <p className="text-sm text-gray-600">Loading event...</p>
        </div>
      </div>
    );

  if (!event)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center p-6">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Event Not Found</h1>
          <p className="text-gray-600">The event you're looking for doesn't exist.</p>
        </div>
      </div>
    );

  const backgroundImageStyle = event.background_image_url
    ? { backgroundImage: `url('${event.background_image_url}')` }
    : {};

  // --- الصفحة الرئيسية (Guest View) ---

  return (
    <main
      className={`min-h-screen bg-cover bg-center bg-fixed transition-all duration-700 ${
        !event.background_image_url ? 'bg-gradient-to-br from-pink-50 via-white to-purple-50' : ''
      }`}
      style={backgroundImageStyle}
    >
      {/* 💡 زيادة كثافة الخلفية لضمان وضوح النصوص */}
      <div className="min-h-screen w-full bg-black/40 backdrop-brightness-75 flex flex-col"> 
        
        {/* Header: تم تحسين الـ Responsive */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0 flex-1"> 
                <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{event.title}</h1> 
                <div className="flex items-center text-xs sm:text-sm text-gray-600 gap-1">
                  <Heart
                    className={`w-3 h-3 ${
                      accentColor === 'gold'
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-pink-500 fill-pink-500'
                    }`}
                  />
                  <span className="hidden sm:inline">Share your love and best wishes</span>
                  <span className="sm:hidden">Best Wishes</span> 
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2"> 
                <button
                  onClick={() => setShowLogin(true)}
                  // 💡 تحسين مظهر زر الإدارة
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition" 
                >
                  <LogIn className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Admin Login</span>
                  <span className="sm:hidden">Admin</span> 
                </button>

                <button
                  onClick={() => setShowModal(true)}
                  // 💡 هذا الزر يختفي على الجوال ويحل محله الزر الثابت في الأسفل
                  className={`hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-white shadow-md transition-all duration-200 ${
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

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center p-4">
          {/* Main CTA Section */}
          {/* 💡 تم تحسين الـ padding والحجم لتناسب الجوال */}
          <div className="text-center bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-xl max-w-sm sm:max-w-md mx-auto"> 
            <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">{event.title}</h2> 
            <p className="text-sm text-gray-600 mb-4 sm:mb-5">Leave a message, photo, or video for the couple!</p> 
            <button
              onClick={() => setShowModal(true)}
              className={`hidden sm:inline-flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-full shadow-lg text-white transition-all ${ 
                accentColor === 'gold'
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600'
                  : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              Leave a Message
            </button>
          </div>
        </div>

        {/* Mobile Sticky Button: يحل محل زر الـ CTA الرئيسي على الجوال */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/90 border-t border-gray-200 backdrop-blur-md z-50">
          <button
            onClick={() => setShowModal(true)}
            className={`w-full flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-full text-white shadow-lg active:scale-[0.99] transition ${
              accentColor === 'gold'
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                : 'bg-gradient-to-r from-pink-500 to-rose-500'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Leave a Message
          </button>
        </div>

        {/* Submission Modal (افتراضياً أن هذا المكون mobile-friendly) */}
        {showModal && (
          <SubmissionModal
            eventId={event.id}
            accentColor={accentColor}
            onClose={() => setShowModal(false)}
            onSuccess={handleSubmissionSuccess}
          />
        )}

        {/* Login Modal: تم تحسين حجمه والتباعد الداخلي للجوال */}
        {showLogin && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
                onClick={() => setShowLogin(false)}
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-semibold mb-5 text-center text-gray-800 pt-2">Admin Login</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-pink-400 text-base"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-pink-400 text-base"
                />
                {loginError && <p className="text-red-500 text-sm mt-1">{loginError}</p>}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition text-base mt-5"
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