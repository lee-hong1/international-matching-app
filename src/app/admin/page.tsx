'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminService, type AdminStats } from '@/lib/admin'

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [monthly, setMonthly] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminService.getDashboardStats(),
      adminService.getMonthlyStats(6),
      adminService.getCountryStats(),
    ]).then(([s, m, c]) => {
      setStats(s)
      setMonthly(m)
      setCountries(c.slice(0, 8))
    }).finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n)
  const fmtCurrency = (n: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n)

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const maxMonthlyUsers = Math.max(...monthly.map((m) => m.users), 1)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">대시보드 개요</h2>
        <p className="text-sm text-gray-500 mt-0.5">플랫폼 전체 현황을 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="전체 회원"
          value={fmt(stats.totalUsers)}
          sub={`인증 ${fmt(stats.verifiedUsers)}명`}
          color="bg-blue-50 text-blue-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard
          label="오늘 활성 사용자"
          value={fmt(stats.dailyActiveUsers)}
          sub={`프리미엄 ${fmt(stats.premiumUsers)}명`}
          color="bg-green-50 text-green-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <StatCard
          label="총 수익"
          value={fmtCurrency(stats.revenue)}
          sub={`매칭 ${fmt(stats.totalMatches)}건`}
          color="bg-purple-50 text-purple-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
        />
        <StatCard
          label="대기 중인 신고"
          value={fmt(stats.pendingReports)}
          sub={`메시지 ${fmt(stats.totalMessages)}건`}
          color={stats.pendingReports > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.734-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 월별 신규 가입 차트 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">월별 신규 가입</h3>
          <div className="flex items-end gap-2 h-40">
            {monthly.map((m) => {
              const height = Math.max((m.users / maxMonthlyUsers) * 100, 4)
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs text-gray-500 font-medium">{fmt(m.users)}</span>
                  <div className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t-lg transition-all hover:from-purple-600 hover:to-pink-500" style={{ height: `${height}%` }} />
                  <span className="text-xs text-gray-400 whitespace-nowrap">{m.month.slice(5)}월</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400">총 매칭</p>
              <p className="text-sm font-bold text-purple-600">{fmt(monthly.reduce((a, m) => a + m.matches, 0))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">신규 가입</p>
              <p className="text-sm font-bold text-blue-600">{fmt(monthly.reduce((a, m) => a + m.users, 0))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">6개월 수익</p>
              <p className="text-sm font-bold text-green-600">{fmtCurrency(monthly.reduce((a, m) => a + m.revenue, 0))}</p>
            </div>
          </div>
        </div>

        {/* 국가별 분포 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">국가별 회원</h3>
          <div className="space-y-3">
            {countries.map((c, i) => {
              const pct = stats.totalUsers > 0 ? Math.round((c.count / stats.totalUsers) * 100) : 0
              return (
                <div key={c.country}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 font-medium">{c.country}</span>
                    <span className="text-xs text-gray-400">{fmt(c.count)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/admin/users', label: '회원 관리', desc: '가입 현황 및 회원 제재', color: 'from-blue-500 to-cyan-500', icon: '👥' },
          { href: '/admin/reports', label: '신고 처리', desc: `대기 ${fmt(stats.pendingReports)}건`, color: 'from-orange-500 to-red-500', icon: '🚨', badge: stats.pendingReports },
          { href: '/admin/posts', label: '게시물 관리', desc: '콘텐츠 검토 및 삭제', color: 'from-purple-500 to-pink-500', icon: '🖼️' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-100 transition-all group">
            {item.badge ? (
              <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
            ) : null}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-xl mb-3`}>
              {item.icon}
            </div>
            <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
