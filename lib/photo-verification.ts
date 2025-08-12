import { supabase } from './supabase'

export interface PhotoAnalysis {
  isValid: boolean
  confidence: number
  reasons: string[]
  detectedFaces: number
  isAppropriate: boolean
  estimatedAge?: number
  detectedGender?: 'male' | 'female' | 'unknown'
}

export interface VerificationResult {
  approved: boolean
  reasons: string[]
  score: number
  analysis: PhotoAnalysis
}

class PhotoVerificationService {
  private apiEndpoint = '/api/verify-photo'

  // 사진 검증 메인 함수
  async verifyPhoto(imageUrl: string, userId: string): Promise<VerificationResult> {
    try {
      // 여러 검증 단계를 병렬로 실행
      const [
        faceAnalysis,
        contentAnalysis,
        duplicateCheck
      ] = await Promise.all([
        this.analyzeFaces(imageUrl),
        this.analyzeContent(imageUrl),
        this.checkDuplicates(imageUrl, userId)
      ])

      // 종합 점수 계산
      const score = this.calculateVerificationScore({
        faceAnalysis,
        contentAnalysis,
        duplicateCheck
      })

      // 승인 여부 결정
      const approved = this.shouldApprove(score, faceAnalysis, contentAnalysis)

      // 거부 사유 수집
      const reasons = this.collectRejectionReasons({
        faceAnalysis,
        contentAnalysis,
        duplicateCheck,
        score
      })

      return {
        approved,
        reasons,
        score,
        analysis: {
          isValid: faceAnalysis.isValid,
          confidence: faceAnalysis.confidence,
          reasons: faceAnalysis.reasons,
          detectedFaces: faceAnalysis.detectedFaces,
          isAppropriate: contentAnalysis.isAppropriate,
          estimatedAge: faceAnalysis.estimatedAge,
          detectedGender: faceAnalysis.detectedGender
        }
      }
    } catch (error) {
      console.error('Photo verification error:', error)
      return {
        approved: false,
        reasons: ['검증 시스템 오류가 발생했습니다.'],
        score: 0,
        analysis: {
          isValid: false,
          confidence: 0,
          reasons: ['시스템 오류'],
          detectedFaces: 0,
          isAppropriate: false
        }
      }
    }
  }

  // 얼굴 분석 (실제 구현에서는 AWS Rekognition, Google Vision API 등 사용)
  private async analyzeFaces(imageUrl: string): Promise<{
    isValid: boolean
    confidence: number
    reasons: string[]
    detectedFaces: number
    estimatedAge?: number
    detectedGender?: 'male' | 'female' | 'unknown'
  }> {
    // 목업 구현 - 실제로는 AI 서비스 API 호출
    return new Promise((resolve) => {
      setTimeout(() => {
        // 랜덤하게 결과 생성 (실제 구현에서는 AI 분석 결과)
        const mockResults = [
          {
            isValid: true,
            confidence: 0.95,
            reasons: [],
            detectedFaces: 1,
            estimatedAge: 25,
            detectedGender: 'female' as const
          },
          {
            isValid: false,
            confidence: 0.3,
            reasons: ['얼굴이 명확하게 보이지 않습니다'],
            detectedFaces: 0
          },
          {
            isValid: false,
            confidence: 0.8,
            reasons: ['여러 명의 얼굴이 감지되었습니다'],
            detectedFaces: 3
          },
          {
            isValid: false,
            confidence: 0.9,
            reasons: ['선글라스나 마스크로 얼굴이 가려져 있습니다'],
            detectedFaces: 1
          }
        ]

        const result = mockResults[Math.floor(Math.random() * mockResults.length)]
        resolve(result)
      }, 1000) // 실제 API 호출 시뮬레이션
    })
  }

