// Script test để kiểm tra tính năng subtitle
import fs from "fs";
import path from "path";

const testFolder = path.join(process.cwd(), "videos");

// Tạo thư mục test nếu chưa có
if (!fs.existsSync(testFolder)) {
  fs.mkdirSync(testFolder, { recursive: true });
  console.log("📁 Đã tạo thư mục test:", testFolder);
}

// Copy file subtitle.srt vào thư mục videos để test
const subtitleSource = path.join(process.cwd(), "subtitle.srt");
const subtitleDest = path.join(testFolder, "subtitle.srt");

if (fs.existsSync(subtitleSource)) {
  fs.copyFileSync(subtitleSource, subtitleDest);
  console.log("📋 Đã copy subtitle vào thư mục videos");
} else {
  console.log("⚠️ Không tìm thấy subtitle.srt");
}

console.log("🎬 Bây giờ bạn có thể chạy: node mergedVids.js");
console.log("📝 Đảm bảo có ít nhất 2 video trong thư mục 'videos'");