import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// 공구 참여 — 에스크로 패턴 (deadline 도달 시 결제 확정 or 환불)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  try {
    const { quantity, shipping_addr, payment_key } = await req.json()

    if (!quantity || !shipping_addr || !payment_key) {
      return NextResponse.json({ error: '필수 항목 누락: quantity, shipping_addr, payment_key' }, { status: 400 })
    }

    // 캠페인 조회 및 검증
    const { data: campaign, error: campErr } = await supabase
      .from('groupbuy_campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('status', 'open')
      .single()

    if (campErr || !campaign) {
      return NextResponse.json({ error: '진행 중인 공구를 찾을 수 없습니다' }, { status: 404 })
    }

    if (new Date(campaign.deadline) <= new Date()) {
      return NextResponse.json({ error: '마감된 공구입니다' }, { status: 409 })
    }

    if (campaign.max_quantity && campaign.current_quantity + quantity > campaign.max_quantity) {
      return NextResponse.json({ error: '최대 수량을 초과합니다' }, { status: 409 })
    }

    // 중복 참여 방지
    const { data: existing } = await supabase
      .from('groupbuy_orders')
      .select('id')
      .eq('campaign_id', params.id)
      .eq('buyer_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: '이미 참여한 공구입니다' }, { status: 409 })
    }

    const totalPrice = campaign.unit_price * quantity + campaign.shipping_fee
    const idempotencyKey = `groupbuy_${user.id}_${params.id}_${Date.now()}`

    const { data: order, error: orderErr } = await supabase
      .from('groupbuy_orders')
      .insert({
        campaign_id: params.id,
        buyer_id: user.id,
        quantity,
        unit_price: campaign.unit_price,
        total_price: totalPrice,
        shipping_addr,
        payment_key,
        payment_status: 'held',
        idempotency_key: idempotencyKey,
      })
      .select()
      .single()

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

    // 현재 참여 수량 증가 (atomic)
    await supabase.rpc('increment_groupbuy_quantity', {
      p_campaign_id: params.id,
      p_quantity: quantity,
    })

    return NextResponse.json({
      order,
      message: '공구 참여 완료. 마감일 이후 결제가 확정됩니다.',
      deadline: campaign.deadline,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
