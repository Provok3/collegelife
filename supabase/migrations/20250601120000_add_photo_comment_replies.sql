-- Enable threaded replies on photo comments
ALTER TABLE photo_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES photo_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS photo_comments_parent_id_idx ON photo_comments(parent_id);

COMMENT ON COLUMN photo_comments.parent_id IS 'When set, this comment is a reply to the parent comment.';
