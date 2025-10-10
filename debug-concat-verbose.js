import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("🔍 DEEP DEBUG: Kiểm tra lỗi FFmpeg concat");

const videosDir = path.join(process.cwd(), 'videos');
const videoFiles = ['part1.mp4', 'part2.mp4', 'part3.mp4'];
const fileListPath = path.join(process.cwd(), 'debug_concat_list.txt');

// Tạo file list
const fileContent = videoFiles.map((file) => {
  const fullPath = path.join(videosDir, file);
  let processedPath = path.resolve(fullPath).replace(/\\/g, '/').replace(/'/g, "\\'");
  return `file '${processedPath}'`;
}).join("\n");

fs.writeFileSync(fileListPath, fileContent, 'utf8');

console.log("📝 File list content:");
console.log(fileContent);
console.log("");

// Test với verbose output
console.log("🧪 TEST: Concat với verbose output");
const outputDebug = path.join(videosDir, 'debug_concat_verbose.mp4');

try {
  const debugCmd = `"${process.cwd()}\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe" -v info -f concat -safe 0 -probesize 50M -analyzeduration 50M -i "${fileListPath}" -c copy -avoid_negative_ts make_zero -fflags +genpts -max_muxing_queue_size 1024 "${outputDebug}"`;
  
  console.log("Command:", debugCmd);
  console.log("");
  console.log("🔍 FFmpeg output:");
  
  const { stdout, stderr } = await execAsync(debugCmd);
  
  console.log("STDOUT:", stdout);
  console.log("STDERR:", stderr);
  
  // Kiểm tra kết quả
  if (fs.existsSync(outputDebug)) {
    const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format "${outputDebug}"`;
    const { stdout: probeOut } = await execAsync(ffprobeCmd);
    const info = JSON.parse(probeOut);
    
    console.log(`\n📊 RESULT:`);
    console.log(`⏱️ Duration: ${parseFloat(info.format.duration).toFixed(2)}s`);
    console.log(`💾 Size: ${(info.format.size / (1024 * 1024)).toFixed(2)}MB`);
  }
  
} catch (error) {
  console.log("❌ FFmpeg error:", error.message);
  
  // In ra chi tiết lỗi
  if (error.stdout) {
    console.log("\nSTDOUT:", error.stdout);
  }
  if (error.stderr) {
    console.log("\nSTDERR:", error.stderr);
  }
}

// Cleanup
if (fs.existsSync(fileListPath)) {
  fs.unlinkSync(fileListPath);
}

console.log("\n📋 CHI TIẾT VIDEO:");
for (let i = 0; i < videoFiles.length; i++) {
  const file = videoFiles[i];
  const fullPath = path.join(videosDir, file);
  
  try {
    const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format -show_streams "${fullPath}"`;
    const { stdout } = await execAsync(ffprobeCmd);
    const info = JSON.parse(stdout);
    
    const videoStream = info.streams.find(s => s.codec_type === 'video');
    const duration = parseFloat(info.format.duration);
    
    console.log(`${i + 1}. ${file}:`);
    console.log(`   Duration: ${duration.toFixed(2)}s`);
    console.log(`   Codec: ${videoStream?.codec_name}`);
    console.log(`   Profile: ${videoStream?.profile}`);
    console.log(`   Level: ${videoStream?.level}`);
    console.log(`   FPS: ${eval(videoStream?.r_frame_rate || '0')}`);
    console.log(`   Resolution: ${videoStream?.width}x${videoStream?.height}`);
    console.log(`   Pixel Format: ${videoStream?.pix_fmt}`);
    console.log(`   Has B-frames: ${videoStream?.has_b_frames}`);
    console.log("");
    
  } catch (error) {
    console.log(`${i + 1}. ${file}: ERROR - ${error.message}`);
  }
}