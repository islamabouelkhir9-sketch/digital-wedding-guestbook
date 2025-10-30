'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Users, Clock, TrendingUp, Eye, LogOut, Loader2 } from 'lucide-react'; // تم إضافة LogOut و Loader2
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation'; // تم إضافة useRouter

interface Stats {
  totalSubmissions: number;
  unreadSubmissions: number;
  totalSenders: number;
  recentSubmissions: any[];
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({
        totalSubmissions: 0,
        unreadSubmissions: 0,
        totalSenders: 0,
        recentSubmissions: []
    });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null); // لتخزين بيانات المستخدم
    const [error, setError] = useState<string | null>(null);

    // دالة تسجيل الخروج (مضافة لسهولة الاستخدام)
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    useEffect(() => {
        checkUserAndLoadData();
    }, []);

    const checkUserAndLoadData = async () => {
        setLoading(true);
        setError(null);

        // 1. التحقق من المستخدم المسجل دخوله
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/'); // لو لم يكن مسجلاً، أعد توجيهه
            return;
        }

        setUser(user);
        
        // الآن وقد تأكدنا من تسجيل الدخول، نبدأ بتحميل إحصائيات الحدث الخاص به
        loadStats(user);
    };

    // 🔴 تم تعديل هذه الدالة لتعتمد على بيانات المستخدم لفرض الفلترة يدوياً
    const loadStats = async (user: any) => {
        try {
            // 1. جلب couple_id للمستخدم الحالي لضمان الأمان
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('couple_id')
                .eq('id', user.id) // فلترة باستخدام UUID المستخدم المسجل دخوله
                .single();

            if (userError || !userData) {
                throw new Error("User profile not found or couple ID missing. Please check 'users' table linking.");
            }
            
            const currentCoupleId = userData.couple_id;

            // 2. جلب الـ event_id الخاص بهذا الـ couple
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('id, title')
                .eq('couple_id', currentCoupleId) // ⬅️ الفلترة باستخدام couple_id
                .single(); 
            
            if (eventError || !eventData) {
                throw new Error("No event linked to this user's couple ID.");
            }

            const currentEventId = eventData.id;

            // 3. Get total submissions: فلترة يدوية إضافية للأمان باستخدام event_id
            const { count: totalCount } = await supabase
                .from('submissions')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', currentEventId); // ⬅️ الإضافة الجديدة لفرض الفلترة

            // 4. Get unread submissions: فلترة يدوية إضافية للأمان
            const { count: unreadCount } = await supabase
                .from('submissions')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', currentEventId) // ⬅️ الإضافة الجديدة لفرض الفلترة
                .eq('moderated', false);

            // 5. Get unique senders: فلترة يدوية إضافية للأمان
            const { data: sendersData } = await supabase
                .from('submissions')
                .select('sender_name')
                .eq('event_id', currentEventId); // ⬅️ الإضافة الجديدة لفرض الفلترة
            
            const uniqueSenders = new Set(sendersData?.map(s => s.sender_name) || []);

            // 6. Get recent submissions: فلترة يدوية إضافية للأمان
            const { data: recentData } = await supabase
                .from('submissions')
                .select('id, sender_name, content, created_at, moderated, type')
                .eq('event_id', currentEventId) // ⬅️ الإضافة الجديدة لفرض الفلترة
                .order('created_at', { ascending: false })
                .limit(5);

            setStats({
                totalSubmissions: totalCount || 0,
                unreadSubmissions: unreadCount || 0,
                totalSenders: uniqueSenders.size,
                recentSubmissions: recentData || []
            });
        } catch (e: any) {
            console.error('Error loading stats:', e.message);
            setError(e.message);
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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                <p className="text-gray-600 ml-3">Verifying access and loading data...</p>
            </div>
        );
    }
    
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

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
                    <p className="text-gray-600">Welcome back! Here's what's happening with your guestbook.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
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