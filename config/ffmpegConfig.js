import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

// Cấu hình đường dẫn ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Thử import ffprobe-installer nếu có
let ffprobeInstaller = null;
let ffprobeAvailable = false;

try {
  ffprobeInstaller = await import("@ffprobe-installer/ffprobe");
  ffmpeg.setFfprobePath(ffprobeInstaller.default.path);
  ffprobeAvailable = true;
  console.log("✅ FFprobe from installer:", ffprobeInstaller.default.path);
} catch (error) {
  // Nếu không có ffprobe-installer, tìm trong thư mục ffmpeg
  const ffmpegDir = path.dirname(ffmpegInstaller.path);
  const ffprobePath = path.join(ffmpegDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
  
  if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
    ffprobeAvailable = true;
    console.log("✅ FFprobe found with ffmpeg:", ffprobePath);
  } else {
    console.log("⚠️ FFprobe not found. Installing @ffprobe-installer/ffprobe recommended");
    console.log("💡 Run: npm install @ffprobe-installer/ffprobe");
    console.log("🔍 Will try to proceed without detailed video analysis...");
  }
}

export { ffmpeg, ffprobeAvailable };
