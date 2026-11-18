-- trust_score 초기값 backfill (1회성 migration, 멱등성 보장)
-- 실행 조건: trust_score = 0 인 호스트만 대상
-- 배치: 1000행씩 처리 (대량 업데이트 안전)

DO $$
DECLARE
  batch_size INT := 1000;
  offset_val INT := 0;
  updated    INT;
BEGIN
  LOOP
    WITH scored AS (
      SELECT
        p.id,
        LEAST(100,
          -- 완료된 예약 수 × 5 (최대 50)
          LEAST(50, COALESCE(b.completed_count, 0) * 5)
          -- 긍정 리뷰(rating>=4) 수 × 3 (최대 30)
          + LEAST(30, COALESCE(r.positive_count, 0) * 3)
          -- 신고 없는 호스트 보너스 +20
          + CASE WHEN COALESCE(rep.report_count, 0) = 0 THEN 20 ELSE 0 END
        ) AS new_score
      FROM profiles p
      LEFT JOIN (
        SELECT host_id, COUNT(*) AS completed_count
        FROM bookings
        WHERE status = 'completed'
        GROUP BY host_id
      ) b ON b.host_id = p.id
      LEFT JOIN (
        SELECT reviewee_id, COUNT(*) AS positive_count
        FROM reviews
        WHERE rating >= 4
        GROUP BY reviewee_id
      ) r ON r.reviewee_id = p.id
      LEFT JOIN (
        SELECT reported_id, COUNT(*) AS report_count
        FROM reports
        GROUP BY reported_id
      ) rep ON rep.reported_id = p.id
      WHERE p.trust_score = 0            -- 아직 초기화 안 된 행만
        AND p.id IS NOT NULL
      ORDER BY p.id
      LIMIT batch_size OFFSET offset_val
    )
    UPDATE profiles p
    SET trust_score = s.new_score
    FROM scored s
    WHERE p.id = s.id
      AND p.trust_score = 0;

    GET DIAGNOSTICS updated = ROW_COUNT;
    EXIT WHEN updated = 0;
    offset_val := offset_val + batch_size;
  END LOOP;

  RAISE NOTICE 'trust_score backfill 완료';
END $$;
