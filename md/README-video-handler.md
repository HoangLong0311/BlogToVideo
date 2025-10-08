# 📁 Cấu trúc mới của Video Handler

## 🎯 Tổng quan:
File `mergedVids.js` đã được tách thành nhiều module nhỏ và đổi tên file chính thành `handleVideo.js` để dễ dàng bảo trì và sửa lỗi.

## 📂 Cấu trúc thư mục:

```
Blog/
├── handleVideo.js              # File chính (entry point)
├── config/
│   └── ffmpegConfig.js        # Cấu hình FFmpeg và FFprobe
├── modules/
│   ├── videoCompatibility.js  # Kiểm tra tương thích video
│   ├── videoMerger.js         # Ghép video cơ bản (copy + re-encode)
│   ├── batchProcessor.js      # Xử lý batch cho nhiều video
│   └── subtitleProcessor.js   # Xử lý gắn subtitle
└── utils/
    ├── fileUtils.js           # Utility functions (tìm file, tạo tên output)
    └── errorHandler.js        # Xử lý lỗi và hiển thị help
```

## 🔧 Chi tiết từng module:

### 1. **handleVideo.js** (File chính)
- Entry point của ứng dụng
- Điều phối các module khác
- Xử lý command line arguments
- Logic chính của workflow

### 2. **config/ffmpegConfig.js**
- Cấu hình đường dẫn FFmpeg và FFprobe
- Auto-detect FFprobe từ nhiều nguồn
- Export ffmpeg instance và ffprobeAvailable flag

### 3. **modules/videoCompatibility.js**
- Kiểm tra codec, resolution, fps của video
- Đề xuất phương pháp ghép phù hợp
- Fallback khi không có FFprobe

### 4. **modules/videoMerger.js**
- `mergeVideos()`: Ghép video với copy codec (nhanh)
- `mergeVideosWithReencode()`: Ghép video với re-encode (tương thích)
- Xử lý timeout và cleanup

### 5. **modules/batchProcessor.js**
- `mergeVideosInBatches()`: Chia video thành batch nhỏ
- Xử lý nhiều video (>10) hoặc dung lượng lớn (>5GB)
- Cleanup temp files

### 6. **modules/subtitleProcessor.js**
- `addSubtitleToVideo()`: Gắn subtitle với 3 phương pháp
- Hardburn, embed, sidecar
- Multiple fallback strategies

### 7. **utils/fileUtils.js**
- `findVideoFiles()`: Tìm video trong thư mục
- `findSubtitleFiles()`: Tìm subtitle trong thư mục
- `generateOutputName()`: Tạo tên file output với timestamp
- `cleanupTempFile()`: Dọn dẹp file tạm

### 8. **utils/errorHandler.js**
- `handleVideoError()`: Phân tích và gợi ý khắc phục lỗi
- `showHelp()`: Hiển thị hướng dẫn sử dụng

## 🚀 Cách sử dụng:

### Chạy file mới:
```bash
# Thay vì: node mergedVids.js
node handleVideo.js

# Với các tùy chọn:
node handleVideo.js --folder=path/to/videos
node handleVideo.js --subtitle=hardburn
node handleVideo.js --help
```

### Import trong code khác:
```javascript
// Import từng module theo nhu cầu
import { mergeVideos } from "./modules/videoMerger.js";
import { checkVideoCompatibility } from "./modules/videoCompatibility.js";
import { findVideoFiles } from "./utils/fileUtils.js";
```

## ✅ Lợi ích của cấu trúc mới:

### 🔧 **Dễ bảo trì:**
- Mỗi module có chức năng rõ ràng
- Sửa lỗi chỉ cần tìm đúng file
- Test từng module riêng biệt

### 📝 **Dễ đọc code:**
- File nhỏ, logic tập trung
- Import/export rõ ràng
- Tách biệt concerns

### 🔄 **Dễ mở rộng:**
- Thêm tính năng mới không ảnh hưởng code cũ
- Reuse modules trong project khác
- Plugin architecture

### 🐛 **Dễ debug:**
- Lỗi xuất hiện ở module cụ thể
- Stack trace rõ ràng hơn
- Có thể test từng function riêng

## 📋 Migration Guide:

### Nếu đang sử dụng `mergedVids.js`:
1. **Immediate:** Dùng `handleVideo.js` thay thế trực tiếp
2. **Code integration:** Import các module riêng thay vì toàn bộ file

### Backward compatibility:
- Tất cả command line options giữ nguyên
- Output format không đổi
- Workflow logic không đổi

## 🧪 Testing:

### Test từng module:
```javascript
// Test video merger
import { mergeVideos } from "./modules/videoMerger.js";
// Test compatibility check
import { checkVideoCompatibility } from "./modules/videoCompatibility.js";
```

### Test integration:
```bash
# Test full workflow
node handleVideo.js --folder=test-videos

# Test error handling
node handleVideo.js --folder=nonexistent
```

## 📈 Performance:

- **Load time**: Chỉ import module cần thiết
- **Memory**: Garbage collection tốt hơn với module nhỏ
- **Maintainability**: Hotfix nhanh chóng từng module

## 🔮 Future plans:

- **Plugin system**: Thêm custom processors
- **Config file**: External configuration
- **API mode**: Expose as REST API
- **CLI improvements**: Interactive mode