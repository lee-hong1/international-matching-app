'use client'

import React, { useState } from 'react'
import { translationService, TranslationCache } from '@/lib/translation'

interface TranslatedMessageProps {
  message: string
  isOwn: boolean
  senderCountry?: string
  receiverCountry?: string
}

export default function TranslatedMessage({
  message,
  isOwn,
  senderCountry,
  receiverCountry
}: TranslatedMessageProps) {
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTranslate = async () => {
    if (translatedText && !showOriginal) {
      setShowOriginal(true)
      return
    }

    if (showOriginal) {
      setShowOriginal(false)
      return
    }

    // 캐시에서 번역 확인
    const targetLang = isOwn 
      ? translationService.getUserPreferredLanguage(receiverCountry)
      : translationService.getUserPreferredLanguage(senderCountry) || translationService.getBrowserLanguage()
    
    const cached = TranslationCache.get(message, targetLang)
    if (cached) {
      setTranslatedText(cached)
      return
    }

    setIsTranslating(true)
    setError(null)

    try {
      const result = await translationService.translateText(message, targetLang)
      
      // 원본과 번역이 같으면 번역 불필요
      if (result.translatedText.toLowerCase() === message.toLowerCase()) {
        setError('번역이 필요하지 않습니다')
        return
      }

      setTranslatedText(result.translatedText)
      TranslationCache.set(message, targetLang, result.translatedText)
    } catch (err) {
      setError('번역에 실패했습니다')
      console.error('Translation error:', err)
    } finally {
      setIsTranslating(false)
    }
  }

  const displayText = showOriginal ? message : (translatedText || message)
  const hasTranslation = translatedText && translatedText !== message

  return (
    <div className="group relative">
      <div
        className={`px-4 py-2 rounded-2xl ${
          isOwn
            ? 'bg-purple-600 text-white rounded-br-md'
            : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
        }`}
      >
        <p className="text-sm">{displayText}</p>
        
        {hasTranslation && !showOriginal && (
          <div className="text-xs opacity-70 mt-1">
            번역됨
          </div>
        )}
      </div>

      {/* 번역 버튼 */}
      <div className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              isOwn 
                ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            {isTranslating ? (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                <span>번역 중...</span>
              </div>
            ) : hasTranslation ? (
              showOriginal ? '번역 보기' : '원문 보기'
            ) : (
              '번역하기'
            )}
          </button>

          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}