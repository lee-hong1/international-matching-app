-- GlobalMatch 채팅 스키마
-- chat_rooms: booking 1:1 채팅방
-- messages: 채팅 메시지 (외부 플랫폼 유도 시 is_flagged=true)
-- RLS: 채팅방 참여자(user_id/host_id)만 접근 허용

CREATE TABLE IF NOT EXISTS chat_rooms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID        REFERENCES bookings(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_user   ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_host   ON chat_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking ON chat_rooms(booking_id);

CREATE TABLE IF NOT EXISTS messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_flagged BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_room       ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender     ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_flagged    ON messages(is_flagged) WHERE is_flagged = true;

-- RLS 활성화
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;

-- chat_rooms: 참여자만 조회
DROP POLICY IF EXISTS "room participants read" ON chat_rooms;
CREATE POLICY "room participants read" ON chat_rooms FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = host_id);

-- chat_rooms: booking 연관 INSERT (application logic에서 service role 사용)
DROP POLICY IF EXISTS "service role insert room" ON chat_rooms;
CREATE POLICY "service role insert room" ON chat_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() = host_id);

-- messages: 채팅방 참여자만 조회
DROP POLICY IF EXISTS "room members read messages" ON messages;
CREATE POLICY "room members read messages" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
        AND (user_id = auth.uid() OR host_id = auth.uid())
    )
  );

-- messages: 채팅방 참여자만 INSERT (sender_id = 본인)
DROP POLICY IF EXISTS "room members send messages" ON messages;
CREATE POLICY "room members send messages" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = room_id
        AND (user_id = auth.uid() OR host_id = auth.uid())
    )
  );

-- 메시지 수정/삭제 불가 (무단 증거 삭제 방지)
-- DELETE는 service_role만 (관리자 처리)
