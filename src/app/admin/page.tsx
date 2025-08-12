'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { adminService, AdminStats } from '@/lib/admin'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [countryStats, setCountryStats] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      checkAdminAccess()
    }
  }, [user, loading, router])

  const checkAdminAccess = async () => {
    if (!user) return

    try {
      const adminCheck = await adminService.checkAdminRole(user.id)
      if (!adminCheck) {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
      await loadDashboardData()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    }
  }

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const [dashboardStats, monthly, countries] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getMonthlyStats(6),
        adminService.getCountryStats()
      ])

      setStats(dashboardStats)
      setMonthlyStats(monthly)
      setCountryStats(countries.slice(0, 10))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { 
      style: 'currency', 
      currency: 'KRW' 
    }).format(amount)
  }

  if (loading || isLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user || !stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">🛡️ 관리자 대시보드</h1>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/admin/users" className="text-gray-600 hover:text-purple-600">사용자 관리</Link>
              <Link href="/admin/reports" className="text-gray-600 hover:text-purple-600">신고 관리</Link>
              <Link href="/admin/analytics" className="text-gray-600 hover:text-purple-600">분석</Link>
              <Link href="/dashboard" className="text-purple-600 hover:text-purple-700">← 일반 대시보드</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">전체 사용자</p>
                <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalUsers)}</p>
                <p className="text-sm text-green-600">
                  인증: {formatNumber(stats.verifiedUsers)} ({Math.round(stats.verifiedUsers/stats.totalUsers*100)}%)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">총 매칭</p>
                <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalMatches)}</p>
                <p className="text-sm text-gray-500">메시지: {formatNumber(stats.totalMessages)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">총 수익</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.revenue)}</p>
                <p className="text-sm text-gray-500">프리미엄: {formatNumber(stats.premiumUsers)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.734-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">대기 중인 신고</p>
                <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.pendingReports)}</p>
                <p className="text-sm text-gray-500">일일 활성: {formatNumber(stats.dailyActiveUsers)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 차트 및 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 월별 통계 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">월별 성장 추이</h3>
            <div className="space-y-4">
              {monthlyStats.map((month, index) => (
                <div key={month.month} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{month.month}</span>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-blue-600">사용자: {formatNumber(month.users)}</span>
                    <span className="text-purple-600">매칭: {formatNumber(month.matches)}</span>
                    <span className="text-green-600">{formatCurrency(month.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 국가별 통계 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">국가별 사용자 분포</h3>
            <div className="space-y-3">
              {countryStats.map((country, index) => {
                const percentage = Math.round((country.count / stats.totalUsers) * 100)
                return (
                  <div key={country.country} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">{index + 1}.</span>
                      <span className="text-sm text-gray-700">{country.country}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">
                        {formatNumber(country.count)} ({percentage}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 액션</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/admin/users"
              className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-gray-900">사용자 관리</h4>
                  <p className="text-sm text-gray-600">사용자 인증, 정지, 삭제</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/admin/reports"
              className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.734-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="font-medium text-gray-900">신고 처리</h4>
                  <p className="text-sm text-gray-600">사용자 신고 검토 및 처리</p>
                </div>
              </div>
            </Link>

            <Link 
              href="/admin/analytics"
              className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <h4 className="font-medium text-gray-900">상세 분석</h4>
                  <p className="text-sm text-gray-600">사용자 행동 및 수익 분석</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}