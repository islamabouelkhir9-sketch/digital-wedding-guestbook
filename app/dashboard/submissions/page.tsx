'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Download, Trash2, Eye, EyeOff, Star, StarOff, FolderOpen, ChevronRight, Play, Image as ImageIcon, Video, Mic, MessageSquare, Loader2, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Submission {
    id: string;
    sender_name: string;
    sender_contact: string | null;
    type: 'text' | 'voice' | 'image' | 'video';
    content: string | null;
    storage_path: string | null;
    storage_meta: any;
    moderated: boolean;
    is_favorite: boolean;
    created_at: string;
}

// 📌 دالة مساعدة لتنظيف مسار التخزين
const cleanStoragePath = (path: string | null): string | null => {
    if (!path) return null;
    // إزالة الشرطة المائلة الأمامية / إذا كانت موجودة
    // واستخدام encodeURIComponent للتأكد من التعامل السليم مع المسارات التي تحتوي على رموز خاصة
    const cleaned = path.startsWith('/') ? path.substring(1) : path;
    return cleaned;
};

// 📌 بداية مكون الصفحة الرئيسية
export default function SubmissionsPage() {
    const router = useRouter();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [groupedSubmissions, setGroupedSubmissions] = useState<Record<string, Submission[]>>({});
    const [selectedSender, setSelectedSender] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // دالة تسجيل الخروج
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const loadSubmissions = async (currentEventId: string) => {
        setLoading(true);
        try {
            console.log('Attempting to load submissions for Event ID:', currentEventId); // نقطة تحقق 4
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('event_id', currentEventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            console.log('✅ SUBMISSIONS LOAD SUCCESS:', data.length, 'submissions loaded.'); // نقطة تحقق 5
            
            // 💡 الإضافة الجديدة للتشخيص
            console.log('*** LOADED SUBMISSIONS DATA:', data); 

            setSubmissions(data || []);
            setSelectedSender(null);
        } catch (error: any) {
            console.error('Error loading submissions (Possible RLS on submissions):', error.message || error);
            setError('Failed to load submissions. (Check RLS on "submissions" table)');
        } finally {
            setLoading(false);
        }
    };
    
    // 💡 تم تحويل الدالة إلى useCallback لضمان الاستقرار (Best Practice)
    const checkUserAndLoadData = useCallback(async () => {
        setLoading(true);
        setError(null);

        // 1. التحقق من المستخدم المسجل دخوله
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('🚨 AUTH FAILED: User object is null. Redirecting to login.');
            router.push('/');
            return;
        }

        console.log('✅ AUTH SUCCESS: User ID:', user.id); // نقطة تحقق 1

        // 2. جلب couple_id للمستخدم الحالي
        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('couple_id')
                .eq('id', user.id)
                .single();

            if (userError || !userData) {
                console.error('🚨 USER PROFILE FAILED (RLS on users?):', userError?.message || 'No user data found.');
                throw new Error("User profile not found. Check 'users' table RLS.");
            }
            
            const currentCoupleId = userData.couple_id;
            console.log('✅ PROFILE SUCCESS: Couple ID:', currentCoupleId); // نقطة تحقق 2

            // 3. جلب الـ event_id الخاص بهذا الـ couple
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('id')
                .eq('couple_id', currentCoupleId)
                .single(); 
            
            if (eventError || !eventData) {
                console.error('🚨 EVENT FAILED (RLS on events?):', eventError?.message || 'No event found.');
                throw new Error("No event linked to this user's couple ID. Check 'events' table RLS.");
            }

            const currentEventId = eventData.id;
            console.log('✅ EVENT SUCCESS: Event ID:', currentEventId); // نقطة تحقق 3

            // 4. تحميل الرسائل باستخدام الـ event_id
            loadSubmissions(currentEventId);

        } catch (e: any) {
            console.error('🚨 INITIAL LOAD SEQUENCE FAILED:', e.message);
            setError(e.message);
            setLoading(false);
        }
    }, [router]);


    useEffect(() => {
        checkUserAndLoadData();
    }, [checkUserAndLoadData]);

    
    const updateLocalSubmissions = (id: string, key: 'moderated' | 'is_favorite', newValue: boolean) => {
        setSubmissions(prev => 
            prev.map(sub => 
                sub.id === id ? { ...sub, [key]: newValue } : sub
            )
        );
    };

    const toggleModeration = async (id: string, currentStatus: boolean) => {
        try {
            updateLocalSubmissions(id, 'moderated', !currentStatus);

            const { error } = await supabase
                .from('submissions')
                .update({ moderated: !currentStatus })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating moderation:', error);
        }
    };

    const toggleFavorite = async (id: string, currentStatus: boolean) => {
        try {
            updateLocalSubmissions(id, 'is_favorite', !currentStatus);

            const { error } = await supabase
                .from('submissions')
                .update({ is_favorite: !currentStatus })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating favorite:', error);
        }
    };

    const deleteSubmission = async (id: string, storagePath: string | null) => {
        if (!confirm('Are you sure you want to delete this submission?')) return;

        try {
            // 1. Delete from storage if exists
            if (storagePath) {
                const cleanedPath = cleanStoragePath(storagePath);
                if(cleanedPath) {
                    // Supabase Storage remove expects an array of file paths
                    const { error: storageError } = await supabase.storage
                        .from('guestbook-media')
                        .remove([cleanedPath]);
                    
                    if(storageError) console.error('Error deleting file from storage:', storageError.message);
                }
            }

            // 2. Delete from database
            const { error: dbError } = await supabase
                .from('submissions')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;
            
            // تحديث القائمة المحلية
            setSubmissions(prev => prev.filter(sub => sub.id !== id));
            if (selectedSender && groupedSubmissions[selectedSender].length === 1) {
                setSelectedSender(null);
            }
        } catch (error) {
            console.error('Error deleting submission:', error);
        }
    };

    const downloadMedia = async (storagePath: string, fileName: string) => {
        try {
            const cleanedPath = cleanStoragePath(storagePath);

            if (!cleanedPath) {
                console.error("Storage path is empty.");
                return;
            }
            
            // استخدام Public URL إذا كانت سياستك تسمح بالوصول المباشر (أسرع)
            // إذا كنت تفضل Signed URL لتأمين أكثر:
            const { data, error } = await supabase.storage
                .from('guestbook-media')
                .createSignedUrl(cleanedPath, 3600); // 1 hour expiration

            if (error) throw error;

            if (data) {
                const link = document.createElement('a');
                link.href = data.signedUrl;
                link.download = fileName; // اسم الملف عند التحميل
                link.click();
            }
        } catch (error) {
            console.error('Error downloading media:', error);
        }
    };

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

    const filteredSenders = Object.keys(groupedSubmissions)
        .filter(sender => sender.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort();

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'text': return <MessageSquare className="w-4 h-4" />;
            case 'voice': return <Mic className="w-4 h-4" />;
            case 'image': return <ImageIcon className="w-4 h-4" />;
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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                <p className="text-gray-600 ml-3">Loading submissions...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center flex-col p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Access Error</h1>
                <p className="text-gray-700 mb-4">A critical error occurred: {error}</p>
                <button onClick={handleLogout} className="text-blue-500 hover:underline">
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Submissions</h1>
                    <p className="text-gray-600">Browse and manage all guest submissions organized by sender.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
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

                                        {/* 💡 هنا يتم استدعاء المكون الجديد الذي يحمل الوسائط تلقائيًا */}
                                        {submission.type !== 'text' && submission.storage_path && (
                                            // 💡 إضافة console.log للتحقق من وصول الكود إلى هنا
                                            console.log(`*** RENDERING VIEWER for: ${submission.sender_name} (${submission.type})`),
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

// 📌 بداية مكون عرض الوسائط (SubmissionMediaViewer) - **تم التعديل فيه**
function SubmissionMediaViewer({ submission }: { submission: Submission }) {
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadMedia = async () => {
        if (!submission.storage_path) {
            setLoading(false);
            return;
        }

        setLoading(true);
        // 💡 تطبيق التنظيف
        const cleanedPath = cleanStoragePath(submission.storage_path);

        if (!cleanedPath) {
            setLoading(false);
            return;
        }

        try {
            console.log('Attempting to create signed URL for path:', cleanedPath); // نقطة تحقق 6

            const { data, error } = await supabase.storage
                .from('guestbook-media')
                .createSignedUrl(cleanedPath, 3600); // استخدام المسار النظيف

            if (error) {
                console.error('*** Supabase Signed URL Error (CRITICAL):', error.message);
            }
            
            if (data?.signedUrl) { 
                console.log('✅ Signed URL successfully created.'); // نقطة تحقق 7
                setMediaUrl(data.signedUrl); 
            } else {
                console.error('❌ Signed URL data not received or invalid.');
            }
        } catch (error) {
            console.error('🚨 Generic Error loading media:', error);
        } finally {
            setLoading(false);
        }
    };

    // 💡 الآن يتم تحميل الرابط الموقع تلقائيًا عند تحميل المكون
    useEffect(() => {
        loadMedia();
    }, [submission.storage_path]); // يعاد التشغيل إذا تغير المسار

    // شاشة التحميل
    if (loading) {
        return (
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg text-gray-600 font-medium">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
                <p>Loading {submission.type}...</p>
            </div>
        );
    }
    
    // إذا انتهى التحميل وتوفر الرابط
    if (mediaUrl) {
        if (submission.type === 'voice') {
            return (
                <audio controls className="w-full">
                    <source src={mediaUrl} />
                </audio>
            );
        }

        if (submission.type === 'image') {
            return (
                <img 
                    src={mediaUrl} 
                    alt="Submission" 
                    className="w-full rounded-lg max-h-96 object-contain bg-gray-100" 
                />
            );
        }

        if (submission.type === 'video') {
            return (
                <video controls className="w-full rounded-lg">
                    <source src={mediaUrl} />
                </video>
            );
        }
    }
    
    // رسالة الفشل (إذا انتهى التحميل ولم يتوفر رابط)
    return (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
            Failed to load {submission.type}. Check RLS policy on **Storage Bucket (guestbook-media)**.
        </div>
    );
}