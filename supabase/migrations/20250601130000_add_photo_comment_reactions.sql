-- Emoji reactions on photo comments (any thread depth)
CREATE TABLE IF NOT EXISTS photo_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES photo_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('heart', 'like', 'star', 'smile')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS photo_comment_reactions_comment_id_idx
  ON photo_comment_reactions(comment_id);

ALTER TABLE photo_comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comment reactions"
  ON photo_comment_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add their own comment reactions"
  ON photo_comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own comment reactions"
  ON photo_comment_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
