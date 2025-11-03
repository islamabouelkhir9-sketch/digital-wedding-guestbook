'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  MessageSquare,
  Eye,
  Users,
  TrendingUp,
  Clock,
  Loader2,
  Link as LinkIcon,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

/**
 * Refactored Dashboard Overview
 * - Mobile-first
 * - Unified purple accents (C2)
 * - Dark mode A1 (matches layout)
 * - Recent submissions preview + View all
 */

interface SenderSubmission { sender_name: string }
interface SubmissionItem { id: string | number; sender_name: string; content?: string | null; created_at: string; moderated: boolean; type: string }
interface Stats { totalSubmissions: number; unreadSubmissions: number; totalSenders: number; recentSubmissions: SubmissionItem[]; eventSlug: string | null }

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
};

export default function DashboardOverviewPage() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats>({ totalSubmissions: 0, unreadSubmissions: 0, totalSenders: 0, recentSubmissions: [], eventSlug: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // sync with prefers-color-scheme and layout toggle
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => setIsDark(media.matches);
    if (media) {
      setIsDark(media.matches);
      media.addEventListener('change', onChange);
    }
    return () => media?.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadData(mounted);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { mounted = false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (e) {
      console.error('Logout failed', e);
      setError('Logout failed');
    } finally {
      setLoggingOut(false);
    }
  };

  const loadData = async (mounted = true) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message || 'Auth error');
      const currentUser = data?.user ?? null;
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // fetch couple_id
      const { data: userData, error: userError } = await supabase.from('users').select('couple_id').eq('id', currentUser.id).single();
      if (userError || !userData) throw new Error('User profile not found');
      const coupleId = (userData as any).couple_id;

      // event
      const { data: eventData, error: eventError } = await supabase.from('events').select('id,slug').eq('couple_id', coupleId).single();
      if (eventError || !eventData) throw new Error('Event not found');
      const eventId = (eventData as any).id;
      const eventSlug = (eventData as any).slug ?? null;

      // parallel queries
      const totalQ = supabase.from('submissions').select('*', { head: true, count: 'exact' }).eq('event_id', eventId);
      const unreadQ = supabase.from('submissions').select('*', { head: true, count: 'exact' }).eq('event_id', eventId).eq('moderated', false);
      const sendersQ = supabase.from('submissions').select('sender_name').eq('event_id', eventId);
      const recentQ = supabase.from('submissions').select('id,sender_name,content,created_at,moderated,type').eq('event_id', eventId).order('created_at', { ascending: false }).limit(5);

      const [totalRes, unreadRes, sendersRes, recentRes] = await Promise.all([totalQ, unreadQ, sendersQ, recentQ]);

      const totalCount = (totalRes as any).count ?? 0;
      const unreadCount = (unreadRes as any).count ?? 0;
      const sendersData = (sendersRes as any).data as SenderSubmission[] | null;
      const senderNames = (sendersData || []).map(s => s.sender_name);
      const uniqueSenders = new Set(senderNames);
      const recentData = (recentRes as any).data as SubmissionItem[] | null;

      if (mounted) {
        setStats({ totalSubmissions: Number(totalCount) || 0, unreadSubmissions: Number(unreadCount) || 0, totalSenders: uniqueSenders.size, recentSubmissions: recentData || [], eventSlug });
      }
    } catch (e: any) {
      console.error('Dashboard load error', e);
      if (mounted) setError(e?.message ?? 'Failed loading dashboard');
    } finally {
      if (mounted) setLoading(false);
    }
  };

  const statCards = useMemo(() => [
    { title: 'Total Submissions', value: stats.totalSubmissions, icon: MessageSquare },
    { title: 'Unread', value: stats.unreadSubmissions, icon: Eye },
    { title: 'Guests', value: stats.totalSenders, icon: Users },
    { title: 'Recent', value: stats.recentSubmissions.length, icon: TrendingUp },
  ], [stats]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="flex items-center gap-3">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
        <div className="text-gray-700 dark:text-gray-200"><p className="font-medium">Verifying access</p><p className="text-sm">Loading dashboard data…</p></div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-3">Error</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => loadData(true)} className="px-4 py-2 rounded bg-gray-100 dark:bg-neutral-800">Retry</button>
          <button onClick={handleLogout} className="px-4 py-2 rounded bg-red-600 text-white">Logout</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">Dashboard Overview</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">Welcome back — here’s what’s happening with your guestbook.</p>
        </div>

        <div className="flex items-center gap-2">
          {stats.eventSlug && (
            <a href={`/event/${stats.eventSlug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
              <LinkIcon className="w-4 h-4" />
              <span className="hidden sm:inline">View Guestbook</span>
              <span className="sm:hidden">Live</span>
            </a>
          )}

          <button onClick={() => setIsDark(s => !s)} aria-label="Toggle theme" className="p-2 rounded-md bg-gray-100 dark:bg-neutral-800">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button onClick={handleLogout} disabled={loggingOut} className="ml-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            <LogOut className="w-4 h-4 inline-block mr-2" />
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Stats (unified purple accents) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-4 flex flex-col justify-between h-32">
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-400 to-purple-600 text-white">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.title}</p>
              </div>
            </motion.div>
          )
        })}
      </section>

      {/* Quick nav cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/dashboard/submissions" className="block">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Submissions</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage guest messages & media</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-400 to-purple-600 text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/slideshow" className="block">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Slideshow</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Create and manage slides</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-400 to-purple-600 text-white">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/settings" className="block">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Settings</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account & event settings</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-400 to-purple-600 text-white">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/analytics" className="block">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-gray-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Analytics</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Traffic & conversions</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-400 to-purple-600 text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Recent Submissions preview */}
      <section className="bg-white dark:bg-neutral-900 rounded-xl p-4 sm:p-6 border border-gray-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Submissions</h3>
          <Link href="/dashboard/submissions"><a className="text-sm text-purple-600 hover:text-purple-700 inline-flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></a></Link>
        </div>

        {stats.recentSubmissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            No submissions yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left border-collapse">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4">Sender</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Preview</th>
                  <th className="py-2 pr-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {stats.recentSubmissions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-gray-900 dark:text-white truncate max-w-[220px]">{s.sender_name}</div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{s.type}</td>
                    <td className="py-3 pr-4 text-sm text-gray-600 dark:text-gray-300 line-clamp-2 max-w-[420px]">{s.type === 'text' ? (s.content ?? '-') : `${s.type.charAt(0).toUpperCase() + s.type.slice(1)} message`}</td>
                    <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
