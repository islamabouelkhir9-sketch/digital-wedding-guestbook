'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Pause, SkipForward, SkipBack, Maximize, Volume2, VolumeX, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ⏳ إعداد مدة عرض الصورة (بالمللي ثانية)
const IMAGE_DISPLAY_DURATION = 7000; // 7 ثوانٍ

interface Submission {
  id: string;
  sender_name: string;
  type: 'video' | 'image' | 'photo' | 'voice' | 'text';
  storage_path: string | null;
  created_at: string;
}

// 📌 دالة مساعدة لتنظيف مسار التخزين (نفس الدالة المستخدمة في submissions)
const cleanStoragePath = (path: string | null): string | null => {
    if (!path) return null;
    // إزالة الشرطة المائلة الأمامية / إذا كانت موجودة
    const cleaned = path.startsWith('/') ? path.substring(1) : path;
    return cleaned;
};

export default function SlideshowPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // 💡 التعديل 4: جعل المقطع صامتاً افتراضياً لتمكين التشغيل التلقائي في المتصفحات
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null); // 💡 التعديل 5: لتخزين مؤقت التشغيل التلقائي للصور

  // --- useEffects ---

  useEffect(() => {
    loadApprovedMedia();
  }, []);

  useEffect(() => {
    // 💡 التعديل 6: عند تغيير الشريحة، نبدأ التحميل ونجهز مؤقت التشغيل التلقائي للصور
    if (submissions.length > 0) {
      loadCurrentMedia();
      clearImageAutoplayTimer(); // مسح أي مؤقت سابق

      const current = submissions[currentIndex];
      // إذا كانت الشريحة صورة، قم بتشغيل مؤقت التقدم التلقائي
      if (current && (current.type === 'image' || current.type === 'photo')) {
        imageTimerRef.current = setTimeout(() => {
          handleNext();
        }, IMAGE_DISPLAY_DURATION);
        setIsPlaying(false); // تأكد من أن حالة 'التشغيل' مطفأة للصور
      } else if (current && current.type === 'video') {
        // إذا كان فيديو، ننتظر حتى يتمكن من التشغيل
        // ملاحظة: التشغيل التلقائي للفيديو يجب أن يتم داخل حدث (مثل ضغطة زر)، أو بوضع muted
        setIsPlaying(false);
      }
    }

    return () => {
      clearImageAutoplayTimer(); // تنظيف المؤقت عند إلغاء تحميل المكون
    };
  }, [currentIndex, submissions]);

  // --- Helper Functions ---

  const clearImageAutoplayTimer = () => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  };

  const loadApprovedMedia = async () => {
    try {
      console.log('Attempting to load approved media...');
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('moderated', true)
        .in('type', ['video', 'image', 'photo'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log(`✅ Slideshow loaded: ${data.length} items.`);
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading media (Check RLS on submissions table):', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentMedia = async () => {
    const current = submissions[currentIndex];
    if (!current?.storage_path) {
      setMediaUrl(null);
      return;
    }

    const cleanedPath = cleanStoragePath(current.storage_path);
    if (!cleanedPath) {
      setMediaUrl(null);
      return;
    }

    try {
      // 💡 التعديل 7: تقليل مدة الصلاحية لتكون 5 دقائق بدلاً من ساعة، لتقليل المخاطر (على الرغم من أن الاستخدام هنا هو العرض)
      const { data, error } = await supabase.storage
        .from('guestbook-media')
        .createSignedUrl(cleanedPath, 300); // 5 دقائق

      if (error) {
        console.error('*** Signed URL Error (Check Storage RLS policy):', error.message);
        setMediaUrl(null);
        return;
      }

      if (data) {
        setMediaUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    }
  };

  // --- Handlers ---

  const handleNext = () => {
    if (currentIndex < submissions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      if (videoRef.current) videoRef.current.pause(); // إيقاف أي فيديو قيد التشغيل
    } else {
      // 💡 التعديل 8: العودة إلى البداية بعد الانتهاء
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      if (videoRef.current) videoRef.current.pause();
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        // محاولة التشغيل مع إزالة كتم الصوت
        videoRef.current.muted = false;
        setIsMuted(false);
        videoRef.current.play().catch(error => {
            console.error("Autoplay prevented:", error);
            // إظهار رسالة للمستخدم للضغط يدوياً للتشغيل
        });
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
    // 💡 التعديل 9: طلب الشاشة الكاملة على عنصر الحاوية الرئيسية (div) لضمان تغطية جميع عناصر التحكم أيضاً
    const container = document.getElementById('slideshow-container');
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    // الانتقال بعد انتهاء الفيديو مباشرة
    setTimeout(() => {
      handleNext();
    }, 1000);
  };

  // --- Render Logic ---

  if (loading) {
    // 💡 التعديل 10: تعديل التحميل ليتناسب مع شكل الجوال
    return (
      <div className="p-4 sm:p-8 min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-xl">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 sm:h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="p-4 sm:p-8">
        <div className="text-center py-10 sm:py-20 bg-gray-50 rounded-xl">
          <Play className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">لا توجد وسائط متاحة</h2>
          <p className="text-gray-500 text-sm sm:text-base">قم بالموافقة على بعض الصور أو مقاطع الفيديو لبدء عرض الشرائح</p>
        </div>
      </div>
    );
  }

  const currentSubmission = submissions[currentIndex];
  const isVideo = currentSubmission.type === 'video';

  return (
    // 💡 التعديل 11: إضافة ID لحاوية الشاشة الكاملة
    <div id="slideshow-container" className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">عرض شرائح سجل الضيوف</h1>
        <p className="text-gray-600 text-sm sm:text-base">
          تشغيل الفيديوهات والصور المعتمدة بالتتابع للعرض في الاستقبال
        </p>
      </div>

      {/* Media Player */}
      <div className="bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
        {/* Media Display Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <AnimatePresence mode="wait">
            {mediaUrl ? (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {isVideo ? (
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    className="w-full h-full object-contain"
                    onEnded={handleVideoEnd}
                    muted={isMuted}
                    // إضافة خاصية التشغيل التلقائي إذا لم يكن صامتاً (مع العلم قد تمنعها المتصفحات)
                    // autoPlay={!isMuted} 
                    playsInline 
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={`صورة من ${currentSubmission.sender_name}`}
                    className="w-full h-full object-contain"
                  />
                )}
              </motion.div>
            ) : (
                <div className="text-center text-gray-500 p-8">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                    <p>جاري تحميل الوسائط...</p>
                </div>
            )}
          </AnimatePresence>

          {/* Overlay Info (Mobile-Friendly) */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
            <h3 className="text-white text-lg sm:text-xl font-semibold mb-1">
              {currentSubmission.sender_name}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm">
              {isVideo ? 'رسالة فيديو' : 'صورة'}
            </p>
          </div>
        </div>

        {/* Controls (Mobile-Friendly) */}
        <div className="bg-gray-900 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white text-xs sm:text-sm text-gray-400">
              {currentIndex + 1} من {submissions.length}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-4">
            {/* Skip Back */}
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Play/Pause (Video Only) */}
            {isVideo && (
              <button
                onClick={togglePlay}
                className="p-3 sm:p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6 sm:w-8 sm:h-8" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8" />}
              </button>
            )}
             {/* Info Button for Image Autoplay */}
            {!isVideo && (
                 <div className="p-3 sm:p-4 bg-white/10 text-white rounded-full opacity-80 flex items-center justify-center pointer-events-none">
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 mr-2"/>
                    <span className="text-sm">تشغيل تلقائي</span>
                 </div>
            )}

            {/* Skip Forward */}
            <button
              onClick={handleNext}
              disabled={submissions.length === 0} // يمكن تجاوز النهاية للعودة للبداية
              className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-30"
            >
              <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="flex-1" />

            {/* Mute/Unmute (Video Only) */}
            {isVideo && (
              <button
                onClick={toggleMute}
                className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <Maximize className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnail Strip (Scrollable) */}
      <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-2 sm:p-4">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
          {submissions.map((submission, index) => (
            <button
              key={submission.id}
              onClick={() => {
                setCurrentIndex(index);
                // لا نحتاج لإيقاف التشغيل التلقائي هنا، لأن useEffect سيعتني به
              }}
              className={`flex-shrink-0 w-24 h-16 sm:w-32 sm:h-20 rounded-md overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-purple-500 ring-2 ring-purple-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-full h-full bg-gray-100 flex items-center justify-center p-1">
                <span className="text-xs text-gray-500 truncate text-center">
                  {submission.type === 'video' ? '▶ فيديو' : '🖼 صورة'}
                  <br/>
                  <span className='font-medium'>{submission.sender_name}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}