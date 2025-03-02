
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { env } from '@/config/env';

// Ensure we have valid URLs before creating the client
const supabaseUrl = env.supabaseUrl || 'https://sheslhegcubntqohlgts.supabase.co';
const supabaseAnonKey = env.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZXNsaGVnY3VibnRxb2hsZ3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MjEyMTQsImV4cCI6MjA1NTI5NzIxNH0.dIUlq1-6v8aFVt5ypoVIqZXxn2bJV7PWpCrbESy00DU';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables, using fallback values');
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
