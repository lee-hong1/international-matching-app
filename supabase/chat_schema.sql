-- GlobalMatch 채팅 스키마
-- chat_rooms: 매칭 기반(match_id) + 예약 기반(booking_id) 통합
-- messages: 채팅 메시지 (외부 플랫폼 유도 시 is_flagged=true)
-- RLS: 채팅방 참여자만 접근 허용

-- schema.sql에서 이미 chat_rooms(id, match_id, created_at, last_message_at) 정의됨
-- 예약 기반 채팅을 위한 추가 컬럼 migration
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS host_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- booking_id 유니크 제약 (예약당 채팅방 1개)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_rooms_booking_id_key'
  ) THEN
    ALTER TABLE chat_rooms ADD CONSTRAINT chat_rooms_booking_id_key UNIQUE (booking_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_user    ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_host    ON chat_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_booking ON chat_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_match   ON chat_rooms(match_id);

-- messages 테이블에 is_flagged 컬럼 추가 (schema.sql에 없는 컬럼)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT false;

-- messages content 길이 제약 (1~2000자)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_length'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_content_length CHECK (char_length(content) BETWEEN 1 AND 2000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_room    ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender  ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(is_flagged) WHERE is_flagged = true;

-- RLS 활성화
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;

-- chat_rooms: 매칭 참여자 OR 예약 참여자 조회
-- match_id 기반(lib/chat.ts): matches 테이블에서 user1_id/user2_id 확인
-- booking_id 기반(API): user_id/host_id 직접 확인
DROP POLICY IF EXISTS "room participants read" ON chat_rooms;
CREATE POLICY "room participants read" ON chat_rooms FOR SELECT
  USING (
    auth.uid() = user_id OR auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = chat_rooms.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

-- chat_rooms INSERT: 본인이 user_id/host_id 중 하나이거나 service_role 사용
DROP POLICY IF EXISTS "service role insert room" ON chat_rooms;
CREATE POLICY "service role insert room" ON chat_rooms FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() = host_id);

-- messages: 채팅방 참여자만 조회 (match_id/booking_id 양방향 지원)
DROP POLICY IF EXISTS "room members read messages" ON messages;
CREATE POLICY "room members read messages" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = room_id
        AND (
          cr.user_id = auth.uid() OR cr.host_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = cr.match_id
              AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
          )
        )
    )
  );

-- messages INSERT: 채팅방 참여자 + sender_id = 본인
DROP POLICY IF EXISTS "room members send messages" ON messages;
CREATE POLICY "room members send messages" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = room_id
        AND (
          cr.user_id = auth.uid() OR cr.host_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM matches m
            WHERE m.id = cr.match_id
              AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
          )
        )
    )
  );

-- 메시지 수정/삭제 불가 (무단 증거 삭제 방지)
-- DELETE는 service_role만 (관리자 처리)
