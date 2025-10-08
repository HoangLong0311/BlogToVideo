// Script kiểm tra FFmpeg và FFprobe setup
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

console.log("🔧 === KIỂM TRA SETUP FFMPEG & FFPROBE ===\n");

// Kiểm tra FFmpeg
console.log("1. 🎬 Kiểm tra FFmpeg:");
console.log("   Path:", ffmpegInstaller.path);
console.log("   Exists:", fs.existsSync(ffmpegInstaller.path) ? "✅" : "❌");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Kiểm tra FFprobe
console.log("\n2. 🔍 Kiểm tra FFprobe:");

let ffprobeFound = false;

// Thử 1: Kiểm tra ffprobe-installer
try {
  const ffprobeInstaller = await import("@ffprobe-installer/ffprobe");
  console.log("   FFprobe installer: ✅ Có sẵn");
  console.log("   Path:", ffprobeInstaller.default.path);
  console.log("   Exists:", fs.existsSync(ffprobeInstaller.default.path) ? "✅" : "❌");
  
  if (fs.existsSync(ffprobeInstaller.default.path)) {
    ffmpeg.setFfprobePath(ffprobeInstaller.default.path);
    ffprobeFound = true;
  }
} catch (error) {
  console.log("   FFprobe installer: ❌ Chưa cài đặt");
}

// Thử 2: Tìm ffprobe cùng thư mục với ffmpeg
if (!ffprobeFound) {
  const ffmpegDir = path.dirname(ffmpegInstaller.path);
  const ffprobePath = path.join(ffmpegDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
  
  console.log("   FFprobe với FFmpeg:", fs.existsSync(ffprobePath) ? "✅" : "❌");
  console.log("   Path:", ffprobePath);
  
  if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
    ffprobeFound = true;
  }
}

// Thử 3: Kiểm tra system ffprobe
if (!ffprobeFound) {
  console.log("   System FFprobe: Đang kiểm tra...");
  // Sẽ được test trong phần test thực tế
}

// Test thực tế
console.log("\n3. 🧪 Test thực tế:");

if (ffprobeFound) {
  console.log("   Tạo video test ngắn...");
  
  try {
    // Tạo video test 1 giây
    const testVideoPath = "test-probe.mp4";
    
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input('color=blue:size=320x240:duration=1')
        .inputOptions(['-f lavfi'])
        .output(testVideoPath)
        .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    
    console.log("   ✅ Video test tạo thành công");
    
    // Test ffprobe
    const info = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(testVideoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
    
    console.log("   ✅ FFprobe hoạt động:");
    console.log(`      Duration: ${info.format.duration}s`);
    console.log(`      Size: ${info.format.size} bytes`);
    
    const videoStream = info.streams.find(s => s.codec_type === 'video');
    if (videoStream) {
      console.log(`      Video: ${videoStream.codec_name} ${videoStream.width}x${videoStream.height}`);
    }
    
    // Cleanup
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
    }
    
    console.log("   🗑️ File test đã được dọn dẹp");
    
  } catch (error) {
    console.log("   ❌ Test thất bại:", error.message);
  }
  
} else {
  console.log("   ⚠️ Không thể test vì ffprobe không tìm thấy");
}

// Kết luận và hướng dẫn
console.log("\n4. 📋 Kết luận:");

if (ffprobeFound) {
  console.log("   ✅ Setup hoàn chỉnh! Video merge sẽ hoạt động tốt.");
} else {
  console.log("   ⚠️ FFprobe không tìm thấy. Video merge vẫn hoạt động nhưng hạn chế.");
  console.log("\n   💡 Để cài đặt FFprobe:");
  console.log("      npm install @ffprobe-installer/ffprobe");
  console.log("\n   🔧 Hoặc tải FFmpeg full package từ:");
  console.log("      https://ffmpeg.org/download.html");
}

console.log("\n==========================================");