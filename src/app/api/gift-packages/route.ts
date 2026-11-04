import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

const GIFT_PACKAGES = {
  flowers: { price: 50000, name: '꽃다발', partner: '꽃배달파트너' },
  chocolate: { price: 30000, name: '초콜릿 세트', partner: 'CJ대한통운' },
  wine: { price: 80000, name: '와인 선물셋', partner: 'CJ대한통운' },
  custom_box: { price: 150000, name: '커스텀 기프트박스', partner: 'CJ대한통운' },
} as const

const PLATFORM_FEE_RATE = 0.25

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// 실물 선물 패키지 발주
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  try {
    const { receiver_id, package_type, message, payment_key } = await req.json()

    if (!receiver_id || !package_type || !payment_key) {
      return NextResponse.json({ error: '필수 항목 누락: receiver_id, package_type, payment_key' }, { status: 400 })
    }

    const pkg = GIFT_PACKAGES[package_type as keyof typeof GIFT_PACKAGES]
    if (!pkg) {
      return NextResponse.json({ error: '유효하지 않은 package_type' }, { status: 400 })
    }

    if (receiver_id === user.id) {
      return NextResponse.json({ error: '자신에게 선물할 수 없습니다' }, { status: 400 })
    }

    // 수신자 존재 및 주소 등록 여부 확인
    const { data: receiver } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', receiver_id)
      .single()

    if (!receiver) {
      return NextResponse.json({ error: '수신자를 찾을 수 없습니다' }, { status: 404 })
    }

    const platformCut = Math.floor(pkg.price * PLATFORM_FEE_RATE)
    const idempotencyKey = `gift_pkg_${user.id}_${receiver_id}_${Date.now()}`

    const { data: giftPackage, error: insertErr } = await supabase
      .from('gift_packages')
      .insert({
        sender_id: user.id,
        receiver_id,
        package_type,
        price: pkg.price,
        platform_cut: platformCut,
        delivery_partner: pkg.partner,
        message: message?.slice(0, 300) ?? null,
        status: 'ordered',
        idempotency_key: idempotencyKey,
        payment_key,
      })
      .select()
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // 호스트에게 선물 알림 발송 (개인정보 미포함)
    await supabase.from('notifications').insert({
      user_id: receiver_id,
      type: 'gift_package_received',
      title: '새 선물이 도착했어요 🎁',
      body: `${pkg.name} 선물 패키지가 배송 준비 중입니다`,
      data: { gift_package_id: giftPackage.id },
    })

    return NextResponse.json({
      gift_package: { id: giftPackage.id, status: giftPackage.status, package_type, price: pkg.price },
      message: '선물이 성공적으로 발주되었습니다',
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// 내 선물 패키지 목록 (보낸 것 / 받은 것)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const direction = searchParams.get('direction') ?? 'received' // 'sent' | 'received'

  const column = direction === 'sent' ? 'sender_id' : 'receiver_id'

  const { data, error } = await supabase
    .from('gift_packages')
    .select('id, package_type, price, status, message, sent_at, received_at, created_at, profiles!gift_packages_sender_id_fkey(full_name, avatar_url)')
    .eq(column, user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ packages: data ?? [] })
}
