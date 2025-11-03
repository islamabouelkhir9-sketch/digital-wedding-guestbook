// lib/supabase.ts

// ================================
// Supabase client setup for Next.js App Router
// ================================

// نستخدم createBrowserClient للـ client components في Next.js
import { createBrowserClient } from '@supabase/ssr';
// نوع SupabaseClient من المكتبة الأساسية
import type { SupabaseClient } from '@supabase/supabase-js';

// **الخطوة الحاسمة: استيراد Database من ملف الأنواع المُولَّد**
import type { Database } from '@/types/supabase'; 

// ================================
// *** تم حذف تعريف Database من هذا الملف ***
// ================================

// ================================
// إنشاء عميل Supabase
// ================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// تحذير أثناء التطوير لو ناقص مفاتيح البيئة
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[Supabase] Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.'
    );
  }
}

// إنشاء العميل وتحديد نوع الـ Database
export const supabase: SupabaseClient<Database> = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);