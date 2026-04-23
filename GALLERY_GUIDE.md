# Hướng Dẫn Thêm Ảnh và Video vào Thư Viện Dự Án

## 1. Tính Năng Hiện Tại

### Lightbox Click Thumbnail
- **Trên trang chủ (Library Showcase)**: Click vào thumbnail bất kỳ dự án để mở lightbox xem ảnh 16:9 lớn
- **Trên trang chi tiết (/project/[id])**: Click ảnh trong thư viện ảnh để mở lightbox fullscreen với navigation

### Hiển Thị Ảnh
- Sử dụng trường `thumbnail_url` cho ảnh đại diện (nếu có)
- Nếu không có `thumbnail_url`, tự động lấy ảnh đầu tiên từ mảng `gallery_urls`

---

## 2. Cách Thêm Ảnh vào Thư Viện

### Bước 1: Upload Ảnh lên Cloudflare R2
1. Đăng nhập vào **Cloudflare Dashboard**
2. Chọn **R2 Object Storage** → Bucket của bạn
3. Click **Upload** và chọn các file ảnh (JPG, PNG, WebP)
4. Copy URL của từng ảnh sau khi upload (format: `https://pub-xxxxx.r2.dev/image-name.jpg`)

### Bước 2: Cập Nhật Supabase

#### Thêm ảnh vào mảng `gallery_urls`:
```sql
UPDATE projects
SET gallery_urls = ARRAY[
  'https://pub-xxxxx.r2.dev/image1.jpg',
  'https://pub-xxxxx.r2.dev/image2.jpg',
  'https://pub-xxxxx.r2.dev/image3.jpg'
]
WHERE id = 'project-uuid-here';
```

#### Cập nhật `thumbnail_url` (ảnh đại diện):
```sql
UPDATE projects
SET thumbnail_url = 'https://pub-xxxxx.r2.dev/main-image.jpg'
WHERE id = 'project-uuid-here';
```

### Bước 3: Xác Minh
- Vào trang chủ (Library Showcase) và click vào project - phải mở lightbox
- Vào trang chi tiết project - thư viện ảnh phải hiển thị tất cả ảnh

---

## 3. Cách Thêm Video

### Lưu Ý: Video Chưa Hỗ Trợ
Hiện tại hệ thống chưa có UI để xử lý video. Để thêm video, cần thực hiện:

#### Cách 1: Upload Video lên Cloudflare Stream (Khuyên Dùng)
1. Đăng nhập **Cloudflare Dashboard**
2. Chọn **Stream** → Upload video
3. Copy embed code hoặc video link
4. Update field `video_url` trong Supabase:
```sql
UPDATE projects
SET video_url = 'https://iframe.cloudflarestream.com/xxxxx'
WHERE id = 'project-uuid-here';
```

#### Cách 2: Lưu Video URL vào R2
1. Upload video lên Cloudflare R2
2. Update `video_url` field:
```sql
UPDATE projects
SET video_url = 'https://pub-xxxxx.r2.dev/video.mp4'
WHERE id = 'project-uuid-here';
```

### Thêm UI Video Player (Cần v0 Chỉnh Sửa)
Hiện tại trang chi tiết project chỉ có placeholder video. Để hiển thị video thực tế:

1. **Chỉnh sửa `/app/project/[id]/page.tsx`**:
   - Tìm section "Video" (dòng ~140-150)
   - Thay thế placeholder bằng `<video>` tag hoặc iframe player
   - Liên kết tới `project.video_url`

**Ví dụ code video player:**
```jsx
{/* Video Section */}
{project.video_url && (
  <div className="py-8">
    <h2 className="text-2xl font-black uppercase tracking-wider mb-4">Video</h2>
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1A1A1A]">
      {project.video_url.includes('iframe.cloudflarestream.com') ? (
        <iframe
          src={project.video_url}
          className="w-full h-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video controls className="w-full h-full">
          <source src={project.video_url} type="video/mp4" />
          Trình duyệt của bạn không hỗ trợ video.
        </video>
      )}
    </div>
  </div>
)}
```

---

## 4. Thêm Nhiều Ảnh Nhanh Chóng

### Script SQL Để Thêm 10 Ảnh Một Lần:
```sql
UPDATE projects
SET gallery_urls = ARRAY[
  'https://pub-xxxxx.r2.dev/01.jpg',
  'https://pub-xxxxx.r2.dev/02.jpg',
  'https://pub-xxxxx.r2.dev/03.jpg',
  'https://pub-xxxxx.r2.dev/04.jpg',
  'https://pub-xxxxx.r2.dev/05.jpg',
  'https://pub-xxxxx.r2.dev/06.jpg',
  'https://pub-xxxxx.r2.dev/07.jpg',
  'https://pub-xxxxx.r2.dev/08.jpg',
  'https://pub-xxxxx.r2.dev/09.jpg',
  'https://pub-xxxxx.r2.dev/10.jpg'
]
WHERE title = 'Tên dự án của bạn';
```

---

## 5. Troubleshooting

| Vấn Đề | Giải Pháp |
|--------|---------|
| Ảnh không hiển thị | Kiểm tra URL R2 (copy lại từ dashboard) |
| Click thumbnail không mở lightbox | F5 reload, cache browser |
| Array ảnh lỗi JSON | Dùng `ARRAY[]` syntax, không dùng JSON |
| Video không phát | Kiểm tra video format (MP4 khuyên dùng) |
| Performance chậm | Nén ảnh trước khi upload |

---

## 6. Cấu Trúc Database Hiện Tại

```sql
projects table columns:
- id (UUID)
- title (text)
- description (text)
- thumbnail_url (text) - ảnh đại diện
- gallery_urls (text[]) - mảng URL ảnh
- video_url (text) - URL video
- download_cost (number)
- is_featured (boolean)
- software_tags (text[])
```

---

## 7. Tính Năng Sắp Tới (Cần Yêu Cầu v0)
- [ ] UI drag-drop upload ảnh trực tiếp
- [ ] Video player UI tích hợp
- [ ] Tự động resize/optimize ảnh khi upload
- [ ] Xem trước ảnh trước khi lưu vào Supabase
