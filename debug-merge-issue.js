import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("🔍 DEBUG: Kiểm tra vấn đề merge video");

// Tìm tất cả video trong thư mục
const videosDir = path.join(process.cwd(), 'videos');
const allFiles = fs.readdirSync(videosDir);
const videoFiles = allFiles.filter(file => 
  file.toLowerCase().endsWith('.mp4') && 
  !file.includes('merged') && 
  !file.includes('debug') && 
  !file.includes('test')
);

console.log(`📹 Tìm thấy ${videoFiles.length} video:`);

for (let i = 0; i < videoFiles.length; i++) {
  const file = videoFiles[i];
  const fullPath = path.join(videosDir, file);
  const stats = fs.statSync(fullPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`   ${i + 1}. ${file} (${sizeMB}MB)`);
  
  try {
    // Lấy thông tin chi tiết video
    const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format -show_streams "${fullPath}"`;
    const { stdout } = await execAsync(ffprobeCmd);
    const info = JSON.parse(stdout);
    
    const videoStream = info.streams.find(s => s.codec_type === 'video');
    if (videoStream) {
      const duration = parseFloat(info.format.duration);
      const fps = eval(videoStream.r_frame_rate); // "30/1" -> 30
      const resolution = `${videoStream.width}x${videoStream.height}`;
      
      console.log(`      - Duration: ${duration.toFixed(2)}s`);
      console.log(`      - FPS: ${fps}`);
      console.log(`      - Resolution: ${resolution}`);
      console.log(`      - Codec: ${videoStream.codec_name}`);
    }
  } catch (error) {
    console.log(`      - ERROR: Không thể đọc metadata: ${error.message}`);
  }
  console.log("");
}

// Tính tổng duration
console.log("📊 THỐNG KÊ:");
let totalDuration = 0;
let totalSize = 0;

for (const file of videoFiles) {
  const fullPath = path.join(videosDir, file);
  const stats = fs.statSync(fullPath);
  totalSize += stats.size;
  
  try {
    const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format "${fullPath}"`;
    const { stdout } = await execAsync(ffprobeCmd);
    const info = JSON.parse(stdout);
    const duration = parseFloat(info.format.duration);
    totalDuration += duration;
  } catch (error) {
    console.log(`⚠️ Không thể đọc duration của ${file}`);
  }
}

const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
console.log(`📹 Tổng duration dự kiến: ${totalDuration.toFixed(2)}s`);
console.log(`💾 Tổng size: ${totalSizeMB}MB`);

// Kiểm tra file merge gần nhất
const mergedFiles = allFiles.filter(file => file.includes('merged') && file.endsWith('.mp4'));
if (mergedFiles.length > 0) {
  console.log("\n🔍 KIỂM TRA FILE MERGED GẦN NHẤT:");
  
  // Sắp xếp theo thời gian tạo, lấy file mới nhất
  const mergedFilesWithTime = mergedFiles.map(file => {
    const fullPath = path.join(videosDir, file);
    const stats = fs.statSync(fullPath);
    return { file, mtime: stats.mtime, size: stats.size };
  });
  
  mergedFilesWithTime.sort((a, b) => b.mtime - a.mtime);
  const latestMerged = mergedFilesWithTime[0];
  
  console.log(`📁 File mới nhất: ${latestMerged.file}`);
  console.log(`💾 Size: ${(latestMerged.size / (1024 * 1024)).toFixed(2)}MB`);
  
  try {
    const fullPath = path.join(videosDir, latestMerged.file);
    const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format "${fullPath}"`;
    const { stdout } = await execAsync(ffprobeCmd);
    const info = JSON.parse(stdout);
    
    const actualDuration = parseFloat(info.format.duration);
    console.log(`⏱️ Duration thực tế: ${actualDuration.toFixed(2)}s`);
    console.log(`📊 So sánh:`);
    console.log(`   - Dự kiến: ${totalDuration.toFixed(2)}s`);
    console.log(`   - Thực tế: ${actualDuration.toFixed(2)}s`);
    console.log(`   - Chênh lệch: ${(actualDuration - totalDuration).toFixed(2)}s`);
    
    if (Math.abs(actualDuration - totalDuration) > 1) {
      console.log("🚨 PHÁT HIỆN VẤN ĐỀ: Duration không khớp!");
      if (actualDuration < totalDuration * 0.5) {
        console.log("   Có thể chỉ merge được video đầu tiên");
      }
    } else {
      console.log("✅ Duration khớp - merge thành công");
    }
    
  } catch (error) {
    console.log(`❌ Không thể đọc info file merged: ${error.message}`);
  }
}

console.log("\n🔧 KIỂM TRA CONCAT FILE LIST:");
// Tạo file list test
const testListFile = path.join(process.cwd(), 'debug_file_list.txt');
const videoPaths = videoFiles.map(file => path.join(videosDir, file));

try {
  const fileContent = videoPaths.map((file) => {
    let processedPath = path.resolve(file).replace(/\\/g, '/').replace(/'/g, "\\'");
    return `file '${processedPath}'`;
  }).join("\n");
  
  fs.writeFileSync(testListFile, fileContent, 'utf8');
  console.log("📝 Tạo file list test:");
  console.log(fileContent);
  
  // Cleanup
  fs.unlinkSync(testListFile);
  
} catch (error) {
  console.log(`❌ Lỗi tạo file list: ${error.message}`);
}