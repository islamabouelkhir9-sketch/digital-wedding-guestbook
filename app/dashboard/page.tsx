'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Users, Clock, TrendingUp, Eye, LogOut, Loader2, Link as LinkIcon, ChevronRight } from 'lucide-react'; 
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

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
  eventSlug: string | null;
}

// --- Component ---
export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({
    totalSubmissions: 0,
    unreadSubmissions: 0,
    totalSenders: 0,
    recentSubmissions: [],
    eventSlug: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);


  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') router.push('/login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  useEffect(() => {
    checkUserAndLoadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const checkUserAndLoadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) throw new Error(error.message || 'Auth error');

      const currentUser = data?.user ?? null;
      if (!currentUser) {
        if (typeof window !== 'undefined') router.push('/login');
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


  const loadStats = async (currentUser: any) => {
    try {
      // 1) get couple_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('couple_id')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData || !(userData as any).couple_id) {
        throw new Error("User profile not found or couple_id missing.");
      }

      const currentCoupleId: string | number = (userData as any).couple_id;

      // 2) get event for this couple
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, slug')
        .eq('couple_id', currentCoupleId)
        .single();

      if (eventError || !eventData) {
        throw new Error("No event linked to this user's couple_id.");
      }

      const currentEventId: string | number = (eventData as any).id;
      const eventSlug: string = (eventData as any).slug;

      // 3-6) جميع الاستعلامات الأخرى (كما هي) ...
      const { count: totalCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', currentEventId);

      const { count: unreadCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', currentEventId)
        .eq('moderated', false);

      const { data: sendersData } = await supabase
        .from('submissions')
        .select('sender_name')
        .eq('event_id', currentEventId);

      const senderNames = (sendersData as SenderSubmission[] | null)?.map(s => s.sender_name) || [];
      const uniqueSenders = new Set(senderNames);

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
        eventSlug: eventSlug,
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

  // Loading state (كما هو)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
        <p className="text-gray-600 ml-3">Verifying access and loading data...</p>
        </div>
    );
  }

  // Error state (كما هو)
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
    <div className="w-full p-4 sm:p-6 lg:p-8"> 
      {/* Header: تم الحفاظ على تصميمك المتقن */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Dashboard Overview</h1>
          <p className="text-sm text-gray-600 truncate">Welcome back! Here's what's happening with your guestbook.</p>
        </div>
        
                <div className="flex gap-2 w-full sm:w-auto">
          {stats.eventSlug && (
            <a 
              href={`/event/${stats.eventSlug}`} 
              target="_blank"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex-shrink-0 w-1/2 sm:w-auto"
            >
              <LinkIcon className="w-4 h-4" />
              <span className="hidden sm:inline">View Guestbook</span>
              <span className="sm:hidden">View Live</span>
            </a>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex-shrink-0 w-1/2 sm:w-auto"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Sign Out</span>
          </button>
        </div>
      </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow flex flex-col justify-between h-32"
            >
              
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </div>
              
                            <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{stat.title}</p>
              </div>
              
            </motion.div>
          );
        })}
      </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4 md:mb-6 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Submissions</h2>
          <a 
            href="/dashboard/submissions" 
            className="flex items-center gap-1 text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View All <ChevronRight className="w-3 h-3"/>
          </a>
        </div>

        {stats.recentSubmissions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">No submissions yet</p>
          </div>
        ) : (
          <> {/* Fragment لحل مشكلة الـ Conditional Rendering */}
                                    <div className="space-y-3 overflow-y-auto max-h-[30vh] md:max-h-[50vh] pr-2">
              {stats.recentSubmissions.map((submission) => (
                <a
                  href={`/dashboard/submissions?id=${submission.id}`} // رابط توجيهي للمراجعة
                  key={submission.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 cursor-pointer"
                >
                  <div className={`p-1.5 rounded-lg ${submission.moderated ? 'bg-green-50' : 'bg-yellow-50'} flex-shrink-0`}>
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
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}