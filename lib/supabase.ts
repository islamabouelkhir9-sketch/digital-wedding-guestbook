// lib/supabase.ts

// ================================
// Supabase client setup for Next.js App Router
// ================================

// نستخدم createBrowserClient للـ client components في Next.js
import { createBrowserClient } from '@supabase/ssr';
// نوع SupabaseClient من المكتبة الأساسية
import type { SupabaseClient } from '@supabase/supabase-js';

// ================================
// تعريف قاعدة البيانات (Database Types)
// ================================
export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          couple_id: string;
          title: string;
          slug: string;
          settings: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          title: string;
          slug: string;
          settings?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          title?: string;
          slug?: string;
          settings?: any;
          created_at?: string;
        };
      };
      submissions: {
        Row: {
          id: string;
          event_id: string;
          sender_name: string;
          sender_contact: string | null;
          type: 'text' | 'voice' | 'photo' | 'video';
          content: string | null;
          storage_path: string | null;
          storage_meta: any;
          moderated: boolean;
          is_favorite: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          sender_name: string;
          sender_contact?: string | null;
          type: 'text' | 'voice' | 'photo' | 'video';
          content?: string | null;
          storage_path?: string | null;
          storage_meta?: any;
          moderated?: boolean;
          is_favorite?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          sender_name?: string;
          sender_contact?: string | null;
          type?: 'text' | 'voice' | 'photo' | 'video';
          content?: string | null;
          storage_path?: string | null;
          storage_meta?: any;
          moderated?: boolean;
          is_favorite?: boolean;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          couple_id: string;
          email: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          email: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          email?: string;
          role?: string;
          created_at?: string;
        };
      };
    };
  };
};

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
