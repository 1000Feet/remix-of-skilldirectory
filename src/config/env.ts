
interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleMapsApiKey: string;
  geminiApiKey: string;
  baseUrl: string;
}

const getBaseUrl = () => {
  const isProd = import.meta.env.PROD
  return isProd ? import.meta.env.VITE_BASE_URL || '/' : '/'
}

// In production, provide fallback values if env vars aren't available
const isProd = import.meta.env.PROD;

export const env: EnvConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || (isProd ? 'https://sheslhegcubntqohlgts.supabase.co' : ''),
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || (isProd ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZXNsaGVnY3VibnRxb2hsZ3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3MjEyMTQsImV4cCI6MjA1NTI5NzIxNH0.dIUlq1-6v8aFVt5ypoVIqZXxn2bJV7PWpCrbESy00DU' : ''),
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  baseUrl: getBaseUrl()
}

export type Env = typeof env
