'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  profiles?: { full_name?: string | null; avatar_url?: string | null }
  viewed: boolean
}

interface StoryBarProps {
  onAddStory?: () => void
}

export default function StoryBar({ onAddStory }: StoryBarProps) {
  const { user } = useAuth()
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => {
    fetch('/api/stories?limit=20')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setStories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
      {/* 내 스토리 추가 버튼 */}
      <button
        onClick={onAddStory}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          flexShrink: 0,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
        aria-label="스토리 추가"
      >
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f9a8d4, #a855f7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #f9a8d4, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
              {(user?.user_metadata?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#6366f1',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            lineHeight: 1,
            border: '2px solid #fff',
          }}>+</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#6b7280', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>내 스토리</span>
      </button>

      {/* 팔로우한 사용자 스토리 */}
      {stories.map((story) => {
        const name = story.profiles?.full_name ?? '사용자'
        const avatar = story.profiles?.avatar_url
        return (
          <button
            key={story.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
            aria-label={`${name}의 스토리`}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              padding: 2,
              background: story.viewed ? '#e5e7eb' : 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #fff',
                background: 'linear-gradient(135deg, #f9a8d4, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {avatar ? (
                  <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{name.charAt(0)}</span>
                )}
              </div>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#6b7280', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          </button>
        )
      })}
    </div>
  )
}
