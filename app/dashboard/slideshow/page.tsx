'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Pause, SkipForward, SkipBack, Maximize, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Submission {
  id: string;
  sender_name: string;
  type: string;
  storage_path: string | null;
  created_at: string;
}

export default function SlideshowPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadApprovedMedia();
  }, []);

  useEffect(() => {
    if (submissions.length > 0) {
      loadCurrentMedia();
    }
  }, [currentIndex, submissions]);

  const loadApprovedMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('moderated', true)
        .in('type', ['video', 'photo'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentMedia = async () => {
    const current = submissions[currentIndex];
    if (!current?.storage_path) return;

    try {
      const { data } = await supabase.storage
        .from('guestbook-media')
        .createSignedUrl(current.storage_path, 3600);

      if (data) {
        setMediaUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < submissions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    if (currentIndex < submissions.length - 1) {
      setTimeout(() => {
        handleNext();
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-20">
          <Play className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Media Available</h2>
          <p className="text-gray-500">Approve some photos or videos to start the slideshow</p>
        </div>
      </div>
    );
  }

  const currentSubmission = submissions[currentIndex];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Guestbook Slideshow</h1>
        <p className="text-gray-600">
          Play approved videos and photos sequentially for reception display
        </p>
      </div>

      {/* Media Player */}
      <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative aspect-video bg-black">
          <AnimatePresence mode="wait">
            {mediaUrl && (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {currentSubmission.type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    className="w-full h-full object-contain"
                    onEnded={handleVideoEnd}
                    muted={isMuted}
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={`Photo from ${currentSubmission.sender_name}`}
                    className="w-full h-full object-contain"
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay Info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <h3 className="text-white text-xl font-semibold mb-1">
              {currentSubmission.sender_name}
            </h3>
            <p className="text-white/80 text-sm">
              {currentSubmission.type === 'video' ? 'Video Message' : 'Photo'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white">
              <p className="text-sm text-gray-400">
                {currentIndex + 1} of {submissions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            {currentSubmission.type === 'video' && (
              <button
                onClick={togglePlay}
                className="p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={currentIndex === submissions.length - 1}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipForward className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            {currentSubmission.type === 'video' && (
              <button
                onClick={toggleMute}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-3 overflow-x-auto">
          {submissions.map((submission, index) => (
            <button
              key={submission.id}
              onClick={() => {
                setCurrentIndex(index);
                setIsPlaying(false);
              }}
              className={`flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-purple-500 ring-2 ring-purple-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-500">
                  {submission.type === 'video' ? '▶' : '🖼'} {submission.sender_name}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

