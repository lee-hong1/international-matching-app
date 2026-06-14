-- =====================================================
-- 팬 커뮤니티 플랫폼 스키마 (Instagram 스타일)
-- =====================================================

-- 팔로우 테이블
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 게시물 테이블
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  caption TEXT,
  location TEXT,
  is_public BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게시물 미디어 테이블 (다중 사진 지원)
CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게시물 좋아요 테이블
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 게시물 댓글 테이블
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 댓글 좋아요 테이블
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 스토리 테이블 (24시간 콘텐츠)
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  bg_color TEXT DEFAULT '#000000',
  views_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 스토리 조회 테이블
CREATE TABLE story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- 크리에이터 프로필 확장 테이블
CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT,
  category TEXT DEFAULT 'lifestyle' CHECK (category IN ('lifestyle', 'beauty', 'travel', 'food', 'fitness', 'fashion', 'art', 'music', 'other')),
  website_url TEXT,
  is_creator BOOLEAN DEFAULT true,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 인덱스
-- =====================================================
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_post_media_post_id ON post_media(post_id);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);

-- =====================================================
-- RLS 정책
-- =====================================================
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- 팔로우 정책
CREATE POLICY "누구나 팔로우 조회 가능" ON follows FOR SELECT USING (true);
CREATE POLICY "인증된 사용자만 팔로우 가능" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "본인만 팔로우 취소 가능" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- 게시물 정책
CREATE POLICY "공개 게시물 누구나 조회" ON posts FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "본인만 게시물 작성" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인만 게시물 수정" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "본인만 게시물 삭제" ON posts FOR DELETE USING (auth.uid() = user_id);

-- 게시물 미디어 정책
CREATE POLICY "공개 게시물 미디어 누구나 조회" ON post_media FOR SELECT USING (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_media.post_id AND (posts.is_public = true OR posts.user_id = auth.uid()))
);
CREATE POLICY "게시물 작성자만 미디어 추가" ON post_media FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_media.post_id AND posts.user_id = auth.uid())
);
CREATE POLICY "게시물 작성자만 미디어 삭제" ON post_media FOR DELETE USING (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_media.post_id AND posts.user_id = auth.uid())
);

-- 좋아요 정책
CREATE POLICY "누구나 좋아요 조회" ON post_likes FOR SELECT USING (true);
CREATE POLICY "인증된 사용자만 좋아요" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인만 좋아요 취소" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- 댓글 정책
CREATE POLICY "누구나 댓글 조회" ON post_comments FOR SELECT USING (true);
CREATE POLICY "인증된 사용자만 댓글 작성" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인만 댓글 수정" ON post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "본인만 댓글 삭제" ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- 댓글 좋아요 정책
CREATE POLICY "누구나 댓글 좋아요 조회" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "인증된 사용자만 댓글 좋아요" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인만 댓글 좋아요 취소" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- 스토리 정책
CREATE POLICY "만료되지 않은 스토리 조회" ON stories FOR SELECT USING (expires_at > NOW() OR auth.uid() = user_id);
CREATE POLICY "본인만 스토리 작성" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인만 스토리 삭제" ON stories FOR DELETE USING (auth.uid() = user_id);

-- 스토리 조회 정책
CREATE POLICY "조회 기록 조회" ON story_views FOR SELECT USING (auth.uid() = viewer_id OR
  EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())
);
CREATE POLICY "인증된 사용자만 조회 기록 추가" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- 크리에이터 프로필 정책
CREATE POLICY "누구나 크리에이터 프로필 조회" ON creator_profiles FOR SELECT USING (true);
CREATE POLICY "본인만 크리에이터 프로필 생성" ON creator_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "본인만 크리에이터 프로필 수정" ON creator_profiles FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 카운트 자동 업데이트 함수 및 트리거
-- =====================================================

-- 게시물 좋아요 카운트 업데이트
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- 게시물 댓글 카운트 업데이트
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_comments_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- 스토리 조회수 업데이트
CREATE OR REPLACE FUNCTION update_story_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_story_views_count
  AFTER INSERT ON story_views
  FOR EACH ROW EXECUTE FUNCTION update_story_views_count();

-- 팔로워/팔로잉 카운트 업데이트
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE creator_profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE creator_profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE creator_profiles SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
    UPDATE creator_profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- 게시물 카운트 업데이트
CREATE OR REPLACE FUNCTION update_creator_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE creator_profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE creator_profiles SET posts_count = GREATEST(posts_count - 1, 0) WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_creator_posts_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_creator_posts_count();

-- updated_at 트리거
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
