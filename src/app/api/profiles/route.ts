import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/commerce'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_COUNTRIES = new Set([
  'KR','JP','CN','US','GB','CA','AU','DE','FR','SG','TH','VN','PH','MY','ID',
  'HK','TW','MN','IN','BR','MX','AE','SA','NZ','NL','SE','NO','DK','FI','CH',
])

// GET /api/profiles/me — 본인 전체 프로필 (email 포함)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // birth_date는 응답에서 제외 (민감 정보)
  const { birth_date: _bd, ...safeProfile } = data as Record<string, unknown>
  void _bd

  return NextResponse.json(safeProfile)
}

// PATCH /api/profiles/me — 프로필 수정
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = ['display_name', 'country', 'preferred_lang', 'avatar_url', 'bio', 'city', 'languages', 'interests']
  const updates: Record<string, unknown> = {}

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if ('display_name' in updates) {
    const dn = updates.display_name
    if (typeof dn !== 'string' || dn.trim().length < 1 || dn.trim().length > 50) {
      return NextResponse.json({ error: 'display_name must be 1-50 characters' }, { status: 400 })
    }
    updates.display_name = dn.trim()
  }

  if ('country' in updates) {
    const c = updates.country
    if (typeof c !== 'string' || !ALLOWED_COUNTRIES.has(c.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid country code' }, { status: 400 })
    }
    updates.country = c.toUpperCase()
  }

  if ('preferred_lang' in updates) {
    const l = updates.preferred_lang
    if (!['ko', 'en', 'ja', 'zh'].includes(l as string)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  const { birth_date: _bd, ...safeProfile } = data as Record<string, unknown>
  void _bd

  return NextResponse.json(safeProfile)
}
