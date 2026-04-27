interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleMapsApiKey: string;
  baseUrl: string;
}

const getBaseUrl = () => {
  const isProd = import.meta.env.PROD
  return isProd ? import.meta.env.VITE_BASE_URL || '/' : '/'
}

export const env: EnvConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  baseUrl: getBaseUrl()
}

export type Env = typeof env
