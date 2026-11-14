-- RLS 갭 수정: posts, post_comments INSERT 정책에 is_adult 체크 추가
-- API 레벨 체크가 있지만 Supabase 클라이언트 직접 접근 시 미성년자 우회 방지

-- ① posts INSERT 정책 교체
DROP POLICY IF EXISTS "본인만 게시물 작성" ON posts;
CREATE POLICY "성인 인증된 사용자만 게시물 작성"
  ON posts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.is_adult = true
    )
  );

-- ② post_comments INSERT 정책 교체
DROP POLICY IF EXISTS "인증된 사용자만 댓글 작성" ON post_comments;
CREATE POLICY "성인 인증된 사용자만 댓글 작성"
  ON post_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.is_adult = true
    )
  );

-- ③ post_likes INSERT 정책에도 is_adult 추가 (기존 정책명 일치)
DROP POLICY IF EXISTS "인증된 사용자만 좋아요" ON post_likes;
CREATE POLICY "성인 인증된 사용자만 좋아요"
  ON post_likes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.is_adult = true
    )
  );

-- ④ stories INSERT 정책에도 is_adult 추가
DROP POLICY IF EXISTS "본인만 스토리 작성" ON stories;
CREATE POLICY "성인 인증된 사용자만 스토리 작성"
  ON stories
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.is_adult = true
    )
  );
