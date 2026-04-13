-- SQL script to insert the project into Supabase
-- Run this in the Supabase SQL editor: https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new

INSERT INTO public.projects (
  title,
  description,
  thumbnail_url,
  gallery_urls,
  software_tags,
  download_cost,
  is_published,
  is_featured,
  video_url,
  view_count,
  download_count,
  category,
  created_at,
  updated_at
) VALUES (
  'Hòa Bình - Quy Hoạch',
  'Dự án quy hoạch toàn cảnh Hòa Bình với các ảnh chi tiết về Ocean Garden, khu đất 1000 ha ở Ninh Thuận',
  'https://pub-e75d321c148c497894f917df796ee7eb.r2.dev/HOA%20BINH.jpg',
  ARRAY[
    'https://pub-e75d321c148c497894f917df796ee7eb.r2.dev/OCEAN%20GADEN.jpg',
    'https://pub-e75d321c148c497894f917df796ee7eb.r2.dev/QH%201000%20ha%20ninh%20thuan%20(1).jpg',
    'https://pub-e75d321c148c497894f917df796ee7eb.r2.dev/QH%201000%20ha%20ninh%20thuan%20(2).jpg'
  ],
  ARRAY['D5 Render', 'Quy hoạch'],
  5,
  true,
  true,
  NULL,
  0,
  0,
  'Planning',
  NOW(),
  NOW()
) RETURNING id;

-- Copy the returned ID (UUID) above and use it to update links in your project showcase

-- To verify the insert:
SELECT * FROM public.projects WHERE title = 'Hòa Bình - Quy Hoạch' LIMIT 1;
