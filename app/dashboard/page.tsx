'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Users, Clock, TrendingUp, Eye, LogOut, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Force client rendering (helps avoid server-side surprises on Netlify)
export const dynamic = 'force-dynamic';

// --- Types ---
interface SenderSubmission {
  sender_name: string;
}

interface Submission {
  id: string | number;
  sender_name: string;
  content?: string | null;
  created_at: string;
  moderated: boolean;
  type: string;
}

interface Stats {
  totalSubmissions: number;
  unreadSubmissions: number;
  totalSenders: number;
  recentSubmissions: Submission[];
}

// --- Component ---
export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    totalSubmissions: 0,
    unreadSubmissions: 0,
    totalSenders: 0,
    recentSubmissions: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // logout handler
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') router.push('/');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  useEffect(() => {
    // run on mount
    checkUserAndLoadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // check auth + load stats
  const checkUserAndLoadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) throw new Error(error.message || 'Auth error');

      const currentUser = data?.user ?? null;
      if (!currentUser) {
        // not logged in -> redirect to home
        if (typeof window !== 'undefined') router.push('/');
        return;
      }

      setUser(currentUser);
      await loadStats(currentUser);
    } catch (e: any) {
      console.error('Auth check error:', e);
      setError(e?.message ?? 'Authentication check failed');
    } finally {
      setLoading(false);
    }
  };

  // load stats safely using explicit types and guards
  const loadStats = async (currentUser: any) => {
    try {
      // 1) get couple_id for the logged user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData) {
        throw new Error("User profile not found or couple_id missing. Please check 'users' table linking.");
      }

      const currentCoupleId: string | number = (userData as any).couple_id;
      if (!currentCoupleId) {
        throw new Error('couple_id is empty for this user.');
      }

      // 2) get event for this couple
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title')
        .eq('couple_id', currentCoupleId)
        .single();

      if (eventError || !eventData) {
        throw new Error("No event linked to this user's couple_id.");
      }

      const currentEventId: string | number = (eventData as any).id;

      // 3) total submissions (head:true + count)
      const { count: totalCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', currentEventId);

      // 4) unread submissions
      const { count: unreadCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', currentEventId)
        .eq('moderated', false);

      // 5) unique senders
      const { data: sendersData } = await supabase
        .from('submissions')
        .select('sender_name')
        .eq('event_id', currentEventId);

      const senderNames = (sendersData as SenderSubmission[] | null)?.map(s => s.sender_name) || [];
      const uniqueSenders = new Set(senderNames);

      // 6) recent submissions (with fields)
      const { data: recentData } = await supabase
        .from('submissions')
        .select('id, sender_name, content, created_at, moderated, type')
        .eq('event_id', currentEventId)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalSubmissions: totalCount || 0,
        unreadSubmissions: unreadCount || 0,
        totalSenders: uniqueSenders.size,
        recentSubmissions: (recentData as Submission[]) || [],
      });
    } catch (e: any) {
      console.error('Error loading stats:', e);
      setError(e?.message ?? 'Error loading stats');
    }
  };

  // stat cards config
  const statCards = [
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: MessageSquare,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Unread Messages',
      value: stats.unreadSubmissions,
      icon: Eye,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Total Guests',
      value: stats.totalSenders,
      icon: Users,
      color: 'from-pink-400 to-pink-600',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
    },
    {
      title: 'Recent Activity',
      value: stats.recentSubmissions.length,
      icon: TrendingUp,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
  ];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
        <p className="text-gray-600 ml-3">Verifying access and loading data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Error</h1>
        <p className="text-gray-700 mb-4">{error}</p>
        <button onClick={handleLogout} className="text-blue-500 hover:underline">
          Logout
        </button>
      </div>
    );
  }

  // Main UI
  return (
    // 1. تم تغيير padding من p-8 (32px) إلى p-4 (16px) لتقليل الهوامش على الموبايل
    // واستخدام sm:p-6 و md:p-8 لزيادة الهوامش على الشاشات الأكبر.
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      {/* 2. تم تغيير حجم الخط h1 من text-3xl إلى text-2xl على الموبايل لتوفير مساحة */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Dashboard Overview</h1>
          <p className="text-sm md:text-base text-gray-600 truncate">Welcome back! Here's what's happening with your guestbook.</p>
        </div>
        <button
          onClick={handleLogout}
          // 3. تم تقليل حجم زر Logout على الموبايل
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Stats Grid */}
      {/* 4. تم تغيير التخطيط على الموبايل من 1 عمود إلى 2 عمود (grid-cols-2) لتحسين الاستفادة من مساحة العرض
          (grid-cols-1 كان يترك مساحة بيضاء كبيرة). */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              // 5. تم تقليل padding البطاقة من p-6 (24px) إلى p-4 (16px) على الموبايل
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  {/* 6. تم تقليل حجم الأيقونة في البطاقة من w-6/h-6 إلى w-5/h-5 */}
                  <Icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </div>
              {/* 7. تم تقليل حجم القيمة من text-2xl إلى text-xl على الموبايل */}
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-xs md:text-sm text-gray-600">{stat.title}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Recent Submissions</h2>
          <a href="/dashboard/submissions" className="text-xs md:text-sm text-purple-600 hover:text-purple-700 font-medium">
            View All →
          </a>
        </div>

        {stats.recentSubmissions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentSubmissions.map((submission) => (
              <div
                key={submission.id}
                // 8. تم تقليل padding البطاقة
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className={`p-1.5 rounded-lg ${submission.moderated ? 'bg-green-50' : 'bg-yellow-50'} flex-shrink-0`}>
                  {/* 9. تم تقليل حجم الأيقونة في قائمة الرسائل الحديثة من w-5/h-5 إلى w-4/h-4 */}
                  <MessageSquare className={`w-4 h-4 ${submission.moderated ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-gray-900 truncate">{submission.sender_name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit sm:w-auto ${
                        submission.moderated ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {submission.moderated ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {submission.type === 'text'
                      ? submission.content
                      : `${submission.type.charAt(0).toUpperCase() + submission.type.slice(1)} message`}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(submission.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}