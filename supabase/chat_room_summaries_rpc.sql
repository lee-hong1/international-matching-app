-- 채팅방 목록 조회 최적화 RPC (Loop⑥ 성능)
-- 기존: messages 전체 조인 → N개 메시지 × 50 채팅방 = 과도한 데이터 전송
-- 수정: 최신 메시지 1개 + 미읽음 카운트를 DB에서 계산 → 최소 데이터 반환

CREATE OR REPLACE FUNCTION get_chat_room_summaries(p_user_id uuid)
RETURNS TABLE (
  id                 uuid,
  booking_id         uuid,
  user_id            uuid,
  host_id            uuid,
  created_at         timestamptz,
  user_last_read_at  timestamptz,
  host_last_read_at  timestamptz,
  last_message       text,
  last_message_at    timestamptz,
  last_sender_id     uuid,
  unread_count       bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- IDOR 방지: SECURITY DEFINER 함수이므로 호출자 본인 UUID만 허용
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH room_data AS (
    SELECT
      cr.id,
      cr.booking_id,
      cr.user_id,
      cr.host_id,
      cr.created_at,
      cr.user_last_read_at,
      cr.host_last_read_at,
      -- 본인의 last_read_at: user인지 host인지에 따라 선택
      CASE
        WHEN cr.user_id = p_user_id THEN cr.user_last_read_at
        ELSE cr.host_last_read_at
      END AS my_last_read_at
    FROM chat_rooms cr
    WHERE cr.user_id = p_user_id OR cr.host_id = p_user_id
    ORDER BY cr.created_at DESC
    LIMIT 50
  ),
  latest_msg AS (
    -- DISTINCT ON: 채팅방당 최신 메시지 1개만 조회
    SELECT DISTINCT ON (m.room_id)
      m.room_id,
      m.content  AS last_message,
      m.created_at AS last_message_at,
      m.sender_id AS last_sender_id
    FROM messages m
    INNER JOIN room_data rd ON rd.id = m.room_id
    ORDER BY m.room_id, m.created_at DESC
  ),
  unread_counts AS (
    -- my_last_read_at 이후 상대방 메시지 수
    SELECT
      m.room_id,
      COUNT(*) AS unread_count
    FROM messages m
    INNER JOIN room_data rd ON rd.id = m.room_id
    WHERE
      m.sender_id <> p_user_id
      AND (rd.my_last_read_at IS NULL OR m.created_at > rd.my_last_read_at)
    GROUP BY m.room_id
  )
  SELECT
    rd.id,
    rd.booking_id,
    rd.user_id,
    rd.host_id,
    rd.created_at,
    rd.user_last_read_at,
    rd.host_last_read_at,
    lm.last_message,
    lm.last_message_at,
    lm.last_sender_id,
    COALESCE(uc.unread_count, 0) AS unread_count
  FROM room_data rd
  LEFT JOIN latest_msg lm ON lm.room_id = rd.id
  LEFT JOIN unread_counts uc ON uc.room_id = rd.id
  ORDER BY rd.created_at DESC;
END;
$$;

-- 인증된 사용자만 호출 가능 (본인 채팅방만 — SECURITY DEFINER + auth.uid() 검증)
REVOKE ALL ON FUNCTION get_chat_room_summaries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_chat_room_summaries(uuid) TO authenticated;
