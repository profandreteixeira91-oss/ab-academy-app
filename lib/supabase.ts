import 'react-native-url-polyfill/auto'
import 'expo-sqlite/localStorage/install'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
)

// Nunca deixe a ausência das variáveis de ambiente derrubar o aplicativo
// durante a inicialização. Em um build EAS, as variáveis devem ser
// fornecidas pelo ambiente de build (preview/production).
const safeSupabaseUrl = supabaseUrl || 'https://placeholder.invalid'
const safeSupabaseKey = supabasePublishableKey || 'placeholder'

export const supabase = createClient(safeSupabaseUrl, safeSupabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
