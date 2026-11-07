-- 채팅 미읽음 카운트 정확도 수정 (Loop⑦ UX)
-- chat_rooms에 per-user read timestamp 추가
-- user_last_read_at: 일반 사용자(user_id)가 마지막으로 채팅방을 열어본 시각
-- host_last_read_at: 호스트(host_id)가 마지막으로 채팅방을 열어본 시각

ALTER TABLE chat_rooms
  ADD COLUMN IF NOT EXISTS user_last_read_at  timestamptz,
  ADD COLUMN IF NOT EXISTS host_last_read_at  timestamptz;

-- 인덱스: 미읽음 메시지 COUNT 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_messages_room_created
  ON messages (room_id, created_at DESC);

-- RPC: 채팅방 열람 시 본인 read_at 갱신
-- caller_id는 호출 측 user_id — DB 함수이므로 auth.uid()로 직접 추출 가능
CREATE OR REPLACE FUNCTION mark_chat_room_read(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room chat_rooms%ROWTYPE;
BEGIN
  SELECT * INTO v_room FROM chat_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_room.user_id = auth.uid() THEN
    UPDATE chat_rooms SET user_last_read_at = now() WHERE id = p_room_id;
  ELSIF v_room.host_id = auth.uid() THEN
    UPDATE chat_rooms SET host_last_read_at = now() WHERE id = p_room_id;
  END IF;
  -- 비참여자는 무시
END;
$$;

-- RPC를 인증된 사용자만 호출 가능
REVOKE ALL ON FUNCTION mark_chat_room_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_chat_room_read(uuid) TO authenticated;
