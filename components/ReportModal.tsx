'use client'

import React, { useState } from 'react'
import { reportingService, ReportData } from '@/lib/reporting'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportedUserId: string
  reportedUserName?: string
  reporterId: string
  contentId?: string
  contentType?: 'profile' | 'message' | 'photo'
}

const reportTypes: { value: ReportData['report_type']; label: string; description: string }[] = [
  {
    value: 'inappropriate_content',
    label: '부적절한 콘텐츠',
    description: '음란물, 폭력적 내용, 혐오 발언 등'
  },
  {
    value: 'harassment',
    label: '괴롭힘/위협',
    description: '지속적인 괴롭힘, 스토킹, 위협적 메시지'
  },
  {
    value: 'fake_profile',
    label: '가짜 프로필',
    description: '다른 사람의 사진 도용, 허위 정보'
  },
  {
    value: 'spam',
    label: '스팸/광고',
    description: '상업적 광고, 스팸 메시지'
  },
  {
    value: 'abuse',
    label: '욕설/모욕',
    description: '욕설, 인격 모독, 차별적 발언'
  },
  {
    value: 'other',
    label: '기타',
    description: '위에 해당하지 않는 기타 사유'
  }
]

export default function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  reporterId,
  contentId,
  contentType = 'profile'
}: ReportModalProps) {
  const [selectedType, setSelectedType] = useState<ReportData['report_type']>('')
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedType || !description.trim()) {
      setError('신고 유형과 상세 설명을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const reportData = {
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        reported_content_id: contentId,
        report_type: selectedType,
        category: contentType,
        description: description.trim(),
        evidence: evidence.filter(e => e.trim())
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '신고 접수에 실패했습니다.')
      }

      // 성공
      onClose()
      resetForm()
      
      // 성공 알림 (실제로는 toast 등으로 처리)
      alert('신고가 접수되었습니다. 검토 후 조치하겠습니다.')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedType('')
    setDescription('')
    setEvidence([])
    setError(null)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const addEvidence = () => {
    setEvidence([...evidence, ''])
  }

  const updateEvidence = (index: number, value: string) => {
    const newEvidence = [...evidence]
    newEvidence[index] = value
    setEvidence(newEvidence)
  }

  const removeEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">신고하기</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {reportedUserName && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                신고 대상: <span className="font-semibold">{reportedUserName}</span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 신고 유형 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                신고 유형 *
              </label>
              <div className="space-y-2">
                {reportTypes.map((type) => (
                  <label key={type.value} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="reportType"
                      value={type.value}
                      checked={selectedType === type.value}
                      onChange={(e) => setSelectedType(e.target.value as ReportData['report_type'])}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 상세 설명 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                상세 설명 *
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="신고 사유를 자세히 설명해주세요..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                maxLength={1000}
              />
              <div className="text-xs text-gray-500 mt-1">
                {description.length}/1000자
              </div>
            </div>

            {/* 증거 자료 (선택사항) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                증거 자료 (선택사항)
              </label>
              <div className="space-y-2">
                {evidence.map((item, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateEvidence(index, e.target.value)}
                      placeholder="스크린샷 설명, 메시지 내용 등..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeEvidence(index)}
                      className="px-2 py-1 text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEvidence}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  + 증거 자료 추가
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-600">
                허위 신고는 제재를 받을 수 있습니다. 신중하게 신고해주세요.
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedType || !description.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}