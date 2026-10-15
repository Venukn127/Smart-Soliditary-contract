import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

function isValidSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export const supabaseConfigurationStatus =
  !supabaseUrl || !supabasePublishableKey
    ? 'missing'
    : !isValidSupabaseUrl(supabaseUrl)
      ? 'invalid-url'
      : 'configured';

export const supabaseConfigured = supabaseConfigurationStatus === 'configured';

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
