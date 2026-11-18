import { createClient } from '@supabase/supabase-js'

let _client: ReturnType<typeof createClient> | null = null

function getBrowserClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await getBrowserClient().auth.getSession()
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  } catch {
    return {}
  }
}
