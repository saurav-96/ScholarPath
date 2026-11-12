export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  basePath: string;
  aiEndpoint: string;
  isSupabaseConfigured: boolean;
}

export function getAppEnv(): AppEnv {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const basePath = (import.meta.env.BASE_URL ?? '/').trim() || '/';
  const aiEndpoint = (import.meta.env.VITE_AI_ENDPOINT ?? '').trim();

  const isSupabaseConfigured =
    supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 20;

  return {
    supabaseUrl,
    supabaseAnonKey,
    basePath,
    aiEndpoint,
    isSupabaseConfigured,
  };
}
