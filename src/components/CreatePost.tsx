'use client'

import { useState, useRef, useEffect } from 'react'
import { postsService, type Post, type CreatePostData } from '@/lib/posts'
import { useLanguage } from '@/contexts/LanguageContext'
import { t } from '@src/lib/i18n'

const MAX_IMAGE_BYTES = 20 * 1024 * 1024   // 20MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024  // 200MB

interface CreatePostProps {
  onClose: () => void
  onPostCreated: (post: Post) => void
}

export default function CreatePost({ onClose, onPostCreated }: CreatePostProps) {
  const { locale: lang } = useLanguage()
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => { previews.forEach((url) => URL.revokeObjectURL(url)) }
  }, [previews])

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const errors: string[] = []
    const accepted = Array.from(selected).filter((f) => {
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) return false
      const limit = f.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
      if (f.size > limit) {
        const mb = Math.round(limit / 1024 / 1024)
        errors.push(`${f.name}: 최대 ${mb}MB`)
        return false
      }
      return true
    })
    if (errors.length > 0) { setError(errors.join(', ')); return }
    if (accepted.length === 0) return
    // Revoke previous previews before creating new ones
    previews.forEach((url) => URL.revokeObjectURL(url))
    const newFiles = [...files, ...accepted].slice(0, 10)
    setFiles(newFiles)
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (files.length === 0) { setError(t('create_post.no_media_error', lang)); return }
    setSubmitting(true)
    setError('')
    const { post, error: postError } = await postsService.createPost({
      caption: caption.trim() || undefined,
      location: location.trim() || undefined,
      mediaFiles: files,
    } as CreatePostData)
    setSubmitting(false)
    if (postError || !post) {
      setError(postError instanceof Error ? postError.message : t('create_post.fail_error', lang))
      return
    }
    onPostCreated(post)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('create_post.title', lang)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
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
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{t('create_post.title', lang)}</h2>
          <button onClick={onClose} aria-label={t('create_post.close', lang)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* 미디어 추가 */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              borderRadius: 12,
              border: '2px dashed #e5e7eb',
              minHeight: previews.length ? undefined : 160,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              alignItems: previews.length ? 'flex-start' : 'center',
              justifyContent: previews.length ? 'flex-start' : 'center',
              cursor: 'pointer',
              padding: 8,
              background: '#f9fafb',
            }}
          >
            {previews.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                <svg style={{ width: 40, height: 40, margin: '0 auto 8px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>{t('create_post.add_media', lang)}</p>
              </div>
            ) : (
              previews.map((src, i) => (
                <div key={i} style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  {files[i]?.type.startsWith('video/') ? (
                    <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
              ))
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: 'none' }} />

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={2200}
            rows={3}
            placeholder={t('create_post.caption_placeholder', lang)}
            style={{ padding: '0.625rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
          />

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
            placeholder={t('create_post.location_placeholder', lang)}
            style={{ padding: '0.625rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.9rem' }}
          />

          {error && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#dc2626', background: '#fee2e2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || files.length === 0}
            style={{
              padding: '0.75rem',
              background: submitting || files.length === 0 ? '#9ca3af' : 'linear-gradient(135deg, #ec4899, #a855f7)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: submitting || files.length === 0 ? 'default' : 'pointer',
            }}
          >
            {submitting ? t('create_post.submitting', lang) : t('create_post.submit', lang)}
          </button>
        </form>
      </div>
    </div>
  )
}
