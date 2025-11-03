"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import {
  Search,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Video,
  Mic,
  MessageSquare,
  Loader2,
  LogOut,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

/**
 * Submissions Page (refactored)
 * - LTR English UI
 * - Uses Pink→Purple wedding theme from layout
 * - Mobile-first responsive 2-column (sidebar -> details) flow
 * - Improved error / loading handling, mounted guards, and accessibility
 */

type MediaType = 'text' | 'voice' | 'image' | 'video';

interface Submission {
  id: string;
  sender_name: string;
  sender_contact: string | null;
  type: MediaType;
  content: string | null;
  storage_path: string | null;
  storage_meta: any;
  moderated: boolean;
  is_favorite: boolean;
  created_at: string;
}

// helpers
const cleanStoragePath = (path: string | null): string | null => {
  if (!path) return null;
  return path.startsWith('/') ? path.slice(1) : path;
};

// Small accessible action button
function ActionButton({
  onClick,
  status = false,
  IconOn,
  IconOff,
  titleOn = '',
  titleOff = '',
  colorOn = 'bg-gray-50 text-gray-700',
  colorOff = 'bg-gray-50 text-gray-400',
  isToggle = true,
  fillOn = false,
}: any) {
  const Icon = isToggle && !status ? IconOff ?? IconOn : IconOn;
  const title = isToggle && !status ? titleOff : titleOn;
  const color = isToggle && !status ? colorOff : colorOn;
  const fill = isToggle && status && fillOn ? 'fill-current' : '';

  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${color} focus:outline-none focus:ring-2 focus:ring-purple-300`}
      title={title}
      aria-pressed={isToggle ? !!status : undefined}
    >
      <Icon className={`w-4 h-4 ${fill}`} />
    </button>
  );
}

function SubmissionMediaViewer({ submission }: { submission: Submission }) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setMediaUrl(null);

      const cleaned = cleanStoragePath(submission.storage_path);
      if (!cleaned) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from('guestbook-media')
          .createSignedUrl(cleaned, 3600);

        if (error) {
          console.error('Signed URL error', error.message);
          return;
        }

        if (mounted && data?.signedUrl) setMediaUrl(data.signedUrl);
      } catch (e) {
        console.error('Media load error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [submission.storage_path]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
        <span>Loading {submission.type}…</span>
      </div>
    );
  }

  if (!mediaUrl) {
    return (
      <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
        Failed to load {submission.type}. Check storage settings / RLS on `guestbook-media`.
      </div>
    );
  }

  if (submission.type === 'voice') {
    return (
      <audio controls className="w-full rounded-lg">
        <source src={mediaUrl} />
        Your browser does not support audio.
      </audio>
    );
  }

  if (submission.type === 'image') {
    return <img src={mediaUrl} alt="submission" className="w-full rounded-lg object-contain max-h-96 bg-gray-100" />;
  }

  if (submission.type === 'video') {
    return (
      <video controls className="w-full rounded-lg max-h-96">
        <source src={mediaUrl} />
        Your browser does not support video.
      </video>
    );
  }

  return null;
}

export default function SubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // load flow: get user -> couple_id -> event -> submissions
  const loadSubmissionsForEvent = useCallback(async (eventId: string, mountedRef: { current: boolean }) => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!mountedRef.current) return;

      setSubmissions((data as Submission[]) || []);
    } catch (e: any) {
      console.error('Failed loading submissions:', e.message || e);
      if (mountedRef.current) setError('Failed to load submissions. Check RLS on submissions.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const checkUserAndInit = useCallback(async () => {
    setLoading(true);
    setError(null);

    const mountedRef = { current: true };
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (!user) {
        router.push('/login');
        return;
      }

      // fetch couple_id
      const { data: userData, error: userErr } = await supabase.from('users').select('couple_id').eq('id', user.id).single();
      if (userErr || !userData) throw new Error('User profile not found.');
      const coupleId = (userData as any).couple_id;

      // fetch event
      const { data: eventData, error: eventErr } = await supabase.from('events').select('id').eq('couple_id', coupleId).single();
      if (eventErr || !eventData) throw new Error('No event linked to this couple.');
      const eventId = (eventData as any).id;

      // load submissions
      await loadSubmissionsForEvent(eventId, mountedRef);
    } catch (e: any) {
      console.error('Init error:', e.message || e);
      setError(e.message || 'Initialization failed');
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [router, loadSubmissionsForEvent]);

 useEffect(() => {
  checkUserAndInit();
}, [checkUserAndInit]);

  // derived grouped data
  const grouped = useMemo(() => {
    const map = new Map<string, Submission[]>();
    for (const s of submissions) {
      const key = s.sender_name || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // sort inside
    for (const [k, arr] of map.entries()) arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return map;
  }, [submissions]);

  // filtered senders array
  const filteredSenders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const arr = Array.from(grouped.keys()).filter((k) => k.toLowerCase().includes(q)).sort();
    return arr;
  }, [grouped, searchQuery]);

  // local optimistic update helpers
  const updateLocal = (id: string, patch: Partial<Submission>) => {
    setSubmissions((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const toggleModeration = async (id: string, current: boolean) => {
    updateLocal(id, { moderated: !current });
    try {
      // تعريف النوع المحلي لضمان صحة الخصائص
      type SubmissionUpdate = Partial<Database['public']['Tables']['submissions']['Row']>;
      const payload: SubmissionUpdate = { moderated: !current };

      // @ts-ignore: الحل النهائي لتجاهل مشكلة النوع 'never' في ملف التعريف
      const { error } = await supabase
        .from('submissions')
        .update(payload as any)
        .eq('id', id);

      if (error) throw error;
    } catch (e) {
      console.error('toggle moderation error', e);
      updateLocal(id, { moderated: current });
    }
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    updateLocal(id, { is_favorite: !current });
    try {
      // تعريف النوع المحلي لضمان صحة الخصائص
      type SubmissionUpdate = Partial<Database['public']['Tables']['submissions']['Row']>;
      const payload: SubmissionUpdate = { is_favorite: !current };
      
      // @ts-ignore: الحل النهائي لتجاهل مشكلة النوع 'never' في ملف التعريف
      const { error } = await supabase
        .from('submissions')
        .update(payload as any)
        .eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error('toggle favorite error', e);
      updateLocal(id, { is_favorite: current });
    }
  };

  const deleteSubmission = async (id: string, storagePath: string | null) => {
    if (!confirm('Are you sure you want to permanently delete this submission?')) return;
    try {
      if (storagePath) {
        const cleaned = cleanStoragePath(storagePath);
        if (cleaned) await supabase.storage.from('guestbook-media').remove([cleaned]);
      }
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      // if deleted caused selectedSender to be empty -> collapse
      if (selectedSender && (!grouped.get(selectedSender) || grouped.get(selectedSender)!.length === 1)) setSelectedSender(null);
    } catch (e) {
      console.error('delete submission error', e);
      alert('Failed to delete the submission. Check console for details.');
    }
  };

  const downloadMedia = async (storagePath: string | null, filename = 'file') => {
    if (!storagePath) return;
    const cleaned = cleanStoragePath(storagePath);
    if (!cleaned) return;

    try {
      const { data, error } = await supabase.storage.from('guestbook-media').createSignedUrl(cleaned, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error('download error', e);
      alert('Failed to download.');
    }
  };

  // small icons mapping
  const getTypeIcon = (type: MediaType) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="w-4 h-4" />;
      case 'voice':
        return <Mic className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return d;
    }
  };

  // UI states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
          <div className="text-gray-700">
            <p className="font-medium">Loading submissions</p>
            <p className="text-sm">Please wait…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-red-600 mb-2">Error</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => checkUserAndInit()} className="px-4 py-2 rounded bg-gray-100">Retry</button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="px-4 py-2 rounded bg-red-600 text-white">Logout</button>
          </div>
        </div>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Submissions</h1>
          <p className="text-sm text-gray-600 truncate">Browse and manage all guest submissions organized by sender.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"> 
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar - Sender List */}
        <aside className={`col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-h-[calc(100vh-140px)] ${selectedSender ? 'hidden lg:block' : 'block'}`} aria-label="Senders list">
          <h2 className="text-xl font-bold text-gray-900 mb-4 hidden lg:block">Guest List</h2>

          <div className="mb-4">
            <label htmlFor="sender-search" className="sr-only">Search senders</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="sender-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search senders..."
                className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                aria-label="Search senders"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto lg:max-h-[70vh]">
            {filteredSenders.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">No senders found</p>
              </div>
            ) : (
              filteredSenders.map((sender) => {
                const items = grouped.get(sender) ?? [];
                return (
                  <button
                    key={sender}
                    onClick={() => setSelectedSender(sender)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${selectedSender === sender ? 'bg-purple-50 border-2 border-purple-500' : 'hover:bg-gray-50 border-2 border-transparent'}`}
                    aria-current={selectedSender === sender ? 'true' : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedSender === sender ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <FolderOpen className={`w-5 h-5 ${selectedSender === sender ? 'text-purple-600' : 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{sender}</p>
                        <p className="text-xs text-gray-500">{items.length} submission{items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 ml-2 flex-shrink-0 ${selectedSender === sender ? 'text-purple-600' : 'text-gray-400'}`} />
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Details column */}
        <section className={`col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 min-h-[calc(100vh-140px)] ${selectedSender ? 'block' : 'hidden lg:block'}`} aria-label="Submission details">
          {!selectedSender ? (
            <div className="flex items-center justify-center h-full text-center py-20">
              <div>
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Sender</h3>
                <p className="text-gray-500 text-sm">Choose a sender from the list to view their submissions</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <button onClick={() => setSelectedSender(null)} className="p-2 mr-2 lg:hidden bg-gray-100 rounded-full hover:bg-gray-200" title="Back to Senders">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{selectedSender}</h2>
                    <p className="text-sm text-gray-600">{(grouped.get(selectedSender) ?? []).length} submission{((grouped.get(selectedSender) ?? []).length !== 1) ? 's' : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelectedSender(null); setSearchQuery(''); }} className="px-3 py-1.5 rounded bg-gray-100 text-sm">Close</button>
                </div>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto lg:max-h-[70vh] pr-2">
                {(grouped.get(selectedSender) ?? []).map((submission) => (
                  <motion.article key={submission.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">{getTypeIcon(submission.type)}</div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 capitalize">{submission.type} Message</p>
                          <p className="text-xs text-gray-500">{formatDate(submission.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ActionButton onClick={() => toggleFavorite(submission.id, submission.is_favorite)} status={submission.is_favorite} IconOn={Star} IconOff={StarOff} titleOn="Remove favorite" titleOff="Add favorite" colorOn="bg-yellow-50 text-yellow-600" colorOff="bg-gray-50 text-gray-400" fillOn={true} />
                        <ActionButton onClick={() => toggleModeration(submission.id, submission.moderated)} status={submission.moderated} IconOn={Eye} IconOff={EyeOff} titleOn="Hide from public" titleOff="Approve for public" colorOn="bg-green-50 text-green-600" colorOff="bg-gray-50 text-gray-400" />
                        {submission.storage_path && (
                          <ActionButton onClick={() => downloadMedia(submission.storage_path, `${submission.sender_name}-${submission.type}.${submission.storage_meta?.type?.split('/')[1] ?? 'file'}`)} IconOn={Download} titleOn="Download" colorOn="bg-blue-50 text-blue-600" isToggle={false} />
                        )}
                        <ActionButton onClick={() => deleteSubmission(submission.id, submission.storage_path)} IconOn={Trash2} titleOn="Delete" colorOn="bg-red-50 text-red-600" isToggle={false} />
                      </div>
                    </div>

                    {/* content */}
                    {submission.type === 'text' ? (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                      </div>
                    ) : (
                      submission.storage_path ? (
                        <div className="mt-3">
                          <SubmissionMediaViewer submission={submission} />
                        </div>
                      ) : (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">No media attached.</div>
                      )
                    )}

                    {submission.sender_contact && <div className="mt-3 text-xs text-gray-500">Contact: {submission.sender_contact}</div>}
                  </motion.article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}