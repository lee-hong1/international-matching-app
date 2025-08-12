import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 클라이언트 측용 Supabase 클라이언트
export const createClientComponentClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}