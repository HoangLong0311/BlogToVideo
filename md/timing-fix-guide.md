# 🎬 Khắc phục lỗi Timing trong Video Merge

## 🚨 Vấn đề phổ biến:

### Triệu chứng:
- **Video đầu tiên**: Chạy bình thường
- **Video sau**: Bị tua nhanh, rời rạc
- **Video cuối**: Đứng hình, không phát được

### Nguyên nhân:
1. **Framerate khác nhau**: Video A (30fps), Video B (25fps), Video C (60fps)
2. **Timestamp không đồng bộ**: PTS/DTS timeline bị lệch
3. **Codec khác nhau**: H.264, H.265, VP9 mix
4. **Container format**: MP4, AVI, MOV mix

## ✅ Giải pháp đã implement:

### 1. **Auto-detection và Fallback**
```bash
# Tự động thử các phương pháp:
Copy Codec → Re-encode → Normalization
```

### 2. **Force Normalization Mode**
```bash
# Khi gặp timing issues:
node handleVideo.js --normalize
node handleVideo.js --fix-timing    # alias
```

### 3. **Enhanced FFmpeg Options**

#### Copy Mode (cải thiện):
```bash
-avoid_negative_ts make_zero    # Fix timestamp âm
-fflags +genpts                 # Tạo lại PTS/DTS
-max_muxing_queue_size 4096     # Buffer lớn
-probesize 100M                 # Analyze kỹ hơn
-analyzeduration 100M           # Scan lâu hơn
-async 1                        # A/V sync
-vsync cfr                      # Constant frame rate
```

#### Normalization Mode (mạnh nhất):
```bash
-c:v libx264                    # Force H.264
-c:a aac                        # Force AAC
-crf 18                         # High quality
-preset slow                    # Best quality
-r 30                           # Force 30fps
-g 60                           # GOP = 2 seconds
-keyint_min 30                  # Min keyframe interval
-sc_threshold 0                 # Disable scene cut
-fflags +genpts+igndts          # Generate PTS, ignore DTS
-vsync cfr                      # Constant frame rate
-async 1                        # Perfect A/V sync
-ar 44100 -ac 2                 # Standard audio
-movflags +faststart            # Web optimized
```

## 🔧 Cách sử dụng:

### Automatic (khuyến nghị):
```bash
node handleVideo.js
# Tự động detect và fix
```

### Manual Fix:
```bash
# Khi biết chắc có timing issues:
node handleVideo.js --normalize

# Với subtitle:
node handleVideo.js --normalize --subtitle=hardburn
```

### Test và Debug:
```bash
# Test timing fix:
node test/test-timing-fix.js

# Check FFmpeg setup:
node test/check-ffmpeg-setup.js
```

## 📊 Performance Comparison:

| Method | Speed | Quality | Timing Fix | Use Case |
|--------|-------|---------|------------|----------|
| Copy | 🚀🚀🚀 | 💎💎💎 | ⚠️ | Compatible videos |
| Re-encode | 🚀🚀 | 💎💎 | ✅ | Mixed codecs |
| Normalize | 🚀 | 💎💎💎 | ✅✅✅ | Timing issues |

## 🧪 Test Cases:

### Test 1: Different FPS
```
Video1: 30fps → Video2: 25fps → Video3: 60fps
Expected: All normalized to 30fps CFR
```

### Test 2: Mixed Codecs
```
Video1: H.264 → Video2: H.265 → Video3: VP9
Expected: All re-encoded to H.264
```

### Test 3: Timestamp Issues
```
Video with negative PTS/DTS
Expected: Fixed timestamps, smooth playback
```

## 🐛 Troubleshooting:

### Vẫn bị tua nhanh?
```bash
# Force normalize với highest quality:
node handleVideo.js --normalize --subtitle=sidecar
```

### Audio không đồng bộ?
```bash
# Check original videos:
ffprobe video1.mp4 | grep -E "fps|Duration|Audio"
ffprobe video2.mp4 | grep -E "fps|Duration|Audio"
```

### Vẫn đứng hình?
```bash
# Thử với ít video hơn:
# Chỉ ghép 2 video đầu tiên để test
```

## 💡 Best Practices:

### Chuẩn bị video tốt:
1. **Cùng framerate**: 30fps hoặc 25fps
2. **Cùng resolution**: 1920x1080
3. **Cùng codec**: H.264 + AAC
4. **Cùng container**: MP4

### Workflow khuyến nghị:
1. **Analyze first**: Kiểm tra video info
2. **Auto merge**: Để script tự detect
3. **Manual fix**: Dùng --normalize khi cần
4. **Verify result**: Test video output

### Emergency fixes:
```bash
# Tất cả fail? Thử batch:
node handleVideo.js --normalize --folder=videos-small

# Hoặc chia nhỏ video:
# Ghép từng 2 video một
```

## 🔮 Advanced Options:

### Custom framerate:
```bash
# Edit videoMerger.js, line ~45:
"-r 25",              # 25fps thay vì 30fps
```

### Custom quality:
```bash
# Edit videoMerger.js, line ~40:
"-crf 15",            # Higher quality (larger file)
```

### Custom audio:
```bash
# Edit videoMerger.js, line ~55:
"-ar 48000",          # 48kHz thay vì 44.1kHz
```

## 📈 Expected Results:

### ✅ Success indicators:
- Smooth playback từ đầu đến cuối
- Consistent timing throughout
- Audio/video perfectly synced
- No frame drops or jumps
- Clean transitions between videos

### ❌ Still having issues?
- Check individual video files
- Try with different video combinations
- Consider using video editor instead
- Report issue với video details