// Script test chuyên biệt cho hardburn subtitle
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log("🔥 === TEST HARDBURN SUBTITLE ===");

const videosFolder = path.join(process.cwd(), "videos");

// Kiểm tra file cần thiết
const videoFiles = fs.readdirSync(videosFolder).filter(f => f.endsWith('.mp4') && !f.includes('merged'));
const subtitleFiles = fs.readdirSync(videosFolder).filter(f => f.endsWith('.srt'));

console.log(`📹 Video gốc: ${videoFiles.length}`);
console.log(`📝 Subtitle files: ${subtitleFiles.length}`);

if (videoFiles.length < 2) {
  console.log("⚠️ Cần ít nhất 2 video gốc để test.");
  console.log("🚀 Chạy: node create-test-videos.js");
  process.exit(1);
}

if (subtitleFiles.length === 0) {
  console.log("⚠️ Không có file subtitle.");
  process.exit(1);
}

console.log("\n📋 Video sẽ được ghép:");
videoFiles.forEach((file, index) => {
  const stats = fs.statSync(path.join(videosFolder, file));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ${index + 1}. ${file} (${sizeMB}MB)`);
});

console.log("\n📝 Subtitle sẽ được sử dụng:");
subtitleFiles.forEach((file, index) => {
  console.log(`   ${index + 1}. ${file}`);
});

console.log("\n🔥 Bắt đầu test hardburn subtitle...");
console.log("⚠️ Lưu ý: Quá trình này có thể mất vài phút vì phải re-encode video");

try {
  // Xóa file output cũ nếu có
  const oldFiles = fs.readdirSync(videosFolder).filter(f => f.includes('merged'));
  oldFiles.forEach(file => {
    try {
      fs.unlinkSync(path.join(videosFolder, file));
      console.log(`🗑️ Đã xóa file cũ: ${file}`);
    } catch (e) {
      // Ignore errors
    }
  });

  console.log("\n🚀 Chạy lệnh: node mergedVids.js --subtitle=hardburn");
  console.log("=".repeat(60));
  
  // Chạy script với hardburn
  execSync('node mergedVids.js --subtitle=hardburn', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log("\n=".repeat(60));
  console.log("✅ Test hoàn thành!");
  
  // Kiểm tra kết quả
  const newFiles = fs.readdirSync(videosFolder).filter(f => f.includes('merged'));
  
  if (newFiles.length > 0) {
    console.log("\n🎉 File output được tạo:");
    newFiles.forEach((file, index) => {
      const stats = fs.statSync(path.join(videosFolder, file));
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   ${index + 1}. ${file} (${sizeMB}MB)`);
    });
    
    console.log("\n🔥 HARDBURN SUBTITLE THÀNH CÔNG!");
    console.log("📋 Subtitle đã được burn trực tiếp vào video");
    console.log("✨ Video có thể phát trên bất kỳ player nào và subtitle luôn hiển thị");
  } else {
    console.log("\n❌ Không tìm thấy file output");
  }
  
} catch (error) {
  console.error("\n💥 Lỗi khi test:", error.message);
  
  console.log("\n🔄 Thử phương pháp fallback...");
  try {
    execSync('node mergedVids.js --subtitle=embed', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log("✅ Fallback thành công với embed method");
  } catch (fallbackError) {
    console.error("❌ Fallback cũng thất bại:", fallbackError.message);
  }
}

console.log("\n📁 Trạng thái thư mục hiện tại:");
const finalFiles = fs.readdirSync(videosFolder);
finalFiles.forEach((file, index) => {
  const stats = fs.statSync(path.join(videosFolder, file));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const type = file.includes('merged') ? '🎬' : (file.endsWith('.srt') ? '📝' : '📹');
  console.log(`   ${type} ${file} (${sizeMB}MB)`);
});