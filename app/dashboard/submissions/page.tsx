'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Download, Trash2, Eye, EyeOff, Star, StarOff, FolderOpen, ChevronRight, Play, Image as ImageIcon, Video, Mic, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Submission {
  id: string;
  sender_name: string;
  sender_contact: string | null;
  type: 'text' | 'voice' | 'photo' | 'video';
  content: string | null;
  storage_path: string | null;
  storage_meta: any;
  moderated: boolean;
  is_favorite: boolean;
  created_at: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [groupedSubmissions, setGroupedSubmissions] = useState<Record<string, Submission[]>>({});
  const [selectedSender, setSelectedSender] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    // Group submissions by sender
    const grouped = submissions.reduce((acc, submission) => {
      const sender = submission.sender_name;
      if (!acc[sender]) {
        acc[sender] = [];
      }
      acc[sender].push(submission);
      return acc;
    }, {} as Record<string, Submission[]>);

    setGroupedSubmissions(grouped);
  }, [submissions]);

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleModeration = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ moderated: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadSubmissions();
    } catch (error) {
      console.error('Error updating moderation:', error);
    }
  };

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ is_favorite: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadSubmissions();
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const deleteSubmission = async (id: string, storagePath: string | null) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      // Delete from storage if exists
      if (storagePath) {
        await supabase.storage
          .from('guestbook-media')
          .remove([storagePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadSubmissions();
    } catch (error) {
      console.error('Error deleting submission:', error);
    }
  };

  const downloadMedia = async (storagePath: string, fileName: string) => {
    try {
      const { data } = await supabase.storage
        .from('guestbook-media')
        .createSignedUrl(storagePath, 3600);

      if (data) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = fileName;
        link.click();
      }
    } catch (error) {
      console.error('Error downloading media:', error);
    }
  };

  const filteredSenders = Object.keys(groupedSubmissions)
    .filter(sender => sender.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <MessageSquare className="w-4 h-4" />;
      case 'voice': return <Mic className="w-4 h-4" />;
      case 'photo': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submissions</h1>
        <p className="text-gray-600">Browse and manage all guest submissions organized by sender.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sender List */}
        <div className="col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search senders..."
                className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredSenders.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">No senders found</p>
              </div>
            ) : (
              filteredSenders.map((sender) => (
                <button
                  key={sender}
                  onClick={() => setSelectedSender(sender)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    selectedSender === sender
                      ? 'bg-purple-50 border-2 border-purple-500'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedSender === sender ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <FolderOpen className={`w-5 h-5 ${
                        selectedSender === sender ? 'text-purple-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{sender}</p>
                      <p className="text-xs text-gray-500">
                        {groupedSubmissions[sender].length} submission{groupedSubmissions[sender].length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${
                    selectedSender === sender ? 'text-purple-600' : 'text-gray-400'
                  }`} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Submission Details */}
        <div className="col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {!selectedSender ? (
            <div className="flex items-center justify-center h-full text-center py-20">
              <div>
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Sender</h3>
                <p className="text-gray-500">Choose a sender from the list to view their submissions</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSender}</h2>
                  <p className="text-gray-600">
                    {groupedSubmissions[selectedSender].length} submission{groupedSubmissions[selectedSender].length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {groupedSubmissions[selectedSender].map((submission) => (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          {getTypeIcon(submission.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">{submission.type} Message</p>
                          <p className="text-xs text-gray-500">{formatDate(submission.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(submission.id, submission.is_favorite)}
                          className={`p-2 rounded-lg transition-colors ${
                            submission.is_favorite
                              ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                          }`}
                          title={submission.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {submission.is_favorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => toggleModeration(submission.id, submission.moderated)}
                          className={`p-2 rounded-lg transition-colors ${
                            submission.moderated
                              ? 'bg-green-50 text-green-600 hover:bg-green-100'
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                          }`}
                          title={submission.moderated ? 'Hide from public' : 'Approve for public'}
                        >
                          {submission.moderated ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        {submission.storage_path && (
                          <button
                            onClick={() => downloadMedia(submission.storage_path!, `${submission.sender_name}-${submission.type}.${submission.storage_meta?.type?.split('/')[1] || 'file'}`)}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteSubmission(submission.id, submission.storage_path)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {submission.type === 'text' && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                      </div>
                    )}

                    {submission.type !== 'text' && submission.storage_path && (
                      <div className="mt-3">
                        <SubmissionMediaViewer submission={submission} />
                      </div>
                    )}

                    {submission.sender_contact && (
                      <div className="mt-3 text-sm text-gray-500">
                        Contact: {submission.sender_contact}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionMediaViewer({ submission }: { submission: Submission }) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMedia = async () => {
    if (!submission.storage_path) return;
    setLoading(true);

    try {
      const { data } = await supabase.storage
        .from('guestbook-media')
        .createSignedUrl(submission.storage_path, 3600);

      if (data) {
        setMediaUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mediaUrl) {
    return (
      <button
        onClick={loadMedia}
        disabled={loading}
        className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4" />
        {loading ? 'Loading...' : `View ${submission.type}`}
      </button>
    );
  }

  if (submission.type === 'voice') {
    return (
      <audio controls className="w-full">
        <source src={mediaUrl} />
      </audio>
    );
  }

  if (submission.type === 'photo') {
    return (
      <img src={mediaUrl} alt="Submission" className="w-full rounded-lg" />
    );
  }

  if (submission.type === 'video') {
    return (
      <video controls className="w-full rounded-lg">
        <source src={mediaUrl} />
      </video>
    );
  }

  return null;
}

