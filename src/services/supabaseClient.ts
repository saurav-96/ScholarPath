import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getAppEnv } from '@/lib/env';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const env = getAppEnv();
  if (!env.isSupabaseConfigured) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cachedClient;
}
