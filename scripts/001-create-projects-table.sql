-- Create projects table for storing project showcase data
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'interior', -- interior, exterior, landscape, etc.
  
  -- Media URLs (external storage)
  thumbnail_url TEXT, -- Main thumbnail image
  video_url TEXT, -- Bunny.net video embed URL
  gallery_urls TEXT[] DEFAULT '{}', -- Array of Cloudflare R2 image URLs
  
  -- Software tags
  software_tags TEXT[] DEFAULT '{}', -- e.g., ['D5 Render', 'SketchUp', 'Lumion']
  
  -- Download settings
  download_cost INTEGER NOT NULL DEFAULT 1, -- Credits required to download
  file_path TEXT, -- Path to downloadable file in R2 bucket
  file_size_mb NUMERIC(10,2), -- File size in MB for display
  
  -- Metadata
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_is_published ON projects(is_published);
CREATE INDEX IF NOT EXISTS idx_projects_is_featured ON projects(is_featured);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Public can view published projects
CREATE POLICY "Anyone can view published projects"
  ON projects
  FOR SELECT
  USING (is_published = true);

-- Authenticated users with admin role can manage projects
CREATE POLICY "Admins can manage projects"
  ON projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
