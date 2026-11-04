-- GlobalMatch 영상 통화 스키마 (N+51)
-- call_invitations: 통화 초대 (caller → receiver)
-- RLS: caller/receiver만 접근, respondToInvitation IDOR 방지

CREATE TABLE IF NOT EXISTS call_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "callerId"    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "callerName"  TEXT NOT NULL CHECK (char_length("callerName") BETWEEN 1 AND 100),
  "receiverId"  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "roomId"      TEXT NOT NULL CHECK (char_length("roomId") BETWEEN 1 AND 128),
  type          TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video','audio')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','missed')),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "respondedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_inv_caller   ON call_invitations("callerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_call_inv_receiver ON call_invitations("receiverId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_call_inv_pending  ON call_invitations("receiverId", status) WHERE status = 'pending';

ALTER TABLE call_invitations ENABLE ROW LEVEL SECURITY;

-- caller, receiver만 조회
DROP POLICY IF EXISTS "call participants read" ON call_invitations;
CREATE POLICY "call participants read" ON call_invitations
  FOR SELECT
  USING (auth.uid() = "callerId" OR auth.uid() = "receiverId");

-- caller만 초대 생성 (callerId = 본인)
DROP POLICY IF EXISTS "caller creates invitation" ON call_invitations;
CREATE POLICY "caller creates invitation" ON call_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = "callerId");

-- receiver만 상태 업데이트 (accept/decline), caller만 취소 가능
DROP POLICY IF EXISTS "participants update invitation" ON call_invitations;
CREATE POLICY "participants update invitation" ON call_invitations
  FOR UPDATE
  USING (auth.uid() = "receiverId" OR auth.uid() = "callerId")
  WITH CHECK (auth.uid() = "receiverId" OR auth.uid() = "callerId");
