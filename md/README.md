# 🔥 CÔNG CỤ GHÉP VIDEO & HARDBURN SUBTITLE

Công cụ mạnh mẽ để ghép nhiều video thành một và **HARDBURN SUBTITLE** trực tiếp vào video sử dụng FFmpeg.

## ✨ Tính năng

- ✅ **Ghép nhiều video** thành 1 file
- 🔥 **HARDBURN SUBTITLE** - Subtitle được burn trực tiếp vào video (mặc định)
- ✅ **3 phương pháp gắn subtitle** với auto-fallback thông minh
- ✅ **Hiển thị progress bar** trong quá trình xử lý  
- ✅ **Tạo tên file output** tự động theo timestamp
- ✅ **Hỗ trợ nhiều định dạng** video và subtitle
- ✅ **Xử lý lỗi thông minh** với gợi ý khắc phục

## 📋 Hướng dẫn sử dụng

### Bước 1: Chuẩn bị file
```
videos/
├── video1.mp4
├── video2.mp4
├── video3.mp4
└── subtitle.srt (tùy chọn)
```

### Cách 1: Sử dụng cơ bản (HARDBURN mặc định)
```bash
node mergedVids.js
```
- Tự động ghép video và **BURN SUBTITLE** trực tiếp vào video

### Cách 2: Chỉ định phương pháp subtitle
```bash
node mergedVids.js --subtitle=hardburn     # Burn subtitle (mặc định)
node mergedVids.js --subtitle=embed        # Nhúng subtitle (có thể tắt)
node mergedVids.js --subtitle=sidecar      # File subtitle riêng
```

### Cách 3: Chỉ định thư mục khác
```bash
node mergedVids.js --folder=C:\MyVideos
```

### Cách 4: Xem hướng dẫn
```bash
node mergedVids.js --help
```

### Bước 3: Nhận kết quả
- Video đã ghép: `merged_video_2025-10-07_14-30-25.mp4`
- Video có subtitle: `merged_video_with_subtitle_2025-10-07_14-30-26.mp4`

## 🎥 Định dạng hỗ trợ

### Video
- `.mp4` (khuyến nghị)
- `.avi`
- `.mov`
- `.mkv`
- `.flv`
- `.wmv`
- `.webm`

### Subtitle
- `.srt` (khuyến nghị)
- `.ass`
- `.ssa`
- `.vtt`

## 🚀 Scripts hỗ trợ

### Tạo video test
```bash
node create-test-videos.js
```
Tạo 2 video test để thử nghiệm tính năng ghép video.

### Setup subtitle test
```bash
node test-subtitle.js
```
Copy file subtitle vào thư mục videos để test.

## 📊 Ví dụ kết quả

```
🎬 === CÔNG CỤ GHÉP VIDEO & GẮN SUBTITLE ===
📋 Hướng dẫn sử dụng:
   1. Đặt tất cả video cần ghép vào thư mục 'videos'
   2. Đặt file subtitle (.srt) vào cùng thư mục (tùy chọn)
   3. Chạy script này
   4. Video đã ghép (và có subtitle) sẽ được lưu trong cùng thư mục
==========================================

🔍 Tìm kiếm video trong thư mục: C:\Users\ADMIN\Desktop\HungHa\PM\Blog\videos
📝 Tìm thấy subtitle: subtitle.srt
📹 Sẽ ghép 2 video:
   1. test1.mp4 (1.25MB)
   2. test2.mp4 (1.84MB)
💾 Output: merged_video_2025-10-07_14-30-25.mp4

🚀 Bắt đầu ghép video...
▶️ Bắt đầu thực thi FFmpeg...
⏳ Đang xử lý: 100%
✅ Ghép video hoàn thành!
✅ Ghép video hoàn thành: merged_video_2025-10-07_14-30-25.mp4 (3.09MB)

📝 Bắt đầu gắn subtitle...
▶️ Bắt đầu gắn subtitle...
📝 Đang gắn subtitle: 100%
✅ Gắn subtitle hoàn thành!
✅ File với subtitle: merged_video_with_subtitle_2025-10-07_14-30-26.mp4 (3.12MB)

🎉 HOÀN THÀNH! File cuối cùng: merged_video_with_subtitle_2025-10-07_14-30-26.mp4 (3.12MB)
```

## 🛠️ Yêu cầu hệ thống

- Node.js 14+
- NPM packages:
  - `@ffmpeg-installer/ffmpeg`
  - `fluent-ffmpeg`

## 📝 Ghi chú

- Script tự động sắp xếp video theo tên file (a-z)
- Nếu có nhiều file subtitle, sẽ chọn file đầu tiên
- Video output luôn ở định dạng MP4
- Subtitle được nhúng vào video (không phải file riêng)

## 🐛 Xử lý lỗi

Script có khả năng xử lý và gợi ý khắc phục các lỗi thường gặp:
- File không tồn tại
- Định dạng video không tương thích
- Lỗi quyền truy cập thư mục
- Lỗi codec

## 🤝 Đóng góp

Nếu bạn có ý tưởng cải thiện hoặc phát hiện lỗi, hãy tạo issue hoặc pull request!