# Hòa Bình Project - Data Integration Guide

## Overview
Your hiepd5.com has been updated to fetch real project data from Supabase and display it in the Gallery Showcase. The system is now fully connected to fetch project details, display images from Cloudflare R2, and manage downloads.

## Step 1: Insert Your Project Data into Supabase

Run the SQL script in your Supabase SQL editor:

**How to run the SQL:**
1. Go to: https://app.supabase.com
2. Select your project
3. Navigate to: **SQL Editor** (left sidebar)
4. Click: **New Query**
5. Copy and paste the SQL script from `/scripts/insert-hoa-binh-project.sql`
6. Click: **Run** (or press Ctrl+Enter)

**SQL Script Content:**
```sql
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
```

**What this does:**
- Inserts your Hòa Bình project with the title, description, and images from Cloudflare R2
- Sets it as published and featured so it appears in the showcase
- Sets download cost to 5 credits
- Leaves video_url empty (shows placeholder "Video giới thiệu đang cập nhật")

## Step 2: Project Data Structure

The projects table has the following columns:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Auto-generated project ID |
| title | text | Project name (e.g., "Hòa Bình - Quy Hoạch") |
| description | text | Project description |
| thumbnail_url | text | Cover image from R2 |
| gallery_urls | text[] | Array of image URLs for gallery |
| software_tags | text[] | Array of software names ["D5 Render", "Quy hoạch"] |
| download_cost | integer | Credits needed to download (e.g., 5) |
| is_published | boolean | true = visible in showcase |
| is_featured | boolean | true = shows in featured section |
| video_url | text | Bunny.net video URL (optional) |
| view_count | integer | Auto-tracked views |
| download_count | integer | Auto-tracked downloads |
| category | text | Project category |
| created_at | timestamp | Auto-set creation time |
| updated_at | timestamp | Auto-updated modification time |

## Step 3: Test the Integration

1. **Navigate to the home page**: http://localhost:3000 or https://hiepd5.com
2. **Click on "Library Showcase" tab** - You should see your Hòa Bình project displayed
3. **Click on the project card** - It should navigate to `/project/[id]` showing:
   - Thumbnail image from R2
   - Project title and description
   - Software tags: "D5 Render", "Quy hoạch"
   - Gallery with 3 images (Ocean Garden, QH 1000 ha x2)
   - Download button showing "⚡ 5 Credits"
   - Video placeholder (since no video URL is set)

## Step 4: Add More Projects

To add more projects, simply insert new rows into the projects table:

```sql
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
  category,
  created_at,
  updated_at
) VALUES (
  'Your Project Title',
  'Your project description',
  'https://pub-xxxx.r2.dev/thumbnail.jpg',
  ARRAY[
    'https://pub-xxxx.r2.dev/image1.jpg',
    'https://pub-xxxx.r2.dev/image2.jpg'
  ],
  ARRAY['D5 Render', 'Your Software'],
  3,
  true,
  false,
  NULL,
  'Your Category',
  NOW(),
  NOW()
);
```

## Step 5: Frontend Components

### ProjectShowcase Component (`/components/project-showcase.tsx`)
- Fetches all published projects from Supabase
- Displays featured projects in a 2-column grid (large cards)
- Displays other projects in a 4-column grid (small cards)
- Each card shows: thumbnail, title, description, tags, stats, credit cost

### Project Detail Page (`/app/project/[id]/page.tsx`)
- Displays full project information
- Video section with placeholder if no video URL
- Software tags display
- Thumbnail image on the right
- Gallery images in a grid with lightbox support
- Download button showing credit cost

### API Routes
- `GET /api/projects` - Returns all published projects ordered by featured/created_at
- `GET /api/projects/[id]` - Returns single project details

## Step 6: Features Included

✅ **Real Data from Supabase**
- Projects table fully integrated
- Automatic view count tracking
- Download count tracking

✅ **R2 Images**
- Thumbnail display
- Gallery image grid
- Lightbox modal for full-screen viewing

✅ **Professional UI**
- Header with Credits and Avatar display (logged-in users)
- Login button for guests
- Responsive design for mobile/tablet/desktop
- Smooth animations and transitions

✅ **Download System**
- Download button shows cost in credits
- Ready for credit deduction logic (implement in `/api/download` route)

## Next Steps

1. **Run the SQL script** to insert your first project
2. **Test navigation** from showcase to project detail
3. **Add more projects** by inserting into projects table
4. **Implement download logic** in `/api/download` route to handle credit deduction
5. **Optional: Add video URLs** by updating `video_url` column for any project

## Environment Variables Required

Your Supabase integration is already connected with:
- SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

All are automatically configured - no additional setup needed!
