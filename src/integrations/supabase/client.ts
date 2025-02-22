
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance of the Supabase client
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storage: localStorage,
      storageKey: 'skilldirectory.auth.token'
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
