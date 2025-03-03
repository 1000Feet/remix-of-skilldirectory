
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Use environment variables with fallback values to prevent URL construction errors
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sheslhegcubntqohlgts.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZXNsaGVnY3VibnRxb2hsZ3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MjEyMTQsImV4cCI6MjA1NTI5NzIxNH0.dIUlq1-6v8aFVt5ypoVIqZXxn2bJV7PWpCrbESy00DU';

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
