import { supabase } from './supabase'

export interface UserProfile {
  id: string
  full_name: string
  avatar_url?: string
  birth_date: string
  gender: 'male' | 'female'
  country: string
  city?: string
  occupation?: string
  bio?: string
  interests: string[]
  languages: string[]
  education_level?: string
  height?: number
  verification_status: string
  is_premium: boolean
  last_active: string
}

export interface MatchingPreferences {
  user_id: string
  min_age: number
  max_age: number
  preferred_countries: string[]
  preferred_education: string[]
  preferred_occupation: string[]
  max_distance?: number
}

export const matchingService = {
  // 사용자의 매칭 선호도 가져오기
  async getUserPreferences(userId: string): Promise<MatchingPreferences | null> {
    const { data, error } = await supabase
      .from('matching_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching preferences:', error)
      return null
    }

    return data
  },

  // 매칭 선호도 업데이트
  async updateUserPreferences(userId: string, preferences: Partial<MatchingPreferences>) {
    const { data, error } = await supabase
      .from('matching_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      })

    return { data, error }
  },

  // 나이 계산 함수
  calculateAge(birthDate: string): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  },

  // 호환성 점수 계산
  calculateCompatibilityScore(user: UserProfile, candidate: UserProfile, preferences?: MatchingPreferences): number {
    let score = 0
    let maxScore = 0

    // 나이 호환성 (25점)
    maxScore += 25
    if (preferences) {
      const candidateAge = this.calculateAge(candidate.birth_date)
      if (candidateAge >= preferences.min_age && candidateAge <= preferences.max_age) {
        score += 25
      }
    }

    // 국가 선호도 (20점)
    maxScore += 20
    if (preferences && preferences.preferred_countries.length > 0) {
      if (preferences.preferred_countries.includes(candidate.country)) {
        score += 20
      }
    } else {
      score += 10 // 기본 점수
    }

    // 교육 수준 (15점)
    maxScore += 15
    if (preferences && preferences.preferred_education.length > 0 && candidate.education_level) {
      if (preferences.preferred_education.includes(candidate.education_level)) {
        score += 15
      }
    } else if (candidate.education_level) {
      score += 7
    }

    // 공통 관심사 (20점)
    maxScore += 20
    const commonInterests = user.interests.filter(interest => 
      candidate.interests.includes(interest)
    )
    score += Math.min(20, commonInterests.length * 4)

    // 공통 언어 (10점)
    maxScore += 10
    const commonLanguages = user.languages.filter(lang => 
      candidate.languages.includes(lang)
    )
    score += Math.min(10, commonLanguages.length * 5)

    // 최근 활동 (10점)
    maxScore += 10
    const lastActive = new Date(candidate.last_active)
    const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceActive <= 1) score += 10
    else if (daysSinceActive <= 7) score += 7
    else if (daysSinceActive <= 30) score += 5
    else score += 2

    return Math.round((score / maxScore) * 100)
  },

  // 추천 사용자 가져오기
  async getRecommendations(userId: string, limit: number = 10): Promise<UserProfile[]> {
    // 현재 사용자 정보 가져오기
    const { data: currentUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !currentUser) {
      console.error('Error fetching current user:', userError)
      return []
    }

    // 사용자 선호도 가져오기
    const preferences = await this.getUserPreferences(userId)

    // 이미 매칭된 사용자들과 차단된 사용자들 제외
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    const { data: blocks } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)

    const excludeIds = new Set([userId])
    
    existingMatches?.forEach(match => {
      excludeIds.add(match.user1_id === userId ? match.user2_id : match.user1_id)
    })
    
    blocks?.forEach(block => {
      excludeIds.add(block.blocked_id)
    })

    // 후보자들 가져오기
    let query = supabase
      .from('profiles')
      .select('*')
      .neq('gender', currentUser.gender) // 반대 성별만
      .eq('verification_status', 'verified') // 인증된 사용자만
      .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
      .order('last_active', { ascending: false })
      .limit(limit * 2) // 더 많이 가져와서 필터링

    // 나이 필터 적용
    if (preferences && preferences.min_age && preferences.max_age) {
      const today = new Date()
      const maxBirthDate = new Date(today.getFullYear() - preferences.min_age, today.getMonth(), today.getDate())
      const minBirthDate = new Date(today.getFullYear() - preferences.max_age - 1, today.getMonth(), today.getDate())
      
      query = query
        .lte('birth_date', maxBirthDate.toISOString().split('T')[0])
        .gte('birth_date', minBirthDate.toISOString().split('T')[0])
    }

    // 선호 국가 필터 적용
    if (preferences && preferences.preferred_countries.length > 0) {
      query = query.in('country', preferences.preferred_countries)
    }

    const { data: candidates, error } = await query

    if (error) {
      console.error('Error fetching candidates:', error)
      return []
    }

    if (!candidates) return []

    // 호환성 점수로 정렬
    const scoredCandidates = candidates.map(candidate => ({
      ...candidate,
      compatibilityScore: this.calculateCompatibilityScore(currentUser, candidate, preferences || undefined)
    }))

    return scoredCandidates
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit)
  },

  // 좋아요 표시
  async likeUser(userId: string, targetUserId: string) {
    // 이미 매칭이 있는지 확인
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('*')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${userId})`)
      .single()

    if (existingMatch) {
      // 기존 매칭 업데이트
      const updateField = existingMatch.user1_id === userId ? 'user1_liked' : 'user2_liked'
      const isMutual = existingMatch.user1_id === userId 
        ? existingMatch.user2_liked 
        : existingMatch.user1_liked

      const { data, error } = await supabase
        .from('matches')
        .update({
          [updateField]: true,
          is_mutual: isMutual,
          ...(isMutual && { matched_at: new Date().toISOString() })
        })
        .eq('id', existingMatch.id)
        .select()

      // 상호 매칭이 되면 채팅방 생성
      if (isMutual && !existingMatch.is_mutual) {
        await supabase
          .from('chat_rooms')
          .insert({ match_id: existingMatch.id })
      }

      return { data, error, isMatch: isMutual }
    } else {
      // 새 매칭 생성
      const { data, error } = await supabase
        .from('matches')
        .insert({
          user1_id: userId,
          user2_id: targetUserId,
          user1_liked: true,
          user2_liked: false,
          is_mutual: false
        })
        .select()

      return { data, error, isMatch: false }
    }
  },

  // 패스 (관심 없음)
  async passUser(userId: string, targetUserId: string) {
    const { data, error } = await supabase
      .from('matches')
      .upsert({
        user1_id: userId,
        user2_id: targetUserId,
        user1_liked: false,
        user2_liked: false,
        is_mutual: false
      })

    return { data, error }
  },

  // 사용자의 매칭 목록 가져오기
  async getUserMatches(userId: string) {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        user1:profiles!matches_user1_id_fkey(*),
        user2:profiles!matches_user2_id_fkey(*)
      `)
      .eq('is_mutual', true)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('matched_at', { ascending: false })

    if (error) {
      console.error('Error fetching matches:', error)
      return []
    }

    // 상대방 정보만 추출
    return data?.map(match => {
      const isUser1 = match.user1_id === userId
      return {
        matchId: match.id,
        matchedAt: match.matched_at,
        partner: isUser1 ? match.user2 : match.user1
      }
    }) || []
  }
}