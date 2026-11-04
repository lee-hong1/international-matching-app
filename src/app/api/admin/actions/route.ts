/**
 * GET /api/admin/actions
 *
 * 관리자 감사 로그 조회. x-admin-key 인증 (timingSafeEqual).
 * Query: target_user_id?, limit=20, before_id? (cursor pagination)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

function isValidUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function checkAdminKey(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY
  if (!adminKey) return false
  const provided = req.headers.get('x-admin-key') ?? ''
  if (!provided) return false
  try {
    const a = Buffer.from(adminKey, 'utf8')
    const b = Buffer.from(provided, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('target_user_id')
  const beforeId = searchParams.get('before_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  if (targetUserId && !isValidUuid(targetUserId)) {
    return NextResponse.json({ error: 'Invalid target_user_id' }, { status: 400 })
  }
  if (beforeId && !isValidUuid(beforeId)) {
    return NextResponse.json({ error: 'Invalid before_id' }, { status: 400 })
  }

  try {
    let query = supabaseService
      .from('admin_actions')
      .select('id, admin_key_hash, target_user_id, action, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (targetUserId) query = query.eq('target_user_id', targetUserId)
    if (beforeId) {
      const { data: cursor } = await supabaseService
        .from('admin_actions')
        .select('created_at')
        .eq('id', beforeId)
        .single()
      if (cursor) query = query.lt('created_at', cursor.created_at)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ actions: data ?? [], count: (data ?? []).length })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
