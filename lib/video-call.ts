import AgoraRTC, { 
  IAgoraRTCClient, 
  ICameraVideoTrack, 
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  UID
} from 'agora-rtc-sdk-ng'
import { supabase } from './supabase'

export interface CallParticipant {
  uid: UID
  userId: string
  name: string
  hasVideo: boolean
  hasAudio: boolean
}

export interface CallSession {
  id: string
  roomId: string
  participants: CallParticipant[]
  startedAt: Date
  status: 'calling' | 'active' | 'ended'
  type: 'voice' | 'video'
}

export interface CallInvitation {
  id: string
  callerId: string
  callerName: string
  receiverId: string
  roomId: string
  type: 'voice' | 'video'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  createdAt: Date
}

class VideoCallService {
  private client: IAgoraRTCClient | null = null
  private localVideoTrack: ICameraVideoTrack | null = null
  private localAudioTrack: IMicrophoneAudioTrack | null = null
  private appId: string
  private currentChannel: string | null = null
  private currentToken: string | null = null

  constructor() {
    this.appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || ''
    
    if (this.appId && typeof window !== 'undefined') {
      this.initializeClient()
    }
  }

  // Agora 클라이언트 초기화
  private initializeClient() {
    this.client = AgoraRTC.createClient({ 
      mode: 'rtc', 
      codec: 'vp8' 
    })

    // 이벤트 리스너 설정
    this.client.on('user-published', this.handleUserPublished.bind(this))
    this.client.on('user-unpublished', this.handleUserUnpublished.bind(this))
    this.client.on('user-joined', this.handleUserJoined.bind(this))
    this.client.on('user-left', this.handleUserLeft.bind(this))
    this.client.on('connection-state-change', this.handleConnectionStateChange.bind(this))
  }

  // 통화 초대 생성
  async createCallInvitation(
    callerId: string,
    callerName: string,
    receiverId: string,
    type: 'voice' | 'video'
  ): Promise<CallInvitation> {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const invitation: Omit<CallInvitation, 'id'> = {
      callerId,
      callerName,
      receiverId,
      roomId,
      type,
      status: 'pending',
      createdAt: new Date()
    }

    const { data, error } = await supabase
      .from('call_invitations')
      .insert(invitation)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to create call invitation')
    }

    // 상대방에게 실시간 알림
    await this.notifyCallInvitation(data)

