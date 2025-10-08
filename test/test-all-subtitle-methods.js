// Script test subtitle với các phương pháp khác nhau
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const videosFolder = path.join(process.cwd(), "videos");

console.log("🧪 === TEST SUBTITLE VỚI CÁC PHƯƠNG PHÁP ===");

// Kiểm tra file có sẵn
const videoFiles = fs.readdirSync(videosFolder).filter(f => f.endsWith('.mp4'));
const subtitleFiles = fs.readdirSync(videosFolder).filter(f => f.endsWith('.srt'));

console.log(`📹 Video files: ${videoFiles.length}`);
console.log(`📝 Subtitle files: ${subtitleFiles.length}`);

if (videoFiles.length < 2) {
  console.log("⚠️ Cần ít nhất 2 video để test. Chạy create-test-videos.js trước.");
  process.exit(1);
}

if (subtitleFiles.length === 0) {
  console.log("⚠️ Không có file subtitle. Đảm bảo có file .srt trong thư mục videos.");
  process.exit(1);
}

const methods = ['embed', 'hardburn', 'sidecar'];

console.log("\n🚀 Bắt đầu test các phương pháp...\n");

for (const method of methods) {
  console.log(`\n📌 Testing method: ${method}`);
  console.log("=".repeat(50));
  
  try {
    const command = `node mergedVids.js --subtitle=${method}`;
    console.log(`🔧 Command: ${command}`);
    
    // Chạy command và hiển thị output
    const output = execSync(command, { 
      encoding: 'utf8', 
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    
    console.log(`✅ Method ${method} completed successfully!`);
    
  } catch (error) {
    console.log(`❌ Method ${method} failed:`, error.message);
  }
  
  console.log("\n" + "=".repeat(50));
  
  // Tạm dừng 2 giây giữa các test
  await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log("\n🎉 Test hoàn thành! Kiểm tra thư mục videos để xem kết quả.");

// Hiển thị danh sách file output
console.log("\n📁 Danh sách file trong thư mục videos:");
const finalFiles = fs.readdirSync(videosFolder);
finalFiles.forEach((file, index) => {
  const stats = fs.statSync(path.join(videosFolder, file));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ${index + 1}. ${file} (${sizeMB}MB)`);
});