import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("🔧 TEST MANUAL CONCAT:");

// Tạo file list manual
const videosDir = path.join(process.cwd(), 'videos');
const videoFiles = ['part1.mp4', 'part2.mp4', 'part3.mp4'];

const fileListPath = path.join(process.cwd(), 'manual_test_list.txt');

// Tạo file list với đường dẫn tuyệt đối
const fileContent = videoFiles.map((file) => {
  const fullPath = path.join(videosDir, file);
  let processedPath = path.resolve(fullPath).replace(/\\/g, '/').replace(/'/g, "\\'");
  return `file '${processedPath}'`;
}).join("\n");

fs.writeFileSync(fileListPath, fileContent, 'utf8');

console.log("📝 File list content:");
console.log(fileContent);
console.log("");

// Test concat với copy codec
console.log("🧪 TEST 1: Copy codec");
const outputCopy = path.join(videosDir, 'manual_test_copy.mp4');

try {
  const copyCmd = `"${process.cwd()}\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe" -f concat -safe 0 -i "${fileListPath}" -c copy -avoid_negative_ts make_zero -fflags +genpts "${outputCopy}"`;
  
  console.log("Command:", copyCmd);
  
  const { stdout, stderr } = await execAsync(copyCmd);
  console.log("✅ Copy codec thành công!");
  
  // Kiểm tra duration
  const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format "${outputCopy}"`;
  const { stdout: probeOut } = await execAsync(ffprobeCmd);
  const info = JSON.parse(probeOut);
  
  console.log(`⏱️ Duration: ${parseFloat(info.format.duration).toFixed(2)}s`);
  console.log(`💾 Size: ${(info.format.size / (1024 * 1024)).toFixed(2)}MB`);
  
} catch (error) {
  console.log("❌ Copy codec thất bại:", error.message);
}

console.log("");

// Test concat với re-encode
console.log("🧪 TEST 2: Re-encode");
const outputReencode = path.join(videosDir, 'manual_test_reencode.mp4');

try {
  const reencodeCmd = `"${process.cwd()}\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe" -f concat -safe 0 -i "${fileListPath}" -c:v libx264 -c:a aac -crf 23 -preset fast -r 30 -avoid_negative_ts make_zero -fflags +genpts "${outputReencode}"`;
  
  console.log("Command:", reencodeCmd);
  
  const { stdout, stderr } = await execAsync(reencodeCmd);
  console.log("✅ Re-encode thành công!");
  
  // Kiểm tra duration
  const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format "${outputReencode}"`;
  const { stdout: probeOut } = await execAsync(ffprobeCmd);
  const info = JSON.parse(probeOut);
  
  console.log(`⏱️ Duration: ${parseFloat(info.format.duration).toFixed(2)}s`);
  console.log(`💾 Size: ${(info.format.size / (1024 * 1024)).toFixed(2)}MB`);
  
} catch (error) {
  console.log("❌ Re-encode thất bại:", error.message);
}

// Cleanup
if (fs.existsSync(fileListPath)) {
  fs.unlinkSync(fileListPath);
}

console.log("\n🎯 So sánh với dự kiến: 31.45s");