# 🌍 GlobalMatch - 국제 매칭 플랫폼

전 세계의 특별한 인연을 만나는 신뢰할 수 있는 국제 매칭 애플리케이션입니다.

## ✨ 주요 기능

### 🔐 사용자 인증
- 이메일/비밀번호 회원가입/로그인
- 소셜 로그인 (Google, Facebook)
- 비밀번호 재설정
- 신원 인증 시스템

### 👤 프로필 관리
- 상세 프로필 생성 및 편집
- 사진 업로드 (최대 6장)
- 관심사 및 언어 설정
- 매칭 선호도 설정

### 💕 스마트 매칭
- AI 기반 호환성 점수 계산
- 나이, 국가, 관심사 기반 필터링
- Tinder 스타일 스와이프 UI
- 실시간 매칭 알림

### 💬 실시간 채팅
- 매칭된 사용자와의 1:1 채팅
- 이미지 및 파일 전송
- 메시지 번역 기능 (계획 중)
- 읽음 확인 및 온라인 상태

### 💳 결제 시스템
- Stripe 연동 안전한 결제
- 다양한 구독 플랜
- 자동 갱신 및 취소
- 결제 내역 관리

### 🛡️ 안전 기능
- 사용자 신고 시스템
- 차단 기능
- 컨텐츠 검열
- 개인정보 보호

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** - React 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 스타일링
- **React Context** - 상태 관리

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL 데이터베이스
  - 실시간 구독
  - 인증 시스템
  - Row Level Security

### 결제
- **Stripe** - 결제 처리
- **Webhook** - 결제 상태 동기화

### 배포
- **Vercel** - 프론트엔드 배포 (권장)
- **Railway/Render** - 대안 배포 플랫폼

## 🚀 시작하기

### 필요한 것들
- Node.js 18+ 
- npm 또는 yarn
- Supabase 계정
- Stripe 계정 (결제 기능 사용시)

### 설치

1. **저장소 클론**
```bash
git clone <repository-url>
cd international-matching-app
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
`.env.local` 파일을 생성하고 다음 내용을 추가:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe 설정 (선택사항)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# 기타
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Supabase 설정**

Supabase 대시보드에서:
- 새 프로젝트 생성
- `supabase/schema.sql` 파일의 내용을 SQL 에디터에서 실행
- API 키를 환경 변수에 설정

5. **개발 서버 실행**
```bash
npm run dev
```

http://localhost:3000 에서 애플리케이션을 확인할 수 있습니다.

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js 앱 라우터
│   ├── api/               # API 엔드포인트
│   ├── dashboard/         # 사용자 대시보드
│   ├── discover/          # 매칭 탐색 페이지
│   ├── login/             # 로그인 페이지
│   ├── messages/          # 채팅 페이지
│   ├── premium/           # 구독 페이지
│   └── signup/            # 회원가입 페이지
├── contexts/              # React 컨텍스트
│   └── AuthContext.tsx    # 인증 컨텍스트
├── lib/                   # 유틸리티 및 서비스
│   ├── auth.ts           # 인증 서비스
│   ├── chat.ts           # 채팅 서비스
│   ├── matching.ts       # 매칭 알고리즘
│   ├── stripe.ts         # 결제 서비스
│   └── supabase.ts       # Supabase 클라이언트
└── components/            # 재사용 컴포넌트 (추가 예정)

supabase/
└── schema.sql            # 데이터베이스 스키마
```

## 🔧 주요 설정

### Supabase RLS 정책
Row Level Security가 활성화되어 있어 사용자는 자신의 데이터만 접근할 수 있습니다.

### Stripe 웹훅
결제 상태 동기화를 위해 다음 웹훅을 설정하세요:
- `checkout.session.completed`
- `payment_intent.succeeded`
- `customer.subscription.deleted`

엔드포인트: `https://yourdomain.com/api/webhook`

## 🌐 배포

### Vercel 배포 (권장)

1. GitHub 저장소에 코드 푸시
2. Vercel에서 프로젝트 임포트
3. 환경 변수 설정
4. 자동 배포 완료

### 수동 배포

```bash
npm run build
npm start
```

## 🔒 보안 고려사항

- 모든 API 키는 환경 변수로 관리
- Row Level Security로 데이터베이스 보안
- HTTPS 강제 사용
- 입력값 검증 및 XSS 방지
- Rate limiting 구현 권장

## 📊 데이터베이스 스키마

주요 테이블:
- `profiles` - 사용자 프로필
- `matches` - 매칭 정보
- `messages` - 채팅 메시지
- `chat_rooms` - 채팅방
- `user_subscriptions` - 구독 정보
- `payments` - 결제 내역

자세한 스키마는 `supabase/schema.sql`을 참조하세요.

## 🎯 로드맵

### 완료된 기능
- ✅ 사용자 인증 시스템
- ✅ 프로필 관리
- ✅ 매칭 알고리즘
- ✅ 실시간 채팅
- ✅ 결제 시스템
- ✅ 기본 UI/UX

### 개발 예정
- 🔄 메시지 번역 기능
- 🔄 푸시 알림
- 🔄 관리자 대시보드
- 🔄 모바일 앱 (React Native)
- 🔄 AI 기반 사진 검증
- 🔄 화상 통화 기능

---

💕 **GlobalMatch**로 전 세계의 특별한 인연을 만나보세요!
