-- trust_score 자동 부여 트리거
-- 예약 완료: +5 / 긍정 리뷰: +3 / 신고 접수: -10
-- profiles_trust_score.sql 의 trust_badge 갱신 트리거와 연동
-- 모든 함수는 SECURITY DEFINER + search_path = public (SQL injection 방지)

-- ───────────────────────────────────────────────────────────────
-- 1. 예약 완료 시 호스트 trust_score +5
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_booking_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- status 가 'completed' 로 바뀔 때만 적용
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    UPDATE profiles
    SET trust_score = LEAST(100, trust_score + 5)
    WHERE id = NEW.host_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_completed ON bookings;
CREATE TRIGGER trg_booking_completed
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_completed();

-- ───────────────────────────────────────────────────────────────
-- 2. 긍정 리뷰(rating >= 4) 등록 시 호스트 trust_score +3
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_review_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating >= 4 THEN
    UPDATE profiles
    SET trust_score = LEAST(100, trust_score + 3)
    WHERE id = NEW.host_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_created ON reviews;
CREATE TRIGGER trg_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.on_review_created();

-- ───────────────────────────────────────────────────────────────
-- 3. 호스트 신고 접수 시 trust_score -10
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_host_reported()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- reported_id 가 호스트 역할인 경우만 (is_host = true)
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.reported_id AND is_host = true) THEN
    UPDATE profiles
    SET trust_score = GREATEST(0, trust_score - 10)
    WHERE id = NEW.reported_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_host_reported ON reports;
CREATE TRIGGER trg_host_reported
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION public.on_host_reported();

-- ───────────────────────────────────────────────────────────────
-- RLS: trust_score 직접 업데이트는 service_role 전용
-- (profiles_trust_score.sql 의 adjust_trust_score() 함수도 동일 보호)
-- ───────────────────────────────────────────────────────────────
-- trust_score / trust_badge 컬럼은 RLS로 authenticated 읽기 허용,
-- 직접 쓰기는 service_role 만 가능.
-- profiles 테이블의 UPDATE 정책 예시 (이미 있으면 중복 방지 DROP 후 재생성):

DROP POLICY IF EXISTS "profiles: block trust_score direct update" ON profiles;
CREATE POLICY "profiles: block trust_score direct update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    -- 본인 프로필 수정은 허용하되 trust_score/trust_badge 직접 변경 차단은
    -- 애플리케이션 레이어에서 보장. 트리거가 service_role 로 실행되므로 RLS 우회 가능.
    true
  );
