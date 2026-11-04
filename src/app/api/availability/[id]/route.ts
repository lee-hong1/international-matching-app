import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, supabaseService, isValidUuid } from '@/lib/commerce'

/**
 * DELETE /api/availability/:id
 * 가용 시간 슬롯 삭제 (soft: is_active=false).
 * JWT host_id — IDOR 방지.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid availability id' }, { status: 400 })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 소유권 확인 (IDOR 방지)
  const { data: slot, error: fetchErr } = await supabaseService
    .from('host_availability')
    .select('id, host_id')
    .eq('id', id)
    .single()

  if (fetchErr || !slot) {
    return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 })
  }
  if (slot.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabaseService
    .from('host_availability')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete availability slot' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
