'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  User,
  Session,
  AuthChangeEvent,
  SupabaseClient
} from '@supabase/supabase-js';
import type { Database } from '../types/supabase'; // ✅ نربطه مباشرة بالـ types الأصلي

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, coupleId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ supabase client typed
  const typedSupabase = supabase as unknown as SupabaseClient<Database>;

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data } = await typedSupabase.auth.getSession();
        const session = data.session as Session | null;
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = typedSupabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [typedSupabase]);

  const signIn = async (email: string, password: string) => {
    const { error } = await typedSupabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, coupleId: string) => {
    const { error: signUpError } = await typedSupabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) throw signUpError;

    // ✅ هنا تم إصلاح النوع بحيث يتعرف على جدول users من قاعدة البيانات
    const { error: insertError } = await typedSupabase
      .from('users')
      .insert([
        {
          email,
          couple_id: coupleId,
          role: 'couple',
        },
      ] satisfies Database['public']['Tables']['users']['Insert'][]);

    if (insertError) throw insertError;
  };

  const signOut = async () => {
    const { error } = await typedSupabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
