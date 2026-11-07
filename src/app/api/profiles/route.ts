import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService as supabase, hasForbiddenContent } from '@src/lib/commerce'
import { isSuspended } from '@src/lib/suspended-check'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'
import { detectExternalPlatform } from '@src/lib/chat-safety'

const ALLOWED_COUNTRIES = new Set([
  'KR','JP','CN','US','GB','CA','AU','DE','FR','SG','TH','VN','PH','MY','ID',
  'HK','TW','MN','IN','BR','MX','AE','SA','NZ','NL','SE','NO','DK','FI','CH',
])

// GET /api/profiles/me — 본인 전체 프로필 (email 포함)
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`profiles-me:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // birth_date는 애초에 조회 제외 (민감 정보, DB에서 전송 자체 차단)
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, full_name, avatar_url, bio, country, city, preferred_lang, languages, interests, is_host, is_premium, is_adult, trust_score, trust_badge, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PATCH /api/profiles/me — 프로필 수정
export async function PATCH(req: NextRequest) {
  const patchIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const patchRl = await checkRateLimit(`profiles-patch:${patchIp}`, 'general')
  if (!patchRl.allowed) {
    const r = rateLimitResponse(patchRl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (await isSuspended(user.id)) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  }

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
    if (hasForbiddenContent(dn)) {
      return NextResponse.json({ error: 'Display name contains prohibited content' }, { status: 400 })
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

  if ('bio' in updates) {
    const bio = updates.bio
    if (bio !== null && (typeof bio !== 'string' || bio.length > 500)) {
      return NextResponse.json({ error: 'bio must be under 500 characters' }, { status: 400 })
    }
    if (bio && hasForbiddenContent(bio)) {
      return NextResponse.json({ error: 'Bio contains prohibited content' }, { status: 400 })
    }
    if (bio && detectExternalPlatform(bio)) {
      return NextResponse.json({ error: 'External platform references not allowed in bio' }, { status: 400 })
    }
  }

  if ('city' in updates) {
    const city = updates.city
    if (city !== null && (typeof city !== 'string' || city.length > 100)) {
      return NextResponse.json({ error: 'city must be under 100 characters' }, { status: 400 })
    }
  }

  if ('avatar_url' in updates) {
    const url = updates.avatar_url
    if (url !== null) {
      if (typeof url !== 'string' || url.length > 2048) {
        return NextResponse.json({ error: 'Invalid avatar_url' }, { status: 400 })
      }
      if (!/^https?:\/\//i.test(url)) {
        return NextResponse.json({ error: 'avatar_url must be a valid URL' }, { status: 400 })
      }
    }
  }

  if ('languages' in updates) {
    const langs = updates.languages
    if (langs !== null) {
      if (!Array.isArray(langs) || langs.length > 20 || langs.some((l) => typeof l !== 'string' || l.length > 50)) {
        return NextResponse.json({ error: 'languages must be an array of up to 20 strings (each ≤50 chars)' }, { status: 400 })
      }
    }
  }

  if ('interests' in updates) {
    const ints = updates.interests
    if (ints !== null) {
      if (!Array.isArray(ints) || ints.length > 30 || ints.some((i) => typeof i !== 'string' || i.length > 50)) {
        return NextResponse.json({ error: 'interests must be an array of up to 30 strings (each ≤50 chars)' }, { status: 400 })
      }
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
    .select('id, display_name, full_name, avatar_url, bio, country, city, preferred_lang, languages, interests, is_host, is_premium, is_adult, trust_score, trust_badge, created_at, updated_at')
    .single()

  if (error) {
    // RLS WITH CHECK 실패 (42501): 허용되지 않는 필드 조작 시도
    if (error.code === '42501') {
      return NextResponse.json({ error: 'Forbidden: cannot update restricted fields' }, { status: 403 })
    }
    console.error('[profiles/PATCH] update error:', error.code)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json(data)
}
