'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Heart, Sparkles } from 'lucide-react';
import SubmissionModal from '@/components/SubmissionModal';
import SubmissionCard from '@/components/SubmissionCard';
import confetti from 'canvas-confetti';

interface Event {
  id: string;
  title: string;
  slug: string;
  settings: {
    show_all_submissions?: boolean;
    accent_color?: string;
  };
}

interface Submission {
  id: string;
  sender_name: string;
  type: 'text' | 'voice' | 'photo' | 'video';
  content: string | null;
  storage_path: string | null;
  created_at: string;
  moderated: boolean;
}

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [accentColor, setAccentColor] = useState('gold');

  useEffect(() => {
    loadEventData();
  }, [slug]);

  const loadEventData = async () => {
    try {
      // Load event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (eventError) throw eventError;
      
      setEvent(eventData);
      setAccentColor(eventData.settings?.accent_color || 'gold');

      // Load submissions
      const showAll = eventData.settings?.show_all_submissions || false;
      let query = supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });

      if (!showAll) {
        query = query.eq('moderated', true);
      }

      const { data: submissionsData, error: submissionsError } = await query;

      if (submissionsError) throw submissionsError;

      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionSuccess = () => {
    setShowModal(false);
    loadEventData();
    
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [accentColor === 'gold' ? '#FFD700' : '#FF7F50', '#FFFFFF', '#FFC0CB']
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <Sparkles className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-500" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Event Not Found</h1>
          <p className="text-gray-600">The event you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{event.title}</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Heart className={`w-4 h-4 fill-${accentColor === 'gold' ? 'yellow' : 'coral'}-500 text-${accentColor === 'gold' ? 'yellow' : 'coral'}-500`} />
                Share your love and best wishes
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className={`hidden md:flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${
                accentColor === 'gold' 
                  ? 'from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600' 
                  : 'from-coral-400 to-pink-500 hover:from-coral-500 hover:to-pink-600'
              } text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
            >
              <MessageSquare className="w-5 h-5" />
              Leave a Message
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {submissions.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No messages yet</h2>
            <p className="text-gray-500 mb-6">Be the first to leave a congratulatory message!</p>
            <button
              onClick={() => setShowModal(true)}
              className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${
                accentColor === 'gold' 
                  ? 'from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600' 
                  : 'from-coral-400 to-pink-500 hover:from-coral-500 hover:to-pink-600'
              } text-white rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
            >
              <MessageSquare className="w-5 h-5" />
              Leave a Message
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissions.map((submission) => (
              <SubmissionCard 
                key={submission.id} 
                submission={submission} 
                accentColor={accentColor}
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-50">
        <button
          onClick={() => setShowModal(true)}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r ${
            accentColor === 'gold' 
              ? 'from-yellow-400 to-yellow-500' 
              : 'from-coral-400 to-pink-500'
          } text-white rounded-full font-semibold shadow-lg active:scale-95 transition-transform`}
        >
          <MessageSquare className="w-5 h-5" />
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
    </div>
  );
}

