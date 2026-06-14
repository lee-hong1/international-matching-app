'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface AdminPost {
  id: string
  user_id: string
  caption: string | null
  is_public: boolean
  likes_count: number
  comments_count: number
  created_at: string
  profiles: { full_name: string | null; email: string; avatar_url: string | null } | null
  post_media: { media_url: string; media_type: string }[]
}

export default function AdminPostsPage() {
  const [posts, setPosts]           = useState<AdminPost[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [preview, setPreview]       = useState<AdminPost | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const LIMIT = 12

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      let query = supabase
        .from('posts')
        .select(`
          id, user_id, caption, is_public, likes_count, comments_count, created_at,
          profiles!posts_user_id_fkey (full_name, email, avatar_url),
          post_media (media_url, media_type)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((p - 1) * LIMIT, p * LIMIT - 1)

      if (search) {
        query = query.ilike('caption', `%${search}%`)
      }

      const { data, count, error } = await query
      if (!error) {
        setPosts((data ?? []) as unknown as AdminPost[])
        setTotal(count ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  async function handleDelete(postId: string) {
    if (!confirm('이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    setDeleteLoading(postId)
    try {
      await supabase.from('posts').delete().eq('id', postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      setTotal((t) => t - 1)
      if (preview?.id === postId) setPreview(null)
    } finally {
      setDeleteLoading(null)
    }
  }

  async function handleTogglePublic(post: AdminPost) {
    const { error } = await supabase
      .from('posts')
      .update({ is_public: !post.is_public })
      .eq('id', post.id)
    if (!error) {
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, is_public: !post.is_public } : p))
      if (preview?.id === post.id) setPreview((p) => p ? { ...p, is_public: !post.is_public } : p)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n)
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">게시물 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">전체 {fmt(total)}개</p>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
              placeholder="캡션으로 검색..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
            />
          </div>
          <button onClick={() => { setSearch(searchInput); setPage(1) }} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            검색
          </button>
          {search && (
            <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 게시물 그리드 */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">게시물이 없습니다</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {posts.map((post) => {
              const thumb = post.post_media?.[0]?.media_url
              return (
                <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                  {/* 썸네일 */}
                  <div
                    className="relative aspect-square bg-gray-100 cursor-pointer overflow-hidden"
                    onClick={() => setPreview(post)}
                  >
                    {thumb ? (
                      <Image src={thumb} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                        <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
                        </svg>
                      </div>
                    )}
                    {!post.is_public && (
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-lg">비공개</div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 text-white text-xs">
                        <span>♥ {post.likes_count}</span>
                        <span>💬 {post.comments_count}</span>
                      </div>
                    </div>
                  </div>

                  {/* 정보 */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {post.profiles?.avatar_url
                          ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (post.profiles?.full_name ?? post.profiles?.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-700 font-medium truncate">{post.profiles?.full_name ?? '-'}</p>
                    </div>
                    {post.caption && (
                      <p className="text-xs text-gray-500 truncate mb-2">{post.caption}</p>
                    )}
                    <p className="text-xs text-gray-400 mb-3">{new Date(post.created_at).toLocaleDateString('ko-KR')}</p>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleTogglePublic(post)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${post.is_public ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {post.is_public ? '비공개' : '공개'}
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deleteLoading === post.id}
                        className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {deleteLoading === post.id ? '삭제 중' : '삭제'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} / {fmt(total)}개</p>
            <div className="flex gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-30 text-sm text-gray-600 shadow-sm">이전</button>
              <span className="px-3 py-1.5 text-sm text-gray-700">{page}/{totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-30 text-sm text-gray-600 shadow-sm">다음</button>
            </div>
          </div>
        </>
      )}

      {/* 게시물 상세 모달 */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {preview.profiles?.avatar_url
                    ? <img src={preview.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (preview.profiles?.full_name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{preview.profiles?.full_name ?? '-'}</p>
                  <p className="text-xs text-gray-400">{preview.profiles?.email}</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {preview.post_media?.[0] && (
              <div className="aspect-square relative bg-black">
                <Image src={preview.post_media[0].media_url} alt="" fill className="object-contain" />
              </div>
            )}

            <div className="p-5 space-y-3">
              {preview.caption && <p className="text-sm text-gray-700">{preview.caption}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>♥ {preview.likes_count}개</span>
                <span>💬 {preview.comments_count}개</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${preview.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {preview.is_public ? '공개' : '비공개'}
                </span>
              </div>
              <p className="text-xs text-gray-400">{new Date(preview.created_at).toLocaleString('ko-KR')}</p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleTogglePublic(preview)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors ${preview.is_public ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-500 text-white hover:bg-green-600'}`}
                >
                  {preview.is_public ? '비공개로 전환' : '공개로 전환'}
                </button>
                <button
                  onClick={() => handleDelete(preview.id)}
                  disabled={deleteLoading === preview.id}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteLoading === preview.id ? '삭제 중...' : '게시물 삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
