-- Create request_logs table for rate limiting and queue management
CREATE TABLE IF NOT EXISTS request_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  request_type TEXT DEFAULT 'generate',
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status);
CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON request_logs(ip_address);

-- Enable RLS
ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own request logs
CREATE POLICY "Users can view own request logs" ON request_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own request logs
CREATE POLICY "Users can insert own request logs" ON request_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check rate limit (max 2 requests per 3 minutes)
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id UUID, p_ip_address TEXT)
RETURNS TABLE(allowed BOOLEAN, requests_in_window INT, seconds_until_reset INT) AS $$
DECLARE
  v_count INT;
  v_oldest_request TIMESTAMPTZ;
  v_window_seconds INT := 180; -- 3 minutes
BEGIN
  -- Count requests in the last 3 minutes (by user or IP)
  SELECT COUNT(*), MIN(created_at) INTO v_count, v_oldest_request
  FROM request_logs
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND created_at > now() - interval '3 minutes';
  
  allowed := v_count < 2;
  requests_in_window := v_count;
  
  IF v_oldest_request IS NOT NULL AND v_count >= 2 THEN
    seconds_until_reset := GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_request + interval '3 minutes' - now()))::INT);
  ELSE
    seconds_until_reset := 0;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get queue position
CREATE OR REPLACE FUNCTION get_queue_position(p_request_id UUID)
RETURNS INT AS $$
DECLARE
  v_position INT;
BEGIN
  SELECT COUNT(*) INTO v_position
  FROM request_logs
  WHERE status IN ('pending', 'processing')
    AND created_at <= (SELECT created_at FROM request_logs WHERE id = p_request_id)
    AND id != p_request_id;
  
  RETURN v_position + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current processing count
CREATE OR REPLACE FUNCTION get_processing_count()
RETURNS INT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM request_logs WHERE status = 'processing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
