-- profiles 테이블 추가 컬럼 migration
-- schema.sql의 기본 profiles 테이블에 누락된 컬럼 추가

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_lang TEXT DEFAULT 'ko'
  CHECK (preferred_lang IN ('ko','en','ja','zh'));
-- display_name: 일반 컬럼 (GENERATED 제거 — full_name/email 모두 NULL 시 오류 방지)
-- 기존 GENERATED 컬럼이 있다면 먼저 삭제 후 재생성
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'display_name'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE profiles DROP COLUMN display_name;
  END IF;
END $$;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 가입/업데이트 시 display_name 자동 설정 트리거
CREATE OR REPLACE FUNCTION set_default_display_name()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := COALESCE(
      NEW.full_name,
      CASE WHEN NEW.email IS NOT NULL AND NEW.email <> ''
           THEN split_part(NEW.email, '@', 1)
           ELSE NULL
      END,
      'User_' || LEFT(NEW.id::text, 8)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_display_name ON profiles;
CREATE TRIGGER ensure_display_name
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_default_display_name();

-- trust_score / trust_badge (profiles_trust_score.sql 에서 추가되지 않은 경우 대비)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0
  CHECK (trust_score >= 0 AND trust_score <= 100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_badge TEXT DEFAULT 'none'
  CHECK (trust_badge IN ('none','verified','premium','elite'));

-- 성인 여부 (age_verification.sql 에서 추가되지 않은 경우 대비)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE; -- 이미 있으면 무시
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_adult BOOLEAN
  GENERATED ALWAYS AS (
    birth_date IS NOT NULL AND
    (CURRENT_DATE - birth_date) >= 19 * 365
  ) STORED;

-- RLS 활성화 (이미 활성화된 경우 무해)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 본인 전체 프로필 조회 (email, birth_date 포함)
DROP POLICY IF EXISTS "owner can read own full profile" ON profiles;
CREATE POLICY "owner can read own full profile" ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 본인 프로필 수정
DROP POLICY IF EXISTS "owner can update own profile" ON profiles;
CREATE POLICY "owner can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 본인 프로필 등록 (가입 시 1회)
DROP POLICY IF EXISTS "owner can insert own profile" ON profiles;
CREATE POLICY "owner can insert own profile" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 공개 뷰: email/birth_date 제외한 필드만 모든 인증 사용자 조회 가능
CREATE OR REPLACE VIEW public_profiles AS
  SELECT
    id,
    display_name,
    avatar_url,
    country,
    city,
    gender,
    bio,
    interests,
    languages,
    trust_score,
    trust_badge,
    is_adult,
    is_premium,
    verification_status,
    last_active,
    created_at
  FROM profiles;

-- 공개 뷰 접근 권한
GRANT SELECT ON public_profiles TO authenticated, anon;

-- profiles 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_trust ON profiles(trust_score DESC) WHERE trust_score > 0;
CREATE INDEX IF NOT EXISTS idx_profiles_lang ON profiles(preferred_lang);
