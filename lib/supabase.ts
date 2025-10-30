// lib/supabase.ts

// استخدم createBrowserClient من أجل Next.js App Router
import { createBrowserClient } from '@supabase/ssr'; 
// FIX: استيراد نوع SupabaseClient يجب أن يكون من المكتبة الأساسية
import type { SupabaseClient } from '@supabase/supabase-js'; 

// يمكنك إزالة هذا السطر إذا كنت لا تستخدم دالة createClient
// import { createClient } from '@supabase/supabase-js'; // للإكمال التلقائي لأنواع الـ DB (اختياري)

// هذا هو تعريف قاعدة بياناتك (Database Types)
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

// =================================================================
// استخدام createBrowserClient بدلاً من createClient
// =================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// هذا هو العميل الذي سيُستخدم في مكونات الـ 'use client'
// FIX: تحديد نوع supabase Client مع نوع الـ Database الخاص بك
export const supabase: SupabaseClient<Database> = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);
