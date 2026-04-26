'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminService, type UserManagement } from '@/lib/admin'
import { supabase } from '@/lib/supabase'

const VERIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: '대기중',  color: 'bg-yellow-100 text-yellow-700' },
  verified: { label: '인증됨',  color: 'bg-green-100  text-green-700'  },
  rejected: { label: '거절됨',  color: 'bg-red-100    text-red-700'    },
}

interface UserDetail extends UserManagement {
  bio?: string
  interests?: string[]
  is_suspended?: boolean
  suspension_reason?: string
}

export default function AdminUsersPage() {
  const [users, setUsers]               = useState<UserManagement[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(false)
  const [search, setSearch]             = useState('')
  const [searchInput, setSearchInput]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPremium, setFilterPremium] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const LIMIT = 15

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const { users: data, total: t } = await adminService.getUsers(p, LIMIT, {
        search:             search || undefined,
        verificationStatus: filterStatus || undefined,
        isPremium:          filterPremium === 'true' ? true : filterPremium === 'false' ? false : undefined,
      })
      setUsers(data)
      setTotal(t)
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus, filterPremium])

  useEffect(() => { load() }, [load])

  async function openUser(user: UserManagement) {
    const { data } = await supabase
      .from('profiles')
      .select('bio, interests, is_suspended, suspension_reason')
      .eq('id', user.id)
      .single()
    setSelectedUser({ ...user, ...(data ?? {}) })
    setSuspendReason('')
  }

  async function handleVerify(userId: string, status: 'verified' | 'rejected') {
    setActionLoading(true)
    try {
      await adminService.updateUserVerification(userId, status)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, verification_status: status } : u))
      if (selectedUser?.id === userId) setSelectedUser((p) => p ? { ...p, verification_status: status } : p)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSuspend(userId: string, suspend: boolean) {
    setActionLoading(true)
    try {
      await adminService.suspendUser(userId, suspend, suspendReason || undefined)
      if (selectedUser?.id === userId) setSelectedUser((p) => p ? { ...p, is_suspended: suspend } : p)
    } finally {
      setActionLoading(false)
      setSuspendReason('')
    }
  }

  function applySearch() { setSearch(searchInput); setPage(1) }

  function resetFilters() {
    setSearch(''); setSearchInput(''); setFilterStatus(''); setFilterPremium(''); setPage(1)
  }

  const totalPages = Math.ceil(total / LIMIT)
  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">회원 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">전체 {fmt(total)}명</p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                placeholder="이름, 이메일로 검색..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50"
              />
            </div>
            <button onClick={applySearch} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
              검색
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">인증 전체</option>
              <option value="pending">대기중</option>
              <option value="verified">인증됨</option>
              <option value="rejected">거절됨</option>
            </select>
            <select value={filterPremium} onChange={(e) => { setFilterPremium(e.target.value); setPage(1) }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">구독 전체</option>
              <option value="true">프리미엄</option>
              <option value="false">일반</option>
            </select>
            {(search || filterStatus || filterPremium) && (
              <button onClick={resetFilters} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">초기화</button>
            )}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">검색 결과가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['회원', '성별', '국가', '가입일', '최근 활동', '인증', '구독', '활동', '관리'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => {
                    const vs = VERIFICATION_LABELS[user.verification_status] ?? { label: user.verification_status, color: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                              {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[140px]">{user.full_name ?? '-'}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[140px]">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{user.gender === 'female' ? '여성' : user.gender === 'male' ? '남성' : '-'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{user.country || '-'}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{new Date(user.last_active).toLocaleDateString('ko-KR')}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${vs.color}`}>{vs.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {user.is_premium
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">프리미엄</span>
                            : <span className="text-xs text-gray-400">일반</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {user.total_matches}건 / {user.total_messages}건
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => openUser(user)} className="text-xs text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap">
                            상세
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT,total)} / {fmt(total)}명</p>
              <div className="flex gap-1">
                {[
                  { disabled: page===1, onClick: ()=>setPage(1), icon: 'M11 19l-7-7 7-7m8 14l-7-7 7-7' },
                  { disabled: page===1, onClick: ()=>setPage(p=>p-1), icon: 'M15 19l-7-7 7-7' },
                  { disabled: page===totalPages, onClick: ()=>setPage(p=>p+1), icon: 'M9 5l7 7-7 7' },
                  { disabled: page===totalPages, onClick: ()=>setPage(totalPages), icon: 'M13 5l7 7-7 7M5 5l7 7-7 7' },
                ].map((btn, i) => (
                  <button key={i} disabled={btn.disabled} onClick={btn.onClick} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={btn.icon} /></svg>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">회원 상세 정보</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* 기본 정보 */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {(selectedUser.full_name ?? selectedUser.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{selectedUser.full_name ?? '-'}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(VERIFICATION_LABELS[selectedUser.verification_status] ?? { color: 'bg-gray-100 text-gray-600' }).color}`}>
                      {VERIFICATION_LABELS[selectedUser.verification_status]?.label}
                    </span>
                    {selectedUser.is_premium && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">프리미엄</span>}
                    {selectedUser.is_suspended && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-medium">정지됨</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['성별', selectedUser.gender === 'female' ? '여성' : '남성'],
                  ['국가', selectedUser.country || '-'],
                  ['가입일', new Date(selectedUser.created_at).toLocaleDateString('ko-KR')],
                  ['최근 활동', new Date(selectedUser.last_active).toLocaleDateString('ko-KR')],
                  ['총 매칭', `${selectedUser.total_matches}건`],
                  ['총 메시지', `${selectedUser.total_messages}건`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">{k}</p>
                    <p className="text-sm font-medium text-gray-900">{v}</p>
                  </div>
                ))}
              </div>

              {selectedUser.bio && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">소개</p>
                  <p className="text-sm text-gray-700">{selectedUser.bio}</p>
                </div>
              )}

              {selectedUser.interests && selectedUser.interests.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">관심사</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUser.interests.map((i: string) => (
                      <span key={i} className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-lg">{i}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 인증 처리 */}
              {selectedUser.verification_status === 'pending' && (
                <div className="border border-dashed border-gray-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">인증 처리</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleVerify(selectedUser.id, 'verified')} disabled={actionLoading}
                      className="flex-1 py-2 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 disabled:opacity-50">
                      승인
                    </button>
                    <button onClick={() => handleVerify(selectedUser.id, 'rejected')} disabled={actionLoading}
                      className="flex-1 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 disabled:opacity-50">
                      거절
                    </button>
                  </div>
                </div>
              )}

              {/* 계정 정지 */}
              <div className="border border-dashed border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  {selectedUser.is_suspended ? '계정 활성화' : '계정 정지'}
                </p>
                {!selectedUser.is_suspended && (
                  <input type="text" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="정지 사유 (선택)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-300" />
                )}
                {selectedUser.is_suspended && selectedUser.suspension_reason && (
                  <p className="text-xs text-red-500 mb-3">정지 사유: {selectedUser.suspension_reason}</p>
                )}
                <button onClick={() => handleSuspend(selectedUser.id, !selectedUser.is_suspended)} disabled={actionLoading}
                  className={`w-full py-2.5 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${selectedUser.is_suspended ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                  {actionLoading ? '처리 중...' : selectedUser.is_suspended ? '계정 활성화' : '계정 정지'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
