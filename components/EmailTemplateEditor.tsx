'use client'

import React, { useState } from 'react'
import { EmailTemplate } from '@/lib/email'

interface EmailTemplateEditorProps {
  template?: EmailTemplate
  onSave: (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onCancel: () => void
}

export default function EmailTemplateEditor({ template, onSave, onCancel }: EmailTemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    html_content: template?.html_content || '',
    text_content: template?.text_content || '',
    template_type: template?.template_type || 'newsletter',
    is_active: template?.is_active ?? true
  })
  
  const [activeTab, setActiveTab] = useState<'html' | 'text' | 'preview'>('html')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const templateTypes = [
    { value: 'welcome', label: '환영 메시지' },
    { value: 'match_notification', label: '매칭 알림' },
    { value: 'message_notification', label: '메시지 알림' },
    { value: 'premium_promotion', label: '프리미엄 프로모션' },
    { value: 'newsletter', label: '뉴스레터' },
    { value: 'verification', label: '이메일 인증' },
    { value: 'password_reset', label: '비밀번호 재설정' }
  ]

  const availableVariables = [
    '{{user_name}}',
    '{{app_name}}',
    '{{app_url}}',
    '{{support_email}}',
    '{{current_year}}',
    '{{matched_user_name}}',
    '{{sender_name}}',
    '{{message_preview}}',
    '{{verification_url}}',
    '{{reset_url}}',
    '{{discount_code}}'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.subject) {
      setError('템플릿 이름과 제목은 필수입니다.')
      return
    }

    if (!formData.html_content && !formData.text_content) {
      setError('HTML 또는 텍스트 내용 중 하나는 필수입니다.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(formData as any)
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById(activeTab === 'html' ? 'html_content' : 'text_content') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentContent = activeTab === 'html' ? formData.html_content : formData.text_content
      const newContent = currentContent.substring(0, start) + variable + currentContent.substring(end)
      
      if (activeTab === 'html') {
        setFormData({ ...formData, html_content: newContent })
      } else {
        setFormData({ ...formData, text_content: newContent })
      }
      
      // 커서 위치 복원
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length
        textarea.focus()
      }, 0)
    }
  }

  const renderPreview = () => {
    const previewData = {
      user_name: 'John Doe',
      app_name: 'GlobalMatch',
      app_url: 'https://globalmatch.app',
      support_email: 'support@globalmatch.app',
      current_year: new Date().getFullYear().toString(),
      matched_user_name: 'Jane Smith',
      sender_name: 'Alice Johnson',
      message_preview: '안녕하세요! 반가워요.',
      verification_url: 'https://globalmatch.app/verify-email?token=example',
      reset_url: 'https://globalmatch.app/reset-password?token=example',
      discount_code: 'SAVE20'
    }

    let previewContent = formData.html_content || formData.text_content
    
    for (const [key, value] of Object.entries(previewData)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      previewContent = previewContent.replace(regex, value)
    }

    return previewContent
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {template ? '이메일 템플릿 수정' : '새 이메일 템플릿'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 기본 설정 */}
          <div className="lg:col-span-1 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                템플릿 이름 *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="예: welcome_email"
              />
            </div>

            <div>
              <label htmlFor="template_type" className="block text-sm font-medium text-gray-700 mb-1">
                템플릿 유형
              </label>
              <select
                id="template_type"
                value={formData.template_type}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {templateTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                이메일 제목 *
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="{{user_name}}님, 환영합니다!"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                활성화
              </label>
            </div>

            {/* 사용 가능한 변수 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">사용 가능한 변수</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {availableVariables.map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => insertVariable(variable)}
                    className="block w-full text-left px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded text-purple-600 font-mono"
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 컨텐츠 편집기 */}
          <div className="lg:col-span-2">
            {/* 탭 */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'html', label: 'HTML' },
                  { key: 'text', label: '텍스트' },
                  { key: 'preview', label: '미리보기' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.key
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* 컨텐츠 영역 */}
            <div className="space-y-4">
              {activeTab === 'html' && (
                <div>
                  <label htmlFor="html_content" className="block text-sm font-medium text-gray-700 mb-1">
                    HTML 내용
                  </label>
                  <textarea
                    id="html_content"
                    rows={20}
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                    placeholder="<html><body><h1>안녕하세요 {{user_name}}님!</h1></body></html>"
                  />
                </div>
              )}

              {activeTab === 'text' && (
                <div>
                  <label htmlFor="text_content" className="block text-sm font-medium text-gray-700 mb-1">
                    텍스트 내용
                  </label>
                  <textarea
                    id="text_content"
                    rows={20}
                    value={formData.text_content}
                    onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="안녕하세요 {{user_name}}님! 환영합니다."
                  />
                </div>
              )}

              {activeTab === 'preview' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">미리보기</h3>
                  <div className="border border-gray-300 rounded-md p-4 bg-gray-50 min-h-96">
                    {formData.html_content ? (
                      <div dangerouslySetInnerHTML={{ __html: renderPreview() }} />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">{renderPreview()}</pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}