// Script để dọn dẹp thư mục videos, chỉ giữ lại video gốc
import fs from 'fs';
import path from 'path';

const videosFolder = path.join(process.cwd(), "videos");

console.log("🧹 === DỌN DẸP THỨ MỤC VIDEOS ===");

const allFiles = fs.readdirSync(videosFolder);
console.log(`📁 Tổng số file: ${allFiles.length}`);

// Danh sách file gốc cần giữ lại
const keepFiles = ['part1.mp4', 'part2.mp4', 'part3.mp4', 'subtitle.srt'];

// Danh sách file sẽ xóa
const filesToDelete = allFiles.filter(file => !keepFiles.includes(file));

if (filesToDelete.length === 0) {
  console.log("✅ Thư mục đã sạch, không có file nào cần xóa.");
  process.exit(0);
}

console.log("\n🗑️ Các file sẽ bị xóa:");
filesToDelete.forEach((file, index) => {
  const filePath = path.join(videosFolder, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ${index + 1}. ${file} (${sizeMB}MB)`);
});

console.log("\n📋 Các file sẽ được giữ lại:");
keepFiles.forEach((file, index) => {
  const filePath = path.join(videosFolder, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   ${index + 1}. ${file} (${sizeMB}MB)`);
  }
});

// Xác nhận trước khi xóa
console.log(`\n⚠️ Bạn có chắc chắn muốn xóa ${filesToDelete.length} file không?`);
console.log("💡 Để xác nhận, thêm --confirm vào cuối command");

const args = process.argv.slice(2);
const confirmed = args.includes('--confirm');

if (!confirmed) {
  console.log("\n❌ Chưa xác nhận. Không có file nào bị xóa.");
  console.log("🔧 Chạy lại với: node cleanup.js --confirm");
  process.exit(0);
}

// Thực hiện xóa file
console.log("\n🗑️ Bắt đầu xóa file...");
let deletedCount = 0;

filesToDelete.forEach(file => {
  try {
    const filePath = path.join(videosFolder, file);
    fs.unlinkSync(filePath);
    console.log(`✅ Đã xóa: ${file}`);
    deletedCount++;
  } catch (error) {
    console.log(`❌ Lỗi khi xóa ${file}:`, error.message);
  }
});

console.log(`\n🎉 Hoàn thành! Đã xóa ${deletedCount}/${filesToDelete.length} file.`);

// Hiển thị trạng thái thư mục sau khi dọn dẹp
const remainingFiles = fs.readdirSync(videosFolder);
console.log(`\n📁 Thư mục videos hiện có ${remainingFiles.length} file:`);
remainingFiles.forEach((file, index) => {
  const filePath = path.join(videosFolder, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ${index + 1}. ${file} (${sizeMB}MB)`);
});