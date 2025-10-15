import fs from 'fs';
import path from 'path';

// Tạo test files để demo bảo vệ intro.mp4
console.log('🧪 Test bảo vệ file intro.mp4 khi cleanup...');

const videosDir = path.join(process.cwd(), 'videos');
const testContent = Buffer.alloc(1024 * 100, 0); // 100KB fake data

// Tạo intro.mp4 (file được bảo vệ)
const introPath = path.join(videosDir, 'intro.mp4');
fs.writeFileSync(introPath, testContent);
console.log('✅ Tạo intro.mp4 (100KB) - File được bảo vệ');

// Tạo 2 file test khác (sẽ bị xóa)
for (let i = 1; i <= 2; i++) {
  const filename = `test_video${i}.mp4`;
  const filePath = path.join(videosDir, filename);
  
  fs.writeFileSync(filePath, testContent);
  console.log(`✅ Tạo ${filename} (100KB) - Sẽ bị xóa`);
}

console.log('\n📋 Danh sách file hiện có:');
const files = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));
files.forEach((file, index) => {
  const filePath = path.join(videosDir, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const isProtected = file.toLowerCase() === 'intro.mp4' ? '🔒' : '🗑️';
  console.log(`   ${index + 1}. ${file} (${sizeMB}MB) ${isProtected}`);
});

console.log('\n💡 Giờ chạy: node handleVideo.js để test cleanup');
console.log('   - intro.mp4 sẽ được bảo vệ');
console.log('   - test_video1.mp4 và test_video2.mp4 sẽ bị xóa');