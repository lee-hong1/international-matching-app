import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
)

const PLATFORM_FEE_RATES: Record<string, number> = {
  physical: 0.10,
  digital: 0.20,
  groupbuy: 0.08,
  gift_package: 0.25,
}

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

// 호스트 미니샵 상품 목록
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const hostId = searchParams.get('host_id')
  const productType = searchParams.get('type')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  if (!hostId) {
    return NextResponse.json({ error: 'host_id가 필요합니다' }, { status: 400 })
  }

  let query = supabase
    .from('host_products')
    .select('id, host_id, product_type, title, description, price, stock, images, sold_count, created_at, profiles!host_products_host_id_fkey(full_name, avatar_url)')
    .eq('host_id', hostId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (productType) query = query.eq('product_type', productType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data ?? [] })
}

// 상품 등록 (호스트 전용)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

  try {
    const body = await req.json()
    const { product_type, title, description, price, stock, images, groupbuy_config } = body

    if (!product_type || !title || !price) {
      return NextResponse.json({ error: '필수 항목 누락: product_type, title, price' }, { status: 400 })
    }

    const feeRate = PLATFORM_FEE_RATES[product_type]
    if (!feeRate) {
      return NextResponse.json({ error: '유효하지 않은 product_type' }, { status: 400 })
    }

    if (price < 1000) {
      return NextResponse.json({ error: '최소 가격은 ₩1,000입니다' }, { status: 400 })
    }

    const { data: product, error: insertError } = await supabase
      .from('host_products')
      .insert({
        host_id: user.id,
        product_type,
        title: title.slice(0, 100),
        description: description?.slice(0, 2000),
        price,
        stock: product_type === 'digital' ? null : (stock ?? null),
        images: images ?? [],
        platform_fee_rate: feeRate * 100,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // 공구 캠페인 동시 생성
    if (product_type === 'groupbuy' && groupbuy_config) {
      const { min_quantity, max_quantity, deadline, original_price, supplier_note, shipping_fee, expected_ship_date } = groupbuy_config

      if (!min_quantity || !deadline || !original_price) {
        return NextResponse.json({ error: '공구 설정 누락: min_quantity, deadline, original_price' }, { status: 400 })
      }

      const deadlineDate = new Date(deadline)
      if (deadlineDate <= new Date()) {
        return NextResponse.json({ error: '마감일은 미래여야 합니다' }, { status: 400 })
      }

      await supabase.from('groupbuy_campaigns').insert({
        host_id: user.id,
        product_id: product.id,
        title: product.title,
        unit_price: price,
        original_price,
        min_quantity,
        max_quantity: max_quantity ?? null,
        deadline,
        supplier_note: supplier_note ?? null,
        shipping_fee: shipping_fee ?? 0,
        expected_ship_date: expected_ship_date ?? null,
        status: 'open',
      })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
