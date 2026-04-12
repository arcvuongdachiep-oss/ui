-- Create download_history table for tracking user downloads
CREATE TABLE IF NOT EXISTS download_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate downloads charging credits
  UNIQUE(user_id, project_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_download_history_user_id ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_project_id ON download_history(project_id);
CREATE INDEX IF NOT EXISTS idx_download_history_downloaded_at ON download_history(downloaded_at DESC);

-- Enable RLS
ALTER TABLE download_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own download history
CREATE POLICY "Users can view own download history"
  ON download_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert download records (via service role)
CREATE POLICY "Service can insert download history"
  ON download_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all download history
CREATE POLICY "Admins can view all download history"
  ON download_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
