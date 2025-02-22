import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://sheslhegcubntqohlgts.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZXNsaGVnY3VibnRxb2hsZ3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MjEyMTQsImV4cCI6MjA1NTI5NzIxNH0.dIUlq1-6v8aFVt5ypoVIqZXxn2bJV7PWpCrbESy00DU";

// Create a single instance of the Supabase client
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
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
