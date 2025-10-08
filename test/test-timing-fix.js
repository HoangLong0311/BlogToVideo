// Test script để kiểm tra các cải thiện timing fix
import fs from "fs";
import path from "path";

console.log("🧪 === TEST TIMING FIX IMPROVEMENTS ===");

const testVideoFolder = path.join(process.cwd(), "videos");

// Kiểm tra video test có sẵn
if (!fs.existsSync(testVideoFolder)) {
  console.log("❌ Thư mục 'videos' không tồn tại!");
  console.log("📝 Tạo thư mục và đặt video test vào đó");
  process.exit(1);
}

const videoFiles = fs.readdirSync(testVideoFolder)
  .filter(file => ['.mp4', '.avi', '.mov', '.mkv'].some(ext => file.toLowerCase().endsWith(ext)));

console.log(`📊 Tìm thấy ${videoFiles.length} video test:`);
videoFiles.forEach((file, index) => {
  const stats = fs.statSync(path.join(testVideoFolder, file));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ${index + 1}. ${file} (${sizeMB}MB)`);
});

if (videoFiles.length < 2) {
  console.log("⚠️ Cần ít nhất 2 video để test ghép!");
  process.exit(1);
}

console.log("\n🚀 Các phương pháp test:");
console.log("1. Test ghép bình thường:");
console.log("   node handleVideo.js");
console.log("");
console.log("2. Test với normalize (khắc phục timing):");
console.log("   node handleVideo.js --normalize");
console.log("");
console.log("3. Test với fix-timing (alias):");
console.log("   node handleVideo.js --fix-timing");
console.log("");
console.log("4. Test với subtitle và normalize:");
console.log("   node handleVideo.js --normalize --subtitle=hardburn");

console.log("\n📋 Kết quả mong đợi:");
console.log("✅ Video không bị tua nhanh");
console.log("✅ Video không bị đứng hình ở cuối");
console.log("✅ Chuyển cảnh mượt mà");
console.log("✅ Audio/Video đồng bộ");

console.log("\n💡 Nếu vẫn có vấn đề:");
console.log("- Kiểm tra video gốc có framerate khác nhau không");
console.log("- Thử với video ít hơn (2-3 video)");
console.log("- Kiểm tra codec của video gốc");

console.log("\n==============================================");