// استخدم createBrowserClient من أجل Next.js App Router
import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'; 
import { createClient } from '@supabase/supabase-js'; // للإكمال التلقائي لأنواع الـ DB (اختياري)

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
// 💡 التعديل هنا: استخدام createBrowserClient بدلاً من createClient
// =================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// هذا هو العميل الذي سيُستخدم في مكونات الـ 'use client'
export const supabase: SupabaseClient<Database> = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);