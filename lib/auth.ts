import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface SignUpData {
  email: string
  password: string
  fullName: string
  gender: 'male' | 'female'
  country: string
  birthDate: string
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthResponse {
  user: User | null
  error: any
}

export const authService = {
  // 회원가입
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            gender: data.gender,
            country: data.country,
            birth_date: data.birthDate
          }
        }
      })

      if (authError) {
        return { user: null, error: authError }
      }

      // 프로필 생성
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            full_name: data.fullName,
            gender: data.gender,
            country: data.country,
            birth_date: data.birthDate,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }

      return { user: authData.user, error: null }
    } catch (error) {
      return { user: null, error }
    }
  },

  // 로그인
  async signIn(data: SignInData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      return { user: authData.user, error }
    } catch (error) {
      return { user: null, error }
    }
  },

  // 소셜 로그인
  async signInWithProvider(provider: 'google' | 'facebook') {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // 로그아웃
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error }
    }
  },

  // 현재 사용자 정보
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      return { user, error }
    } catch (error) {
      return { user: null, error }
    }
  },

  // 비밀번호 재설정
  async resetPassword(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // 비밀번호 업데이트
  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  },

  // 이메일 변경
  async updateEmail(newEmail: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }
}