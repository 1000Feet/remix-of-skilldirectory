import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { env } from '@/config/env';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance of the Supabase client
export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: localStorage,
    }
  }
);

// Prevent multiple instances warning in development
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - Add a flag to window to track client instance
  if (window.__SUPABASE_CLIENT_INITIALIZED) {
    console.warn(
      'Attempted to initialize multiple Supabase clients. Ignored to prevent duplicate instances.'
    );
  } else {
    // @ts-ignore - Set flag on window
    window.__SUPABASE_CLIENT_INITIALIZED = true;
  }
}
