import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// When the env vars are missing the app runs in DEMO mode: all data lives in the
// browser (localStorage) so the site can be previewed without a backend.
export const IS_DEMO = !url || !anonKey

export const supabase = IS_DEMO ? null : createClient(url, anonKey)
