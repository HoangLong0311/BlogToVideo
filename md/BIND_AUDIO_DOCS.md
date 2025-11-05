# 🎵 bindAudio Module Documentation

## 📋 **Tổng quan**

Module `bindAudio.js` được tạo để ghép audio vào video với các yêu cầu mặc định:
- **Độ dài video final = độ dài video gốc** 
- **Audio dài hơn → tự động cắt ngắn**
- **Audio ngắn hơn → hết sớm (silent)**
- **Lưu video final vào folder videos**

## 📁 **Vị trí**: `./modules/bindAudio.js`

## 🚀 **Cách sử dụng**

### **Import Module**
```javascript
import audioBinder from './modules/bindAudio.js';
// hoặc
import { AudioBinder, audioBinder } from './modules/bindAudio.js';
```

### **1. Ghép audio cho video cụ thể**
```javascript
// Cơ bản
await audioBinder.bindAudioToVideo('./videos/my_video.mp4');

// Với tùy chọn
await audioBinder.bindAudioToVideo('./videos/my_video.mp4', {
  outputPath: './videos/my_video_with_audio.mp4',
  audioDelay: 9,        // Audio bắt đầu từ giây thứ 9
  audioBitrate: '128k'  // Chất lượng audio
});
```

### **2. Ghép audio bằng tên file**
```javascript
await audioBinder.bindAudioByFileName('intro.mp4', {
  audioDelay: 5,
  outputPath: './videos/intro_final.mp4'
});
```

### **3. Xử lý batch cho tất cả video**
```javascript
const results = await audioBinder.bindAudioToAllVideos({
  audioDelay: 9,
  audioBitrate: '128k'
});

console.log(`Processed ${results.length} videos`);
```

### **4. Tìm video files**
```javascript
const videoFiles = await audioBinder.findVideoFiles();
console.log('Found videos:', videoFiles);
```

### **5. Phân tích trước khi ghép**
```javascript
await audioBinder.analyzeBeforeBinding('./videos/my_video.mp4', './audio/output.mp3');
```

## ⚙️ **Options (Tùy chọn)**

| Option | Type | Default | Mô tả |
|--------|------|---------|--------|
| `audioPath` | string | `'./audio/output.mp3'` | Đường dẫn file audio |
| `outputPath` | string | auto-generated | Đường dẫn output |
| `audioDelay` | number | `0` | Delay audio (giây) |
| `videoCodec` | string | `'copy'` | Codec video |
| `audioCodec` | string | `'aac'` | Codec audio |
| `audioBitrate` | string | `'128k'` | Bitrate audio |

## 🎯 **Tính năng chính**

### ✅ **Auto-detection**
- Tự động tìm video files trong folder `./videos/`
- Loại trừ output files (tránh xử lý lại)
- Hỗ trợ formats: `.mp4`, `.avi`, `.mov`, `.mkv`, `.wmv`

### ✅ **Duration Control**
- Video duration **luôn** điều khiển độ dài final
- Sử dụng `-shortest` flag của FFmpeg
- Audio longer → cut, audio shorter → silent end

### ✅ **Flexible Options**
- Custom audio delay/sync
- Custom output paths
- Quality settings (bitrate, codec)
- Progress tracking

### ✅ **Batch Processing**
- Xử lý nhiều video cùng lúc
- Error handling cho từng file
- Summary report

## 📊 **Ví dụ Integration với ExportVideo.js**

### **Trước (old)**
```javascript
import { mergeAudioToVideo } from './modules/mediaProcessor.js';

await mergeAudioToVideo({
    keepVideoLength: true,
    audioDelay: 9
});
```

### **Sau (new)**
```javascript
import audioBinder from './modules/bindAudio.js';

await audioBinder.bindAudioToVideo('./videos/final_video_with_subtitle.mp4', {
    outputPath: './videos/final_video_with_audio.mp4',
    audioDelay: 9
});
```

## 🔧 **Method Reference**

### **Class Methods**

| Method | Description |
|--------|-------------|
| `findVideoFiles()` | Tìm tất cả video files |
| `bindAudioToVideo(videoPath, options)` | Ghép audio vào 1 video |
| `bindAudioToAllVideos(options)` | Batch ghép tất cả videos |
| `bindAudioByFileName(fileName, options)` | Ghép bằng tên file |
| `analyzeBeforeBinding(videoPath, audioPath)` | Phân tích media |
| `getMediaInfo(filePath)` | Lấy metadata |
| `generateOutputPath(videoPath)` | Tạo output path |

## 📝 **Error Handling**

```javascript
try {
  const result = await audioBinder.bindAudioToVideo('./videos/my_video.mp4');
  console.log('Success:', result);
} catch (error) {
  console.error('Failed:', error.message);
  // Handle specific error cases
}
```

## 🎮 **Testing**

```bash
# Test basic functionality
node test-bind-audio.js

# Test integration 
node test-final-integration.js

# Demo usage examples
node demo-bind-audio.js
```

## 💡 **Best Practices**

1. **Always check file existence** trước khi bind
2. **Use batch processing** cho nhiều files
3. **Set appropriate audio delay** cho sync tốt
4. **Monitor file sizes** để tránh output quá lớn
5. **Use error handling** cho production code

## 🎯 **Use Cases**

- ✅ **Single video binding**: Ghép audio cho 1 video cụ thể
- ✅ **Batch processing**: Ghép audio cho nhiều videos
- ✅ **Production pipeline**: Tích hợp vào ExportVideo.js
- ✅ **Custom workflows**: Flexible options cho nhu cầu đặc biệt
- ✅ **Quality control**: Analysis trước khi ghép

---

## 🎉 **Summary**

Module `bindAudio.js` cung cấp solution hoàn chỉnh và linh hoạt để ghép audio vào video với:
- **Yêu cầu mặc định**: Độ dài theo video gốc
- **Auto-detection**: Tìm files tự động  
- **Batch processing**: Xử lý nhiều files
- **Error handling**: Robust error management
- **Integration ready**: Dễ tích hợp vào ExportVideo.js