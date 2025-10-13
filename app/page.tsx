'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to demo event
    router.push('/event/sarah-john-2025');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full mb-6 animate-pulse">
          <Heart className="w-10 h-10 text-white fill-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Digital Wedding Guestbook
        </h1>
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p>Loading event...</p>
        </div>
      </div>
    </div>
  );
}

