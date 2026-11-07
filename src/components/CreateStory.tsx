'use client'

import { useState, useRef } from 'react'

interface CreateStoryProps {
  onClose: () => void
  onStoryCreated: () => void
}

export default function CreateStory({ onClose, onStoryCreated }: CreateStoryProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(selected: File | null) {
    if (!selected) return
    if (!selected.type.startsWith('image/') && !selected.type.startsWith('video/')) {
      setError('이미지 또는 영상 파일만 업로드할 수 있습니다.')
      return
    }
    if (selected.size > 50 * 1024 * 1024) {
      setError('파일 크기는 50MB 이하여야 합니다.')
      return
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('파일을 선택하세요.'); return }
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('media', file)
      if (caption.trim()) form.append('caption', caption.trim())
      const res = await fetch('/api/stories', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? '오류가 발생했습니다.')
      }
      onStoryCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '스토리 등록에 실패했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="스토리 추가"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '1.25rem 1.25rem 0 0',
        width: '100%',
        maxWidth: 480,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>스토리 추가</h2>
          <button onClick={onClose} aria-label="닫기" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ margin: '0 0 1rem', fontSize: '0.825rem', color: '#6b7280' }}>스토리는 24시간 후 자동으로 사라집니다.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              borderRadius: 12,
              border: '2px dashed #e5e7eb',
              height: preview ? undefined : 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              background: '#f9fafb',
            }}
          >
            {preview ? (
              file?.type.startsWith('video/') ? (
                <video src={preview} style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />
              ) : (
                <img src={preview} alt="스토리 미리보기" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />
              )
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>
                <svg style={{ width: 40, height: 40, margin: '0 auto 8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.069A1 1 0 0121 8.869v6.262a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>사진 또는 영상 선택</p>
                <p style={{ fontSize: '0.75rem', margin: '4px 0 0', color: '#d1d5db' }}>최대 50MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            placeholder="스토리 문구 (선택)"
            style={{ padding: '0.625rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.9rem' }}
          />

          {error && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !file}
            style={{
              padding: '0.75rem',
              background: submitting || !file ? '#9ca3af' : 'linear-gradient(135deg, #f97316, #ec4899)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: submitting || !file ? 'default' : 'pointer',
            }}
          >
            {submitting ? '업로드 중...' : '스토리 올리기'}
          </button>
        </form>
      </div>
    </div>
  )
}
