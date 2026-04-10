-- Create prompt_history table for storing user's generation history
CREATE TABLE IF NOT EXISTS public.prompt_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  prompt TEXT NOT NULL,
  vietnamese_prompt TEXT,
  base_image_url TEXT,
  ref_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by user_id and created_at
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id ON public.prompt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at ON public.prompt_history(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own history
CREATE POLICY "prompt_history_select_own" ON public.prompt_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own history
CREATE POLICY "prompt_history_insert_own" ON public.prompt_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own history
CREATE POLICY "prompt_history_delete_own" ON public.prompt_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to enforce FIFO limit of 10 records per user
CREATE OR REPLACE FUNCTION enforce_prompt_history_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete oldest records if user has more than 9 (to make room for the new one)
  DELETE FROM public.prompt_history
  WHERE id IN (
    SELECT id FROM public.prompt_history
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 9
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the limit
DROP TRIGGER IF EXISTS trigger_enforce_prompt_history_limit ON public.prompt_history;
CREATE TRIGGER trigger_enforce_prompt_history_limit
  AFTER INSERT ON public.prompt_history
  FOR EACH ROW
  EXECUTE FUNCTION enforce_prompt_history_limit();
