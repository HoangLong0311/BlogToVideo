# 🔧 Khắc phục lỗi "Cannot find ffprobe"

## Vấn đề:
Khi chạy `mergedVids.js`, gặp lỗi "Cannot find ffprobe" hoặc tương tự.

## Nguyên nhân:
FFprobe là công cụ để phân tích thông tin video/audio, đi kèm với FFmpeg. Script cần ffprobe để:
- Kiểm tra codec video/audio
- Phân tích resolution, frame rate
- Đề xuất phương pháp ghép tối ưu

## ✅ Giải pháp:

### Phương pháp 1: Cài đặt ffprobe-installer (Khuyến nghị)
```bash
npm install @ffprobe-installer/ffprobe
```

### Phương pháp 2: Tải FFmpeg full package
1. Truy cập: https://ffmpeg.org/download.html
2. Tải bản "Full" chứa cả ffmpeg và ffprobe
3. Giải nén và đặt vào thư mục có trong PATH

### Phương pháp 3: Sử dụng Chocolatey (Windows)
```bash
choco install ffmpeg-full
```

### Phương pháp 4: Sử dụng Homebrew (macOS)
```bash
brew install ffmpeg
```

## 🧪 Kiểm tra setup:

### Chạy script kiểm tra:
```bash
node check-ffmpeg-setup.js
```

### Kiểm tra thủ công:
```bash
# Kiểm tra ffmpeg
ffmpeg -version

# Kiểm tra ffprobe  
ffprobe -version
```

## 🔄 Workaround nếu không cài được ffprobe:

Script đã được cập nhật để hoạt động mà không cần ffprobe:
- Bỏ qua kiểm tra tương thích video
- Sử dụng copy codec (phương pháp nhanh nhất)
- Fallback sang re-encode nếu copy codec thất bại

### Hạn chế khi không có ffprobe:
- Không biết được codec của video
- Không tối ưu được phương pháp ghép
- Có thể mất thời gian hơn với video không tương thích

## 🚀 Chạy script sau khi khắc phục:

```bash
# Test cơ bản
node mergedVids.js

# Test với thư mục cụ thể
node mergedVids.js --folder=path/to/videos

# Hiển thị help
node mergedVids.js --help
```

## 📊 Kết quả mong đợi sau khi khắc phục:

✅ **Với ffprobe:**
```
🔍 Kiểm tra tương thích video...
   ✅ video1.mp4: h264/aac 1920x1080 @30.0fps
   ✅ video2.mp4: h264/aac 1920x1080 @30.0fps
📊 Thống kê:
   Video codecs: h264
   Audio codecs: aac
   Resolutions: 1920x1080
✅ Tất cả video tương thích, có thể dùng copy codec
```

⚠️ **Không có ffprobe:**
```
⚠️ FFprobe không khả dụng, bỏ qua kiểm tra tương thích
📝 Sẽ sử dụng phương pháp copy codec (mặc định)
```

## 🔍 Debug thêm:

Nếu vẫn gặp vấn đề, kiểm tra:

1. **Path environment:**
   ```bash
   echo $PATH  # Linux/macOS
   echo %PATH% # Windows
   ```

2. **FFmpeg location:**
   ```bash
   which ffmpeg  # Linux/macOS
   where ffmpeg  # Windows
   ```

3. **Node.js modules:**
   ```bash
   npm list @ffmpeg-installer/ffmpeg
   npm list @ffprobe-installer/ffprobe
   ```

4. **File permissions:**
   - Đảm bảo ffmpeg/ffprobe có quyền execute
   - Kiểm tra antivirus có block không

## 💡 Tips:

- Script sẽ tự động fallback nếu không tìm thấy ffprobe
- Với video tương thích (cùng codec), script vẫn chạy tốt
- Chỉ cần ffprobe khi muốn tối ưu hóa tốc độ ghép video