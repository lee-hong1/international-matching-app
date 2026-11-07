import { NextRequest, NextResponse } from 'next/server'
import { supabaseService, getAuthUser, isValidUuid } from '@src/lib/commerce'
import { checkRateLimit, rateLimitResponse } from '@src/lib/ratelimit'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return adminEmails.length > 0 && adminEmails.includes(email.toLowerCase())
}

async function checkAdminAuth(req: NextRequest): Promise<NextResponse | null> {
  const user = await getAuthUser(req)
  if (!user?.email || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`admin-patch-post:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const authErr = await checkAdminAuth(req)
  if (authErr) return authErr

  const { id } = await params
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  let body: { is_public?: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.is_public !== 'boolean') {
    return NextResponse.json({ error: 'is_public must be boolean' }, { status: 400 })
  }

  try {
    const { error } = await supabaseService.from('posts').update({ is_public: body.is_public }).eq('id', id)
    if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = await checkRateLimit(`admin-delete-post:${ip}`, 'general')
  if (!rl.allowed) {
    const r = rateLimitResponse(rl.resetAt)
    return NextResponse.json(r.body, { status: r.status, headers: r.headers })
  }

  const authErr = await checkAdminAuth(req)
  if (authErr) return authErr

  const { id } = await params
  if (!id || !isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 })
  }

  try {
    const { error } = await supabaseService.from('posts').delete().eq('id', id)
    if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
