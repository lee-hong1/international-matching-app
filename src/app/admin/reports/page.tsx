'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminService, type ReportManagement } from '@/lib/admin'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: '대기중',   color: 'bg-yellow-100 text-yellow-700' },
  reviewing: { label: '검토중',   color: 'bg-blue-100   text-blue-700'   },
  resolved:  { label: '처리완료', color: 'bg-green-100  text-green-700'  },
  dismissed: { label: '기각됨',   color: 'bg-gray-100   text-gray-600'   },
}

const REASON_LABELS: Record<string, string> = {
  inappropriate_content: '부적절한 콘텐츠',
  harassment:            '괴롭힘/위협',
  fake_profile:          '허위 프로필',
  spam:                  '스팸',
  abuse:                 '욕설/비방',
  other:                 '기타',
}

export default function AdminReportsPage() {
  const [reports, setReports]         = useState<ReportManagement[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selected, setSelected]       = useState<ReportManagement | null>(null)
  const [adminNote, setAdminNote]     = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const LIMIT = 15

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const { reports: data, total: t } = await adminService.getReports(p, LIMIT, filterStatus || undefined)
      setReports(data)
      setTotal(t)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus])

  useEffect(() => { load() }, [load])

  async function handleAction(reportId: string, action: 'resolve' | 'dismiss') {
    setActionLoading(true)
    try {
      await adminService.handleReport(reportId, action, adminNote || undefined)
      const newStatus = action === 'resolve' ? 'resolved' : 'dismissed'
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: newStatus } : r))
      if (selected?.id === reportId) setSelected((p) => p ? { ...p, status: newStatus as any } : p)
      setAdminNote('')
    } finally {
      setActionLoading(false)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n)
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">신고 관리</h2>
        <p className="text-sm text-gray-500 mt-0.5">총 {fmt(total)}건</p>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'pending',   label: '대기중',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
          { value: 'reviewing', label: '검토중',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { value: 'resolved',  label: '처리완료', color: 'bg-green-50 text-green-700 border-green-200' },
          { value: 'dismissed', label: '기각됨',   color: 'bg-gray-50 text-gray-600 border-gray-200' },
          { value: '',          label: '전체',     color: 'bg-white text-gray-700 border-gray-200' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setFilterStatus(tab.value); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${filterStatus === tab.value ? tab.color + ' shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 신고 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">신고 내역이 없습니다</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['신고자', '신고 대상', '사유', '접수일', '상태', '처리'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reports.map((report) => {
                    const st = STATUS_LABELS[report.status] ?? { label: report.status, color: 'bg-gray-100 text-gray-600' }
                    return (
                      <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{(report.reporter as any)?.full_name ?? '-'}</p>
                            <p className="text-xs text-gray-400">{(report.reporter as any)?.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{(report.reported as any)?.full_name ?? '-'}</p>
                            <p className="text-xs text-gray-400">{(report.reported as any)?.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium whitespace-nowrap">
                            {REASON_LABELS[report.reason] ?? report.reason}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(report.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setSelected(report); setAdminNote('') }}
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap"
                          >
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
              <p className="text-xs text-gray-500">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} / {fmt(total)}건</p>
              <div className="flex gap-1">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-sm text-gray-600">이전</button>
                <span className="px-3 py-1.5 text-sm text-gray-700">{page} / {totalPages}</span>
                <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-sm text-gray-600">다음</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 신고 상세 모달 */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">신고 상세</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* 상태 배지 */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${(STATUS_LABELS[selected.status] ?? { color: 'bg-gray-100 text-gray-600' }).color}`}>
                  {STATUS_LABELS[selected.status]?.label}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-50 text-orange-700">
                  {REASON_LABELS[selected.reason] ?? selected.reason}
                </span>
              </div>

              {/* 신고자 / 피신고자 */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: '신고자', data: selected.reporter as any },
                  { title: '신고 대상', data: selected.reported as any },
                ].map(({ title, data }) => (
                  <div key={title} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1.5 font-medium">{title}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(data?.full_name ?? data?.email ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{data?.full_name ?? '-'}</p>
                        <p className="text-xs text-gray-400 truncate">{data?.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 신고 내용 */}
              {selected.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">신고 내용</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500">
                접수일: {new Date(selected.created_at).toLocaleString('ko-KR')}
                {selected.resolved_at && (
                  <span className="ml-3">처리일: {new Date(selected.resolved_at).toLocaleString('ko-KR')}</span>
                )}
              </div>

              {/* 처리 액션 */}
              {(selected.status === 'pending' || selected.status === 'reviewing') && (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">신고 처리</p>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="처리 메모 (선택사항)"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(selected.id, 'resolve')}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                      처리 완료
                    </button>
                    <button
                      onClick={() => handleAction(selected.id, 'dismiss')}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-gray-400 text-white text-sm font-medium rounded-xl hover:bg-gray-500 disabled:opacity-50 transition-colors"
                    >
                      기각
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
