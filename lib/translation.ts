// Google Translate API를 사용한 번역 서비스
export interface TranslationResult {
  translatedText: string
  originalText: string
  sourceLanguage: string
  targetLanguage: string
}

export interface LanguageDetection {
  language: string
  confidence: number
}

class TranslationService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY || ''
  }

  // 지원 언어 목록
  getSupportedLanguages() {
    return {
      'ko': '한국어',
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'ja': '日本語',
      'zh': '中文',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'tr': 'Türkçe',
      'pl': 'Polski',
      'uk': 'Українська',
      'cs': 'Čeština',
      'nl': 'Nederlands',
      'sv': 'Svenska',
      'da': 'Dansk',
      'no': 'Norsk'
    }
  }

  // 언어 감지
  async detectLanguage(text: string): Promise<LanguageDetection> {
    if (!this.apiKey) {
      throw new Error('Google Translate API key not configured')
    }

    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2/detect?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text
          })
        }
      )

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      const detection = data.data.detections[0][0]
      return {
        language: detection.language,
        confidence: detection.confidence
      }
    } catch (error) {
      console.error('Language detection error:', error)
      // 기본값으로 영어 반환
      return {
        language: 'en',
        confidence: 0.5
      }
    }
  }

  // 텍스트 번역
  async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string
  ): Promise<TranslationResult> {
    if (!this.apiKey) {
      // API 키가 없는 경우 목업 번역 반환
      return this.getMockTranslation(text, targetLanguage, sourceLanguage)
    }

    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: text,
        target: targetLanguage,
        format: 'text'
      })

      if (sourceLanguage) {
        params.append('source', sourceLanguage)
      }

      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?${params}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        }
      )

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      const translation = data.data.translations[0]
      
      return {
        translatedText: translation.translatedText,
        originalText: text,
        sourceLanguage: translation.detectedSourceLanguage || sourceLanguage || 'auto',
        targetLanguage
      }
    } catch (error) {
      console.error('Translation error:', error)
      // 오류 시 목업 번역 반환
      return this.getMockTranslation(text, targetLanguage, sourceLanguage)
    }
  }

  // 목업 번역 (API 키가 없을 때 사용)
  private getMockTranslation(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string
  ): TranslationResult {
    // 간단한 목업 번역 로직
    const mockTranslations: Record<string, Record<string, string>> = {
      'ko': {
        'Hello': '안녕하세요',
        'How are you?': '어떻게 지내세요?',
        'Good morning': '좋은 아침입니다',
        'Thank you': '감사합니다',
        'I love you': '사랑해요',
        'Nice to meet you': '만나서 반가워요'
      },
      'en': {
        '안녕하세요': 'Hello',
        '어떻게 지내세요?': 'How are you?',
        '좋은 아침입니다': 'Good morning',
        '감사합니다': 'Thank you',
        '사랑해요': 'I love you',
        '만나서 반가워요': 'Nice to meet you'
      },
      'es': {
        'Hello': 'Hola',
        'How are you?': '¿Cómo estás?',
        'Good morning': 'Buenos días',
        'Thank you': 'Gracias',
        'I love you': 'Te amo'
      }
    }

    const translations = mockTranslations[targetLanguage] || {}
    const translatedText = translations[text] || `[번역됨: ${text}]`

    return {
      translatedText,
      originalText: text,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage
    }
  }

  // 일괄 번역
  async translateMultiple(
    texts: string[], 
    targetLanguage: string, 
    sourceLanguage?: string
  ): Promise<TranslationResult[]> {
    const translations = await Promise.all(
      texts.map(text => this.translateText(text, targetLanguage, sourceLanguage))
    )

    return translations
  }

  // 사용자 선호 언어 가져오기
  getUserPreferredLanguage(userCountry?: string): string {
    const countryToLanguage: Record<string, string> = {
      '한국': 'ko',
      '미국': 'en',
      '캐나다': 'en',
      '영국': 'en',
      '호주': 'en',
      '독일': 'de',
      '프랑스': 'fr',
      '이탈리아': 'it',
      '스페인': 'es',
      '러시아': 'ru',
      '중국': 'zh',
      '일본': 'ja',
      '브라질': 'pt',
      '멕시코': 'es',
      '아르헨티나': 'es',
      '콜롬비아': 'es',
      '페루': 'es',
      '베네수엘라': 'es',
      '칠레': 'es',
      '우크라이나': 'uk',
      '폴란드': 'pl',
      '체코': 'cs',
      '네덜란드': 'nl',
      '스웨덴': 'sv',
      '덴마크': 'da',
      '노르웨이': 'no'
    }

    return countryToLanguage[userCountry || ''] || 'en'
  }

  // 브라우저 언어 감지
  getBrowserLanguage(): string {
    if (typeof window !== 'undefined') {
      const lang = navigator.language || 'en'
      return lang.split('-')[0] // 'ko-KR' -> 'ko'
    }
    return 'en'
  }
}

// 싱글톤 인스턴스 생성
export const translationService = new TranslationService()

// 번역 캐시를 위한 로컬 스토리지 유틸리티
export class TranslationCache {
  private static CACHE_KEY = 'translation_cache'
  private static MAX_CACHE_SIZE = 1000

  static get(originalText: string, targetLang: string): string | null {
    if (typeof window === 'undefined') return null

    try {
      const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}')
      const key = `${originalText}:${targetLang}`
      return cache[key] || null
    } catch {
      return null
    }
  }

  static set(originalText: string, targetLang: string, translatedText: string) {
    if (typeof window === 'undefined') return

    try {
      const cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}')
      const key = `${originalText}:${targetLang}`
      
      // 캐시 크기 제한
      const keys = Object.keys(cache)
      if (keys.length >= this.MAX_CACHE_SIZE) {
        // 가장 오래된 항목 삭제
        const oldestKey = keys[0]
        delete cache[oldestKey]
      }

      cache[key] = translatedText
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache))
    } catch {
      // 로컬 스토리지 오류 무시
    }
  }

  static clear() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.CACHE_KEY)
  }
}