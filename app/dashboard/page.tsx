'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Users, Clock, TrendingUp, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

interface Stats {
  totalSubmissions: number;
  unreadSubmissions: number;
  totalSenders: number;
  recentSubmissions: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSubmissions: 0,
    unreadSubmissions: 0,
    totalSenders: 0,
    recentSubmissions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total submissions
      const { count: totalCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true });

      // Get unread (not moderated) submissions
      const { count: unreadCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('moderated', false);

      // Get unique senders
      const { data: sendersData } = await supabase
        .from('submissions')
        .select('sender_name');
      
      const uniqueSenders = new Set(sendersData?.map(s => s.sender_name) || []);

      // Get recent submissions
      const { data: recentData } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalSubmissions: totalCount || 0,
        unreadSubmissions: unreadCount || 0,
        totalSenders: uniqueSenders.size,
        recentSubmissions: recentData || []
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: MessageSquare,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Unread Messages',
      value: stats.unreadSubmissions,
      icon: Eye,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Total Guests',
      value: stats.totalSenders,
      icon: Users,
      color: 'from-pink-400 to-pink-600',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600'
    },
    {
      title: 'Recent Activity',
      value: stats.recentSubmissions.length,
      icon: TrendingUp,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your guestbook.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.title}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Submissions</h2>
          <a 
            href="/dashboard/submissions" 
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View All →
          </a>
        </div>

        {stats.recentSubmissions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.recentSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div className={`p-2 rounded-lg ${
                  submission.moderated ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <MessageSquare className={`w-5 h-5 ${
                    submission.moderated ? 'text-green-600' : 'text-yellow-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{submission.sender_name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      submission.moderated 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {submission.moderated ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {submission.type === 'text' 
                      ? submission.content 
                      : `${submission.type.charAt(0).toUpperCase() + submission.type.slice(1)} message`
                    }
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
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

