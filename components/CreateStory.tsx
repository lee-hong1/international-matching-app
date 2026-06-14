'use client'

import { useState, useRef } from 'react'
import { storiesService, type Story } from '@/lib/stories'

interface CreateStoryProps {
  onClose: () => void
  onStoryCreated: (story: Story) => void
}

const BG_COLORS = [
  '#000000', '#1a1a2e', '#16213e', '#0f3460',
  '#e94560', '#f5a623', '#7b2d8b', '#2d8b5e',
]

export default function CreateStory({ onClose, onStoryCreated }: CreateStoryProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [bgColor, setBgColor] = useState('#000000')
  const [uploading, setUploading] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
  const MAX_FILE_SIZE = 50 * 1024 * 1024

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('허용되지 않는 파일 형식입니다. (JPG, PNG, GIF, MP4만 가능)')
      e.target.value = ''
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('파일 크기는 50MB를 초과할 수 없습니다.')
      e.target.value = ''
      return
    }
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!selectedFile) return
    setUploading(true)
    try {
      const { story, error } = await storiesService.createStory(
        selectedFile,
        caption.trim() || undefined,
        bgColor,
      )
      if (story) {
        if (preview) URL.revokeObjectURL(preview)
        onStoryCreated(story)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="font-semibold text-gray-900">스토리 추가</h2>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
            className="text-pink-500 font-semibold text-sm disabled:opacity-40"
          >
            {uploading ? '업로드...' : '공유'}
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* 미리보기 */}
          <div
            className="relative w-full aspect-[9/16] max-h-72 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: preview ? '#000' : bgColor }}
            onClick={() => !preview && fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="스토리 미리보기" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/70">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">탭하여 사진 선택</p>
              </div>
            )}
            {preview && (
              <button
                onClick={(e) => { e.stopPropagation(); URL.revokeObjectURL(preview); setPreview(null); setSelectedFile(null) }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm" onChange={handleFileSelect} className="hidden" />
          {fileError && <p className="text-sm text-red-500 text-center">{fileError}</p>}

          {/* 배경색 선택 (사진 없을 때) */}
          {!preview && (
            <div>
              <p className="text-xs text-gray-500 mb-2">배경색</p>
              <div className="flex gap-2 flex-wrap">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBgColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${bgColor === color ? 'border-pink-500 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 캡션 */}
          <div className="border border-gray-100 rounded-xl px-3 py-2">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="스토리에 문구 추가..."
              maxLength={150}
              className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>

          {/* 업로드 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl disabled:opacity-40 hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            {uploading ? '업로드 중...' : '스토리 공유하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
