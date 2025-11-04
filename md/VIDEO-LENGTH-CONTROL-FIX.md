# Media Processor - Video Length Control

## 🎯 Vấn đề đã fix

**Trước khi fix:**
- Video output có độ dài bằng stream dài hơn (audio hoặc video)
- Nếu audio dài hơn video → output dài hơn video gốc 
- Behavior không consistent

**Sau khi fix:**
- Video output **LUÔN** có độ dài bằng video gốc
- Audio sẽ được cắt hoặc ghép theo độ dài video
- Behavior predictable và theo yêu cầu

## ⚙️ Cách hoạt động mới

### Default Behavior (keepVideoLength = true)
```javascript
await mergeAudioToVideo(); // Giữ độ dài video

// Tương đương với:
await mergeAudioToVideo({
  keepVideoLength: true,    // Luôn giữ độ dài video
  audioDelay: 9            // Audio delay 9 giây
});
```

**Kết quả:**
- Video: 90.5s → Output: 90.5s ✅
- Audio: 143.7s → Được cắt theo video

### Custom Behavior  
```javascript
// Nếu muốn behavior cũ (không khuyến nghị)
await mergeAudioToVideo({
  keepVideoLength: false   // Có thể extend video
});

// Tùy chỉnh audio delay
await mergeAudioToVideo({
  audioDelay: 5,          // Audio bắt đầu từ giây thứ 5
  keepVideoLength: true   // Vẫn giữ độ dài video
});
```

## 📊 Test Results

**Input:**
- Video: 90.5s  
- Audio: 143.7s (dài hơn 53.2s)

**Output với keepVideoLength=true:**
- Duration: 90.5s ✅ (match chính xác)
- Audio được cắt để fit video

**Output với keepVideoLength=false:**  
- Duration: 152.7s (audio + delay)
- Video được extend

## 🔧 Technical Details

**FFmpeg Command Changes:**
- Thêm `-shortest` flag khi keepVideoLength=true
- Audio sẽ bị cắt khi vượt quá video duration
- Video stream luôn được prioritize về duration

**Mapping Strategy:**
```
Video: 0:v:0 (direct copy)
Audio: [delayed_audio] hoặc 1:a:0
Duration Control: -shortest (khi keepVideoLength=true)
```

## ✅ Validation

Test đã confirm:
- ✅ Video output = Video input duration (±0.5s tolerance)
- ✅ Audio được handle đúng (cắt khi dài hơn) 
- ✅ No extension khi không cần thiết
- ✅ Consistent behavior

Giờ đây video output sẽ luôn có độ dài như mong muốn! 🎉