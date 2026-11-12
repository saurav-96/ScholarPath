import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAppEnv } from '@/lib/env';
import {
  dataService,
  getDemoSession,
  resetDemoWorkspace,
  setDemoSession,
  type AuthSession,
} from '@/services/dataService';
import { getSupabaseClient } from '@/services/supabaseClient';
import type { UserRole } from '@/types/domain';

interface AuthContextValue {
  session: AuthSession;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<{ needsVerification: boolean }>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsDemo: (role?: UserRole, displayName?: string) => void;
  resetDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const env = getAppEnv();
  const [loading, setLoading] = useState<boolean>(env.isSupabaseConfigured);
  const [session, setSession] = useState<AuthSession>(() => {
    if (!env.isSupabaseConfigured) {
      return getDemoSession();
    }
    return {
      mode: 'connected',
      authenticated: false,
      userId: '',
      email: '',
      displayName: '',
      role: 'student',
    };
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    async function syncUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) {
      if (!active) return;
      if (!user) {
        setSession({
          mode: 'connected',
          authenticated: false,
          userId: '',
          email: '',
          displayName: '',
          role: 'student',
        });
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase!
        .from('profiles')
        .select('role, display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;
      setSession({
        mode: 'connected',
        authenticated: true,
        userId: user.id,
        email: user.email ?? '',
        displayName:
          profile?.display_name ||
          String(user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Student'),
        role: (profile?.role as UserRole) || 'student',
      });
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      syncUser(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncUser(nextSession?.user ?? null);
      queryClient.invalidateQueries({ queryKey: ['userState'] });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        return;
      }

      // Demo mode sign-in preserves student persistence and explicitly signs into demo session
      const next: AuthSession = {
        mode: 'demo',
        authenticated: true,
        userId: 'demo-student-nepal',
        email,
        displayName: email.split('@')[0] || 'Student',
        role: 'student',
      };
      setDemoSession(next);
      setSession(next);
      await queryClient.invalidateQueries({ queryKey: ['userState'] });
    },
    [queryClient],
  );

  const signUp = useCallback(
    async (displayName: string, email: string, password: string) => {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
          },
        });
        if (error) throw new Error(error.message);
        return { needsVerification: !data.session };
      }

      const next: AuthSession = {
        mode: 'demo',
        authenticated: true,
        userId: 'demo-student-nepal',
        email,
        displayName,
        role: 'student',
      };
      setDemoSession(next);
      setSession(next);

      const currentState = await dataService.fetchUserState(next);
      await dataService.saveProfile(next, {
        ...currentState.profile,
        displayName,
        email,
        onboardingCompleted: false,
      });
      await queryClient.invalidateQueries({ queryKey: ['userState'] });
      return { needsVerification: false };
    },
    [queryClient],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${env.basePath}login`,
      });
      if (error) throw new Error(error.message);
    }
  }, [env.basePath]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      queryClient.clear();
      return;
    }

    const signedOut: AuthSession = {
      mode: 'demo',
      authenticated: false,
      userId: '',
      email: '',
      displayName: '',
      role: 'student',
    };
    setDemoSession(signedOut);
    setSession(signedOut);
    await queryClient.invalidateQueries({ queryKey: ['userState'] });
  }, [queryClient]);

  const continueAsDemo = useCallback(
    (role: UserRole = 'student', displayName?: string) => {
      if (getSupabaseClient()) {
        // Connected mode users still can explore public catalog; local demo switch only applies when unconfigured
        return;
      }
      const next: AuthSession = {
        mode: 'demo',
        authenticated: true,
        userId: role === 'admin' ? 'demo-admin-sandbox' : 'demo-student-nepal',
        email:
          role === 'admin'
            ? 'admin-sandbox@demo.scholarpath.local'
            : 'student@demo.scholarpath.local',
        displayName:
          displayName ||
          (role === 'admin' ? 'Catalog Verifier (Sandbox)' : 'Aarav Shrestha (Demo Profile)'),
        role,
      };
      setDemoSession(next);
      setSession(next);
      queryClient.invalidateQueries({ queryKey: ['userState'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
    [queryClient],
  );

  const resetDemo = useCallback(() => {
    resetDemoWorkspace();
    continueAsDemo('student');
    queryClient.invalidateQueries();
  }, [continueAsDemo, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signIn,
        signUp,
        requestPasswordReset,
        signOut,
        continueAsDemo,
        resetDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
