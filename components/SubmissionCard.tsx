'use client';

import { useState } from 'react';
import { MessageSquare, Mic, Image as ImageIcon, Video, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Submission {
  id: string;
  sender_name: string;
  type: 'text' | 'voice' | 'photo' | 'video';
  content: string | null;
  storage_path: string | null;
  created_at: string;
}

interface SubmissionCardProps {
  submission: Submission;
  accentColor: string;
}

export default function SubmissionCard({ submission, accentColor }: SubmissionCardProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getTypeIcon = () => {
    switch (submission.type) {
      case 'text':
        return <MessageSquare className="w-5 h-5" />;
      case 'voice':
        return <Mic className="w-5 h-5" />;
      case 'photo':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
    }
  };

  const loadMedia = async () => {
    if (!submission.storage_path) return;

    const { data } = await supabase.storage
      .from('guestbook-media')
      .createSignedUrl(submission.storage_path, 3600);

    if (data) {
      setMediaUrl(data.signedUrl);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl p-6 border border-gray-100 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{submission.sender_name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(submission.created_at)}
          </div>
        </div>
        <div className={`p-2 rounded-full ${
          accentColor === 'gold' ? 'bg-yellow-100 text-yellow-600' : 'bg-pink-100 text-pink-600'
        }`}>
          {getTypeIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {submission.type === 'text' && (
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {submission.content}
          </p>
        )}

        {submission.type === 'voice' && (
          <div className="space-y-2">
            {!mediaUrl ? (
              <button
                onClick={loadMedia}
                className={`w-full py-3 px-4 rounded-lg ${
                  accentColor === 'gold' 
                    ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' 
                    : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
                } font-medium transition-colors flex items-center justify-center gap-2`}
              >
                <Mic className="w-4 h-4" />
                Play Voice Message
              </button>
            ) : (
              <audio controls className="w-full">
                <source src={mediaUrl} type="audio/webm" />
                <source src={mediaUrl} type="audio/mp4" />
                Your browser does not support the audio element.
              </audio>
            )}
          </div>
        )}

        {submission.type === 'photo' && (
          <div>
            {!mediaUrl ? (
              <button
                onClick={loadMedia}
                className={`w-full aspect-video rounded-lg ${
                  accentColor === 'gold' 
                    ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' 
                    : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
                } font-medium transition-colors flex items-center justify-center gap-2`}
              >
                <ImageIcon className="w-6 h-6" />
                View Photo
              </button>
            ) : (
              <img 
                src={mediaUrl} 
                alt={`Photo from ${submission.sender_name}`}
                className="w-full rounded-lg object-cover"
              />
            )}
          </div>
        )}

        {submission.type === 'video' && (
          <div>
            {!mediaUrl ? (
              <button
                onClick={loadMedia}
                className={`w-full aspect-video rounded-lg ${
                  accentColor === 'gold' 
                    ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' 
                    : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
                } font-medium transition-colors flex items-center justify-center gap-2`}
              >
                <Video className="w-6 h-6" />
                Play Video
              </button>
            ) : (
              <video controls className="w-full rounded-lg">
                <source src={mediaUrl} type="video/webm" />
                <source src={mediaUrl} type="video/mp4" />
                Your browser does not support the video element.
              </video>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