  // 부적절한 콘텐츠 분석
  private async analyzeContent(imageUrl: string): Promise<{
    isAppropriate: boolean
    confidence: number
    detectedLabels: string[]
    reasons: string[]
  }> {
    // 목업 구현 - 실제로는 콘텐츠 조정 API 사용
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults = [
          {
            isAppropriate: true,
            confidence: 0.98,
            detectedLabels: ['person', 'portrait', 'smile'],
            reasons: []
          },
          {
            isAppropriate: false,
            confidence: 0.85,
            detectedLabels: ['explicit', 'suggestive'],
            reasons: ['부적절한 내용이 감지되었습니다']
          },
          {
            isAppropriate: false,
            confidence: 0.9,
            detectedLabels: ['violence', 'weapon'],
            reasons: ['폭력적인 내용이 포함되어 있습니다']
          }
        ]

        // 대부분 적절한 사진으로 판정 (90% 확률)
        const result = Math.random() > 0.1 ? mockResults[0] : mockResults[Math.floor(Math.random() * 2) + 1]
        resolve(result)
      }, 800)
    })
  }

  // 중복 사진 검사
  private async checkDuplicates(imageUrl: string, userId: string): Promise<{
    isDuplicate: boolean
    similarPhotos: string[]
    confidence: number
  }> {
    try {
      // 실제 구현에서는 이미지 해싱 및 유사도 검사
      // 현재는 목업으로 구현
      const { data: existingPhotos } = await supabase
        .from('user_photos')
        .select('photo_url')
        .neq('user_id', userId)

      // 랜덤하게 중복 판정 (실제로는 이미지 해싱 비교)
      const isDuplicate = Math.random() < 0.05 // 5% 확률로 중복 판정

      return {
        isDuplicate,
        similarPhotos: isDuplicate ? [imageUrl] : [],
        confidence: isDuplicate ? 0.95 : 0.1
      }
    } catch (error) {
      console.error('Duplicate check error:', error)
      return {
        isDuplicate: false,
        similarPhotos: [],
        confidence: 0
      }
    }
  }

  // 검증 점수 계산
  private calculateVerificationScore(analyses: {
    faceAnalysis: any
    contentAnalysis: any
    duplicateCheck: any
  }): number {
    let score = 0

    // 얼굴 분석 점수 (40점)
    if (analyses.faceAnalysis.isValid) {
      score += analyses.faceAnalysis.confidence * 40
    }

    // 콘텐츠 적절성 점수 (30점)
    if (analyses.contentAnalysis.isAppropriate) {
      score += analyses.contentAnalysis.confidence * 30
    }

    // 중복 검사 점수 (20점)
    if (!analyses.duplicateCheck.isDuplicate) {
      score += 20
    }

    // 품질 점수 (10점) - 기타 요소들
    score += 10

    return Math.min(100, Math.max(0, score))
  }

  // 승인 여부 결정
  private shouldApprove(
    score: number,
    faceAnalysis: any,
    contentAnalysis: any
  ): boolean {
    // 최소 요구 조건들
    const requiredConditions = [
      score >= 70, // 최소 70점
      faceAnalysis.detectedFaces === 1, // 정확히 1명의 얼굴
      contentAnalysis.isAppropriate, // 적절한 내용
      faceAnalysis.confidence >= 0.7 // 얼굴 인식 신뢰도 70% 이상
    ]

    return requiredConditions.every(condition => condition)
  }

  // 거부 사유 수집
  private collectRejectionReasons(analyses: {
    faceAnalysis: any
    contentAnalysis: any
    duplicateCheck: any
    score: number
  }): string[] {
    const reasons: string[] = []

    // 얼굴 관련 사유
    if (analyses.faceAnalysis.reasons.length > 0) {
      reasons.push(...analyses.faceAnalysis.reasons)
    }

    if (analyses.faceAnalysis.detectedFaces === 0) {
      reasons.push('사진에서 얼굴을 찾을 수 없습니다')
    } else if (analyses.faceAnalysis.detectedFaces > 1) {
      reasons.push('한 명의 얼굴만 포함된 사진을 업로드해주세요')
    }

    // 콘텐츠 관련 사유
    if (!analyses.contentAnalysis.isAppropriate) {
      reasons.push(...analyses.contentAnalysis.reasons)
    }

    // 중복 관련 사유
    if (analyses.duplicateCheck.isDuplicate) {
      reasons.push('이미 사용된 사진입니다')
    }

    // 품질 관련 사유
    if (analyses.score < 70) {
      reasons.push('사진 품질이 기준에 미치지 못합니다')
    }

    if (analyses.faceAnalysis.confidence < 0.7) {
      reasons.push('얼굴이 명확하게 보이지 않습니다')
    }

    return reasons.length > 0 ? reasons : ['검증 기준을 충족하지 않습니다']
  }

  // 사진 검증 결과 저장
  async saveVerificationResult(
    userId: string,
    photoUrl: string,
    result: VerificationResult
  ) {
    try {
      const { error } = await supabase
        .from('photo_verifications')
        .insert({
          user_id: userId,
          photo_url: photoUrl,
          is_approved: result.approved,
          verification_score: result.score,
          rejection_reasons: result.reasons,
          analysis_data: result.analysis,
          verified_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving verification result:', error)
      }
    } catch (error) {
      console.error('Error saving verification result:', error)
    }
  }

  // 사진 자동 거부 규칙들
  private getAutoRejectRules(): Array<(analysis: PhotoAnalysis) => string | null> {
    return [
      // 얼굴이 없는 사진
      (analysis) => analysis.detectedFaces === 0 ? '얼굴이 감지되지 않았습니다' : null,
      
      // 여러 명이 있는 사진
      (analysis) => analysis.detectedFaces > 1 ? '여러 명의 얼굴이 감지되었습니다' : null,
      
      // 부적절한 내용
      (analysis) => !analysis.isAppropriate ? '부적절한 내용이 포함되어 있습니다' : null,
      
      // 신뢰도가 너무 낮음
      (analysis) => analysis.confidence < 0.5 ? '사진 품질이 너무 낮습니다' : null
    ]
  }

  // 일괄 사진 검증 (관리자용)
  async batchVerifyPhotos(photoUrls: string[], userId: string) {
    const results = []
    
    for (const photoUrl of photoUrls) {
      try {
        const result = await this.verifyPhoto(photoUrl, userId)
        results.push({
          photoUrl,
          result
        })
        
        // API 호출 제한을 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        results.push({
          photoUrl,
          result: {
            approved: false,
            reasons: ['검증 중 오류 발생'],
            score: 0,
            analysis: {
              isValid: false,
              confidence: 0,
              reasons: ['시스템 오류'],
              detectedFaces: 0,
              isAppropriate: false
            }
          }
        })
      }
    }
    
    return results
  }
}

export const photoVerificationService = new PhotoVerificationService()