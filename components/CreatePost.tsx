'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { postsService, type Post } from '@/lib/posts'

interface CreatePostProps {
  onClose: () => void
  onPostCreated: (post: Post) => void
}

export default function CreatePost({ onClose, onPostCreated }: CreatePostProps) {
  const [step, setStep] = useState<'select' | 'edit'>('select')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 10)
    if (files.length === 0) return
    setSelectedFiles(files)
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    setStep('edit')
  }

  function removeFile(index: number) {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    URL.revokeObjectURL(previews[index])
    setSelectedFiles(newFiles)
    setPreviews(newPreviews)
    if (newFiles.length === 0) setStep('select')
  }

  async function handleSubmit() {
    if (selectedFiles.length === 0) return
    setUploading(true)
    try {
      const { post, error } = await postsService.createPost({
        caption: caption.trim() || undefined,
        location: location.trim() || undefined,
        isPublic,
        mediaFiles: selectedFiles,
      })
      if (post) {
        previews.forEach((url) => URL.revokeObjectURL(url))
        onPostCreated(post)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={step === 'edit' ? () => setStep('select') : onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            {step === 'edit' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
          <h2 className="font-semibold text-gray-900">새 게시물</h2>
          {step === 'edit' ? (
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="text-pink-500 font-semibold text-sm disabled:opacity-50"
            >
              {uploading ? '업로드 중...' : '공유하기'}
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {step === 'select' ? (
          /* 파일 선택 화면 */
          <div className="p-8 flex flex-col items-center justify-center min-h-72 gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">사진을 선택하세요</p>
              <p className="text-sm text-gray-500 mt-1">최대 10장까지 선택 가능합니다</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:from-pink-600 hover:to-purple-700 transition-all"
            >
              갤러리에서 선택
            </button>
          </div>
        ) : (
          /* 편집 화면 */
          <div className="flex flex-col max-h-[80vh] overflow-y-auto">
            {/* 미리보기 그리드 */}
            <div className="p-4">
              <div className={`grid gap-1 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {previews.length < 10 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-pink-300 hover:text-pink-400 transition-colors"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* 캡션 */}
            <div className="px-4 pb-3">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="문구 입력..."
                rows={3}
                maxLength={2200}
                className="w-full text-sm text-gray-900 placeholder-gray-400 resize-none outline-none border-b border-gray-100 pb-3"
              />
              <p className="text-xs text-gray-400 text-right">{caption.length}/2200</p>
            </div>

            {/* 위치 */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="위치 추가"
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
            </div>

            {/* 공개 설정 */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
                <span className="text-sm text-gray-700">전체 공개</span>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${isPublic ? 'bg-pink-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
