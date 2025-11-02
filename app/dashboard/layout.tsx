'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Heart, LayoutDashboard, FolderOpen, Settings, LogOut, Loader2, Presentation, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    setIsSidebarOpen(false); 
    
    // 💡 إصلاح 1: تعطيل تمرير الجسم عند فتح القائمة الجانبية على الجوال
    if (isSidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      // إعادة تفعيل التمرير عند إزالة المكون
      document.body.style.overflow = 'auto'; 
    };

  }, [user, loading, router, pathname, isSidebarOpen]); // أضفت isSidebarOpen كاعتماد

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // --- شاشة التحميل والمستخدم غير المسجل ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-500" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  // --------------------------------------------

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { href: '/dashboard/submissions', icon: FolderOpen, label: 'Submissions' },
    { href: '/dashboard/slideshow', icon: Presentation, label: 'Slideshow' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    {/* 💡 إصلاح 2: إضافة h-screen لضمان أن الحاوية الرئيسية تغطي الشاشة بالكامل */}
    <div className="flex h-screen bg-gray-50"> 
      
      {/* 1. Sidebar (Fixed on Desktop, Off-Canvas on Mobile) */}
      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky 
      `}>
        
        <button 
          className="absolute top-3 right-3 lg:hidden text-gray-400 hover:text-gray-700 p-2 z-50 bg-white/50 rounded-full" 
          onClick={() => setIsSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 💡 إصلاح 3: جعل محتوى الشريط الجانبي قابلاً للتمرير إذا أصبح طويلاً جداً */}
        <div className="p-6 h-full w-full flex flex-col justify-between overflow-y-auto">
          
          {/* Header & Navigation */}
          <div>
            {/* باقي الكود هنا... */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Guestbook</h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${
                      isActive
                        ? 'bg-purple-100 text-purple-700 font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sign Out Section */}
          <div className="border-t border-gray-200 pt-6 mt-auto">
            {/* باقي الكود هنا... */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Signed in as</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      {/* 💡 إصلاح 4: جعل المحتوى الرئيسي قابلاً للتمرير عمودياً */}
      <div className={`
          flex flex-col flex-1 min-w-0 h-full overflow-y-auto 
          lg:ml-64 
          transition-all duration-300
      `}>

        {/* Top Bar for Mobile */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 p-4 lg:hidden">
          <div className="flex items-center">
              <button 
                className="text-gray-700 hover:text-gray-900 p-1" 
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="ml-4 font-semibold text-gray-900">Dashboard</h2>
          </div>
        </header>

        {/* Main Content */}
        {/* 💡 إصلاح 5: حذف p-4/sm:p-6/lg:p-8 من هنا لنضيفه لاحقاً في page.tsx */}
        <main className="flex-grow">
          {children}
        </main>
      </div>

      {/* 3. Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}
    </div>
  );
}