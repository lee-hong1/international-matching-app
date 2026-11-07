-- reviews: 예약 완료 후 양측(사용자/호스트)이 작성하는 리뷰
-- trust_score_trigger.sql이 이 테이블을 참조함

CREATE TABLE IF NOT EXISTS reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating       INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT        CHECK (char_length(comment) <= 1000),
  is_public    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, reviewer_id)  -- 한 예약당 한 리뷰
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id, created_at DESC)
  WHERE is_public = true;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 공개 리뷰 또는 본인 관련 리뷰 조회
CREATE POLICY "review visibility" ON reviews
  FOR SELECT
  USING (
    is_public = true
    OR auth.uid() = reviewer_id
    OR auth.uid() = reviewee_id
  );

-- 완료된 예약의 당사자만 리뷰 작성 가능
CREATE POLICY "booking parties can review" ON reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_id
        AND status = 'completed'
        AND (user_id = auth.uid() OR host_id = auth.uid())
    )
  );

-- 리뷰 수정/삭제 불가 (INSERT only — 신뢰성 보장)
-- UPDATE/DELETE 정책 없음 = 거부
