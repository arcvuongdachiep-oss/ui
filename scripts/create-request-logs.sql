-- Create request_logs table for rate limiting
CREATE TABLE IF NOT EXISTS request_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_request_logs_user_created ON request_logs(user_id, created_at DESC);
