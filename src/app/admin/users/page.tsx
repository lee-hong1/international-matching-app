'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { adminService, UserManagement } from '@/lib/admin'
import Link from 'next/link'
import Image from 'next/image'

export default function AdminUsersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserManagement[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    verificationStatus: '',
    isPremium: undefined as boolean | undefined,
    country: ''
  })
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      checkAdminAccess()
    }
  }, [user, loading, router])

  useEffect(() => {
    loadUsers()
  }, [currentPage, filters])

  const checkAdminAccess = async () => {
    if (!user) return

    try {
      const adminCheck = await adminService.checkAdminRole(user.id)
      if (!adminCheck) {
        router.push('/dashboard')
        return
      }

      loadCountries()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    }
  }

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const result = await adminService.getUsers(currentPage, 20, filters)
      setUsers(result.users)
      setTotal(result.total)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCountries = async () => {
    try {
      const countryStats = await adminService.getCountryStats()
      setCountries(countryStats.map(c => c.country))
    } catch (error) {
      console.error('Error loading countries:', error)
    }
  }

  const handleVerificationUpdate = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      await adminService.updateUserVerification(userId, status)
      await loadUsers() // 목록 새로고침
    } catch (error) {
      console.error('Error updating verification:', error)
      alert('인증 상태 업데이트에 실패했습니다.')
    }
  }

  const handleSuspendUser = async (userId: string, suspend: boolean, reason?: string) => {
    try {
      if (suspend && !reason) {
        reason = prompt('정지 사유를 입력하세요:')
        if (!reason) return
      }

      await adminService.suspendUser(userId, suspend, reason)
      await loadUsers() // 목록 새로고침
    } catch (error) {
      console.error('Error updating suspension:', error)
      alert('계정 정지 상태 업데이트에 실패했습니다.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }

    const labels = {
      pending: '대기중',
      verified: '인증됨',
      rejected: '거부됨'
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const totalPages = Math.ceil(total / 20)

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-purple-600 hover:text-purple-700">← 관리자 대시보드</Link>
              <h1 className="text-xl font-semibold text-gray-900">사용자 관리</h1>
            </div>
            <div className="text-sm text-gray-600">
              총 {total.toLocaleString()}명의 사용자
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 필터 */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
              <input
                type="text"
                placeholder="이름 또는 이메일"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">인증 상태</label>
              <select
                value={filters.verificationStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">전체</option>
                <option value="pending">대기중</option>
                <option value="verified">인증됨</option>
                <option value="rejected">거부됨</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">프리미엄</label>
              <select
                value={filters.isPremium === undefined ? '' : filters.isPremium.toString()}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  isPremium: e.target.value === '' ? undefined : e.target.value === 'true' 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">전체</option>
                <option value="true">프리미엄</option>
                <option value="false">일반</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">국가</label>
              <select
                value={filters.country}
                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">전체</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setCurrentPage(1)}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                검색
              </button>
            </div>
          </div>
        </div>

        {/* 사용자 목록 */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    국가/성별
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    인증 상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    활동
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                            {userData.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{userData.full_name}</div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                          {userData.is_premium && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Premium
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{userData.country}</div>
                      <div className="text-gray-500">{userData.gender === 'male' ? '남성' : '여성'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(userData.verification_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(userData.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>매칭: {userData.total_matches}</div>
                      <div className="text-gray-500">메시지: {userData.total_messages}</div>
                      <div className="text-xs text-gray-400">
                        마지막: {formatDate(userData.last_active)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {userData.verification_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerificationUpdate(userData.id, 'verified')}
                            className="text-green-600 hover:text-green-900"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleVerificationUpdate(userData.id, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                          >
                            거부
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleSuspendUser(userData.id, true)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        정지
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
              
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    총 <span className="font-medium">{total}</span>개 중{' '}
                    <span className="font-medium">{(currentPage - 1) * 20 + 1}</span>부터{' '}
                    <span className="font-medium">{Math.min(currentPage * 20, total)}</span>까지 표시
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === i + 1
                            ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}