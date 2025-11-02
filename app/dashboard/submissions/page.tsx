'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Download, Trash2, Eye, EyeOff, Star, StarOff, FolderOpen, ChevronRight, ChevronLeft, Play, Image as ImageIcon, Video, Mic, MessageSquare, Loader2, LogOut } from 'lucide-react';
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
    const cleaned = path.startsWith('/') ? path.substring(1) : path;
    return cleaned;
};

// 📌 بداية مكون الصفحة الرئيسية
export default function SubmissionsPage() {
    const router = useRouter();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [groupedSubmissions, setGroupedSubmissions] = useState<Record<string, Submission[]>>({});
    // 💡 التعديل: لن يتم عرض التفاصيل إلا بعد اختيار مرسل
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
            console.log('Attempting to load submissions for Event ID:', currentEventId); 
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('event_id', currentEventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            console.log('✅ SUBMISSIONS LOAD SUCCESS:', data.length, 'submissions loaded.'); 
            
            setSubmissions(data || []);
            // setSelectedSender(null); // لا نحتاج لإعادة التعيين هنا، التجميع سيقوم بذلك
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

        // 2. جلب couple_id للمستخدم الحالي
        try {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('couple_id')
                .eq('id', user.id)
                .single();

            if (userError || !userData) {
                throw new Error("User profile not found. Check 'users' table RLS.");
            }
            
            const currentCoupleId = (userData as { couple_id: string }).couple_id;

            // 3. جلب الـ event_id الخاص بهذا الـ couple
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('id')
                .eq('couple_id', currentCoupleId)
                .single(); 
            
            if (eventError || !eventData) {
                throw new Error("No event linked to this user's couple ID. Check 'events' table RLS.");
            }

            const currentEventId = (eventData as { id: string }).id;

            // 4. تحميل الرسائل باستخدام الـ event_id
            await loadSubmissions(currentEventId);

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

            const { error } = await (supabase as any)
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

            const { error } = await (supabase as any)
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
            // إذا كان هذا آخر إرسال لهذا المرسل، نعود إلى قائمة المرسلين
            if (selectedSender && groupedSubmissions[selectedSender]?.length === 1) {
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
        // 💡 التعديل: تقليل الـ padding على الموبايل وزيادته تدريجياً
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            {/* 💡 التعديل: جعل زر الخروج أصغر وأكثر تجاوبًا على الموبايل */}
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className='flex-1 min-w-0'>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Submissions</h1>
                    <p className="text-sm text-gray-600 truncate">Browse and manage all guest submissions organized by sender.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex-shrink-0"
                >
                    <LogOut className="w-4 h-4" />
                    <span className='hidden sm:inline'>Logout</span>
                </button>
            </div>

            {/* Main Content: Two-Column Layout (Responsive) */}
            {/* 💡 التعديل الأهم: Grid يصبح عمودًا واحدًا على الموبايل (lg:grid-cols-12) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Sender List (Sidebar) */}
                {/* 💡 التعديل: يُعرض كشاشة كاملة على الموبايل إذا لم يتم تحديد مرسل (hidden / block)
                    ويصبح شريطًا جانبيًا ثابتًا على الشاشات الكبيرة (lg:col-span-4) */}
                <div 
                    className={`
                        ${selectedSender ? 'hidden lg:block' : 'block'} 
                        col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 
                        min-h-[calc(100vh-140px)] lg:min-h-0
                    `}
                >
                    <h2 className="text-xl font-bold text-gray-900 mb-4 hidden lg:block">Guest List</h2>

                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search senders..."
                                className="w-full pl-11 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto lg:max-h-[600px]">
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
                                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${
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
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{sender}</p>
                                            <p className="text-xs text-gray-500">
                                                {groupedSubmissions[sender].length} submission{groupedSubmissions[sender].length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 ml-2 flex-shrink-0 ${
                                        selectedSender === sender ? 'text-purple-600' : 'text-gray-400'
                                    }`} />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Submission Details */}
                {/* 💡 التعديل: يُعرض كشاشة كاملة على الموبايل فقط عند تحديد مرسل (block / hidden)
                    ويصبح المحتوى الرئيسي على الشاشات الكبيرة (lg:col-span-8) */}
                <div 
                    className={`
                        ${selectedSender ? 'block' : 'hidden lg:block'} 
                        col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6
                        min-h-[calc(100vh-140px)] lg:min-h-0
                    `}
                >
                    {!selectedSender ? (
                        <div className="flex items-center justify-center h-full text-center py-20">
                            <div>
                                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a Sender</h3>
                                <p className="text-gray-500 text-sm">Choose a sender from the list to view their submissions</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* 💡 التعديل: إضافة زر العودة (Back) على الموبايل */}
                            <div className="flex items-center justify-between mb-6">
                                <div className='flex items-center'>
                                    <button 
                                        onClick={() => setSelectedSender(null)} 
                                        className="p-2 mr-2 lg:hidden bg-gray-100 rounded-full hover:bg-gray-200"
                                        title="Back to Senders"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{selectedSender}</h2>
                                        <p className="text-sm text-gray-600">
                                            {groupedSubmissions[selectedSender]?.length || 0} submission{(groupedSubmissions[selectedSender]?.length || 0) !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto lg:max-h-[600px]">
                                {groupedSubmissions[selectedSender]?.map((submission) => (
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
                                                    <p className="font-medium text-sm text-gray-900 capitalize">{submission.type} Message</p>
                                                    <p className="text-xs text-gray-500">{formatDate(submission.created_at)}</p>
                                                </div>
                                            </div>
                                            {/* 💡 التعديل: تجميع أزرار الإجراءات في شريط واحد */}
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                <ActionButton 
                                                    onClick={() => toggleFavorite(submission.id, submission.is_favorite)}
                                                    status={submission.is_favorite}
                                                    IconOn={Star}
                                                    IconOff={StarOff}
                                                    titleOn="Remove from favorites"
                                                    titleOff="Add to favorites"
                                                    colorOn="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                                                    colorOff="bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                    fillOn={true}
                                                />
                                                <ActionButton 
                                                    onClick={() => toggleModeration(submission.id, submission.moderated)}
                                                    status={submission.moderated}
                                                    IconOn={Eye}
                                                    IconOff={EyeOff}
                                                    titleOn="Hide from public"
                                                    titleOff="Approve for public"
                                                    colorOn="bg-green-50 text-green-600 hover:bg-green-100"
                                                    colorOff="bg-gray-50 text-gray-400 hover:bg-gray-100"
                                                />
                                                {submission.storage_path && (
                                                    <ActionButton 
                                                        onClick={() => downloadMedia(submission.storage_path!, `${submission.sender_name}-${submission.type}.${submission.storage_meta?.type?.split('/')[1] || 'file'}`)}
                                                        IconOn={Download}
                                                        titleOn="Download"
                                                        colorOn="bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                        isToggle={false}
                                                    />
                                                )}
                                                <ActionButton 
                                                    onClick={() => deleteSubmission(submission.id, submission.storage_path)}
                                                    IconOn={Trash2}
                                                    titleOn="Delete"
                                                    colorOn="bg-red-50 text-red-600 hover:bg-red-100"
                                                    isToggle={false}
                                                />
                                            </div>
                                        </div>

                                        {submission.type === 'text' && (
                                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                                            </div>
                                        )}

                                        {submission.type !== 'text' && submission.storage_path && (
                                            <div className="mt-3">
                                                <SubmissionMediaViewer submission={submission} />
                                            </div>
                                        )}

                                        {submission.sender_contact && (
                                            <div className="mt-3 text-xs text-gray-500">
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

// 💡 مكون جديد (Action Button) لتنظيف الكود وجعله أكثر قراءة
const ActionButton = ({ onClick, status, IconOn, IconOff, titleOn, titleOff, colorOn, colorOff, isToggle = true, fillOn = false }: any) => {
    const Icon = (isToggle && !status) ? IconOff : IconOn;
    const title = (isToggle && !status) ? titleOff : titleOn;
    const color = (isToggle && !status) ? colorOff : colorOn;
    const fill = (isToggle && status && fillOn) ? 'fill-current' : '';

    return (
        <button
            onClick={onClick}
            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${color}`}
            title={title}
        >
            <Icon className={`w-4 h-4 ${fill}`} />
        </button>
    );
};


// 📌 مكون عرض الوسائط (SubmissionMediaViewer) - تم تضمينه لسهولة النسخ واللصق
function SubmissionMediaViewer({ submission }: { submission: Submission }) {
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadMedia = async () => {
        if (!submission.storage_path) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const cleanedPath = cleanStoragePath(submission.storage_path);

        if (!cleanedPath) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.storage
                .from('guestbook-media')
                .createSignedUrl(cleanedPath, 3600); 

            if (error) {
                console.error('*** Supabase Signed URL Error (CRITICAL):', error.message);
            }
            
            if (data?.signedUrl) { 
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

    useEffect(() => {
        loadMedia();
    }, [submission.storage_path]); 

    if (loading) {
        return (
            <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg text-gray-600 text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500 mr-2" />
                <p>Loading {submission.type}...</p>
            </div>
        );
    }
    
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
                    className="w-full rounded-lg max-h-80 object-contain bg-gray-100" // تم تقليل الارتفاع ليتناسب مع الموبايل
                />
            );
        }

        if (submission.type === 'video') {
            return (
                <video controls className="w-full rounded-lg max-h-80">
                    <source src={mediaUrl} />
                </video>
            );
        }
    }
    
    return (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
            Failed to load {submission.type}. Check RLS policy on **Storage Bucket (guestbook-media)**.
        </div>
    );
}