import fs from "fs";
import path from "path";

// Hàm để tìm file subtitle trong thư mục
export function findSubtitleFiles(folder) {
  const subtitleExtensions = ['.srt', '.ass', '.ssa', '.vtt'];
  
  if (!fs.existsSync(folder)) {
    return [];
  }

  const files = fs.readdirSync(folder);
  const subtitleFiles = files
    .filter(file => subtitleExtensions.some(ext => file.toLowerCase().endsWith(ext)))
    .map(file => path.join(folder, file))
    .sort();

  return subtitleFiles;
}

// Hàm để tìm tất cả video trong thư mục
export function findVideoFiles(folder) {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm'];
  
  if (!fs.existsSync(folder)) {
    console.log(`📁 Tạo thư mục: ${folder}`);
    fs.mkdirSync(folder, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(folder);
  const videoFiles = files
    .filter(file => videoExtensions.some(ext => file.toLowerCase().endsWith(ext)))
    .map(file => path.join(folder, file))
    .sort(); // Sắp xếp theo tên file

  return videoFiles;
}

// Hàm tạo tên output dựa trên timestamp
export function generateOutputName(folder, withSubtitle = false) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('.')[0];
  const suffix = withSubtitle ? '_with_subtitle' : '';
  // return path.join(folder, `merged_video${suffix}_${timestamp}.mp4`);
  return path.join(folder, `final_video${suffix}.mp4`);
}

// Hàm cleanup file tạm
export function cleanupTempFile(filePath) {
  if (fs.existsSync(filePath)) {
    try { 
      fs.unlinkSync(filePath); 
    } catch (err) {
      console.log(`⚠️ Không thể xóa file tạm: ${path.basename(filePath)}`);
    }
  }
}

export default function cleanupFileContents(files) {
  files.forEach(file => {
    try {
      fs.writeFileSync(file, '');
      console.log(`🧹 Đã dọn sạch nội dung file: ${file}`);
    } catch (err) {
      console.log(`⚠️ Không thể dọn sạch nội dung file: ${file}`);
    }
  });
}