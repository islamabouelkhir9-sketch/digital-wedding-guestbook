'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to demo event
    // 💡 يمكن إضافة تأخير بسيط هنا (مثل 1000 ملي ثانية) إذا كنت تريد أن يرى المستخدم شاشة التحميل
    router.push('/event/sarah-john-2025');
  }, [router]);

  return (
    // 💡 التأكد من أن التباعدات تعمل جيداً على أي شاشة
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4">
      <div className="text-center max-w-sm mx-auto">
        {/* Icon Area: تقليص حجم الأيقونة قليلاً على الجوال */}
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full mb-4 sm:mb-6 animate-pulse">
          <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
        </div>

        {/* Title Area: تقليص حجم الخط على الجوال */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
          Digital Wedding Guestbook
        </h1>
        
        {/* Loading Status */}
        <div className="flex items-center justify-center gap-2 text-gray-600 text-sm sm:text-base">
          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          <p>Loading event...</p>
        </div>
      </div>
    </div>
  );
}