    return data
  }

  // 통화 초대 응답
  async respondToInvitation(invitationId: string, accept: boolean) {
    const { data, error } = await supabase
      .from('call_invitations')
      .update({ 
        status: accept ? 'accepted' : 'declined',
        respondedAt: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to respond to invitation')
    }

    return data
  }

  // 통화방 입장
  async joinCall(
    roomId: string, 
    userId: string, 
    userName: string,
    options: {
      video: boolean
      audio: boolean
    } = { video: true, audio: true }
  ): Promise<CallSession> {
    if (!this.client) {
      throw new Error('Agora client not initialized')
    }

    try {
      // 토큰 생성 (서버에서)
      const token = await this.generateToken(roomId, userId)
      
      // 채널 입장
      const uid = await this.client.join(this.appId, roomId, token, userId)

      // 로컬 미디어 트랙 생성
      if (options.audio) {
        this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
        await this.client.publish(this.localAudioTrack)
      }

      if (options.video) {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack()
        await this.client.publish(this.localVideoTrack)
      }

      this.currentChannel = roomId
      this.currentToken = token

      // 통화 세션 생성
      const session: CallSession = {
        id: `session_${Date.now()}`,
        roomId,
        participants: [{
          uid,
          userId,
          name: userName,
          hasVideo: options.video,
          hasAudio: options.audio
        }],
        startedAt: new Date(),
        status: 'active',
        type: options.video ? 'video' : 'voice'
      }

      return session
    } catch (error) {
      console.error('Failed to join call:', error)
      throw new Error('Failed to join call')
    }
  }

  // 통화 종료
  async leaveCall() {
    try {
      // 로컬 트랙 정리
      if (this.localVideoTrack) {
        this.localVideoTrack.close()
        this.localVideoTrack = null
      }

      if (this.localAudioTrack) {
        this.localAudioTrack.close()
        this.localAudioTrack = null
      }

      // 채널에서 나가기
      if (this.client) {
        await this.client.leave()
      }

      this.currentChannel = null
      this.currentToken = null
    } catch (error) {
      console.error('Failed to leave call:', error)
    }
  }

  // 비디오 on/off
  async toggleVideo(): Promise<boolean> {
    if (!this.localVideoTrack) {
      // 비디오 시작
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack()
      await this.client?.publish(this.localVideoTrack)
      return true
    } else {
      // 비디오 중지
      await this.client?.unpublish(this.localVideoTrack)
      this.localVideoTrack.close()
      this.localVideoTrack = null
      return false
    }
  }

  // 오디오 on/off
  async toggleAudio(): Promise<boolean> {
    if (!this.localAudioTrack) {
      // 오디오 시작
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack()
      await this.client?.publish(this.localAudioTrack)
      return true
    } else {
      // 오디오 중지
      await this.client?.unpublish(this.localAudioTrack)
      this.localAudioTrack.close()
      this.localAudioTrack = null
      return false
    }
  }

  // 로컬 비디오 재생
  playLocalVideo(container: HTMLElement) {
    if (this.localVideoTrack && container) {
      this.localVideoTrack.play(container)
    }
  }

  // 원격 비디오 재생
  playRemoteVideo(track: IRemoteVideoTrack, container: HTMLElement) {
    if (track && container) {
      track.play(container)
    }
  }

  // 이벤트 핸들러들
  private handleUserPublished = async (user: any, mediaType: 'audio' | 'video') => {
    await this.client?.subscribe(user, mediaType)
    
    if (mediaType === 'video') {
      // 비디오 트랙 처리
      const videoTrack = user.videoTrack as IRemoteVideoTrack
      // UI에서 처리할 수 있도록 이벤트 발생
      window.dispatchEvent(new CustomEvent('user-video-published', {
        detail: { user, videoTrack }
      }))
    }

    if (mediaType === 'audio') {
      // 오디오 트랙 자동 재생
      const audioTrack = user.audioTrack as IRemoteAudioTrack
      audioTrack?.play()
    }
  }

  private handleUserUnpublished = (user: any, mediaType: 'audio' | 'video') => {
    window.dispatchEvent(new CustomEvent('user-unpublished', {
      detail: { user, mediaType }
    }))
  }

  private handleUserJoined = (user: any) => {
    window.dispatchEvent(new CustomEvent('user-joined', {
      detail: { user }
    }))
  }

  private handleUserLeft = (user: any) => {
    window.dispatchEvent(new CustomEvent('user-left', {
      detail: { user }
    }))
  }

  private handleConnectionStateChange = (
    curState: string, 
    revState: string, 
    reason?: string
  ) => {
    console.log('Connection state changed:', curState, revState, reason)
    window.dispatchEvent(new CustomEvent('connection-state-change', {
      detail: { curState, revState, reason }
    }))
  }

  // 토큰 생성 (서버 API 호출)
  private async generateToken(roomId: string, userId: string): Promise<string> {
    try {
      const response = await fetch('/api/generate-agora-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName: roomId,
          uid: userId
        })
      })

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      return data.token
    } catch (error) {
      console.error('Failed to generate token:', error)
      // 개발 환경에서는 빈 토큰 사용 가능
      return ''
    }
  }

  // 통화 초대 알림
  private async notifyCallInvitation(invitation: CallInvitation) {
    // 실시간 알림을 통해 상대방에게 통화 초대 전송
    const channel = supabase.channel(`call_invitation_${invitation.receiverId}`)
    
    await channel.send({
      type: 'broadcast',
      event: 'call_invitation',
      payload: invitation
    })
  }

  // 통화 초대 리스너
  subscribeToCallInvitations(userId: string, callback: (invitation: CallInvitation) => void) {
    const channel = supabase.channel(`call_invitation_${userId}`)
    
    channel.on('broadcast', { event: 'call_invitation' }, ({ payload }) => {
      callback(payload)
    })

    return channel.subscribe()
  }

  // 통화 품질 측정
  getCallStats() {
    return this.client?.getLocalAudioStats() || null
  }

  // 화면 공유 시작
  async startScreenShare() {
    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack()
      
      // 기존 비디오 트랙 교체
      if (this.localVideoTrack) {
        await this.client?.unpublish(this.localVideoTrack)
        this.localVideoTrack.close()
      }

      this.localVideoTrack = screenTrack
      await this.client?.publish(screenTrack)

      return screenTrack
    } catch (error) {
      console.error('Failed to start screen share:', error)
      throw error
    }
  }

  // 화면 공유 중지
  async stopScreenShare() {
    try {
      if (this.localVideoTrack) {
        await this.client?.unpublish(this.localVideoTrack)
        this.localVideoTrack.close()
      }

      // 일반 카메라로 복원
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack()
      await this.client?.publish(this.localVideoTrack)

      return this.localVideoTrack
    } catch (error) {
      console.error('Failed to stop screen share:', error)
      throw error
    }
  }
}

export const videoCallService = new VideoCallService()