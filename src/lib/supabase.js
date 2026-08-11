import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase URL or Anon Key in environment variables')
}

// Global singleton client to reuse TCP connection sockets and prevent DB connection pool exhaustion
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        'Connection': 'keep-alive'
      }
    }
  }
)
