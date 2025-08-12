# GitHub 저장소 설정 가이드

## 1. GitHub에서 새 저장소 생성

1. [GitHub](https://github.com) 로그인
2. 우상단 "+" 버튼 클릭 → "New repository" 선택
3. Repository 정보 입력:
   - **Repository name**: `international-matching-app` (또는 원하는 이름)
   - **Description**: `국제 매칭 앱 - 유럽/러시아/남미/북미/아시아 여성과 한국 남성 연결`
   - **Visibility**: Public 또는 Private 선택
   - **Initialize this repository**: 체크하지 말것 (이미 로컬에 있음)
4. "Create repository" 클릭

## 2. 로컬 저장소를 GitHub에 연결

생성된 저장소 페이지에서 나타나는 URL을 복사하여 다음 명령어를 실행:

```bash
# 원격 저장소 연결 (HTTPS)
git remote add origin https://github.com/YOUR_USERNAME/international-matching-app.git

# 또는 SSH 사용시
git remote add origin git@github.com:YOUR_USERNAME/international-matching-app.git

# 기본 브랜치를 main으로 변경
git branch -M main

# GitHub에 업로드
git push -u origin main
```

## 3. 환경 변수 설정 안내

GitHub에 업로드하기 전에 다음 환경 변수들을 설정해야 합니다:

### `.env.local` 파일 생성 (로컬 개발용)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# Firebase Admin (서버)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"

# Google Translate API
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key

# Agora (화상통화)
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel 배포시 환경 변수

Vercel 대시보드에서 위의 모든 환경 변수를 설정해야 합니다.

## 4. 다음 단계

1. Supabase 프로젝트 생성 및 데이터베이스 스키마 실행
2. Stripe 계정 설정 및 제품/가격 구성
3. Firebase 프로젝트 생성 및 FCM 설정
4. Google Cloud에서 Translate API 활성화
5. Agora 계정 생성 및 프로젝트 설정
6. 환경 변수 설정
7. `npm install && npm run dev`로 개발 서버 실행

## 프로젝트 구조

```
international-matching-app/
├── src/app/                 # Next.js App Router 페이지
├── lib/                     # 비즈니스 로직 및 서비스
├── components/              # 재사용 가능한 UI 컴포넌트
├── contexts/               # React Context
├── supabase/               # 데이터베이스 스키마
└── public/                 # 정적 파일
```

## 주요 기능

- ✅ 사용자 인증 및 프로필 관리
- ✅ 국가별 매칭 시스템
- ✅ 실시간 채팅
- ✅ Stripe 결제 및 구독
- ✅ 관리자 대시보드
- ✅ 메시지 번역
- ✅ 푸시 알림
- ✅ AI 사진 검증
- ✅ 화상 통화
- ✅ 신고/차단 시스템