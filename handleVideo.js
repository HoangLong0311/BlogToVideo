// Import cấu hình FFmpeg
import "./config/ffmpegConfig.js";

// Import các modules
import fs from "fs";
import path from "path";
import { mergeVideosInBatches } from "./modules/batchProcessor.js";
import { addSubtitleToVideoEnhanced } from "./modules/subtitleProcessor.js";
import { checkVideoCompatibilityEnhanced } from "./modules/videoCompatibilityEnhanced.js";
import { mergeVideos, mergeVideosWithNormalization, mergeVideosWithReencode } from "./modules/videoMerger.js";
import { handleVideoError, showHelp } from "./utils/errorHandler.js";
import { findSubtitleFiles, findVideoFiles, generateOutputName } from "./utils/fileUtils.js";

console.log("🎬 === CÔNG CỤ GHÉP VIDEO & GẮN SUBTITLE ===");
console.log("📋 Hướng dẫn sử dụng:");
console.log("   1. Đặt tất cả video cần ghép vào thư mục 'videos'");
console.log("   2. Đặt file subtitle (.srt) vào cùng thư mục (tùy chọn)");
console.log("   3. Chạy script này");
console.log("   4. Video đã ghép (và có subtitle) sẽ được lưu trong cùng thư mục");
console.log("==========================================\n");

async function main(customFolder = null, subtitleMethod = 'hardburn', forceNormalize = false) {
  const folder = customFolder ? path.resolve(customFolder) : path.join(process.cwd(), "videos");
  console.log(`🔍 Tìm kiếm video trong thư mục: ${folder}`);
  
  const videoPaths = findVideoFiles(folder);
  const subtitlePaths = findSubtitleFiles(folder);
  
  if (videoPaths.length === 0) {
    console.log("⚠️ Không tìm thấy video nào trong thư mục!");
    console.log("📝 Hãy đặt các file video vào thư mục 'videos'");
    return;
  }

  if (videoPaths.length < 2) {
    console.log("⚠️ Cần ít nhất 2 video để ghép!");
    console.log(`📊 Tìm thấy: ${videoPaths.length} video`);
    videoPaths.forEach((path, index) => {
      console.log(`   ${index + 1}. ${path.split('\\').pop()}`);
    });
    return;
  }

  // Kiểm tra subtitle
  let subtitlePath = null;
  if (subtitlePaths.length > 0) {
    subtitlePath = subtitlePaths[0]; // Sử dụng subtitle đầu tiên tìm thấy
    console.log(`📝 Tìm thấy subtitle: ${subtitlePath.split('\\').pop()}`);
  } else {
    console.log(`📝 Không tìm thấy file subtitle (.srt, .ass, .ssa, .vtt)`);
  }

  const outputPath = generateOutputName(folder, false);
  
  console.log(`📹 Sẽ ghép ${videoPaths.length} video:`);
  videoPaths.forEach((path, index) => {
    const fileName = path.split('\\').pop();
    const stats = fs.statSync(path);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   ${index + 1}. ${fileName} (${sizeMB}MB)`);
  });
  
  console.log(`💾 Output: ${outputPath.split('\\').pop()}`);

  try {
    console.log("🚀 Bắt đầu ghép video...");
    let finalOutputPath = outputPath;
    
    // Bước 0: Kiểm tra tương thích video (Enhanced)
    const compatibility = await checkVideoCompatibilityEnhanced(videoPaths);
    
    // Bước 1: Quyết định phương pháp ghép dựa trên tương thích (TIMING SAFETY FIRST!)
    const totalSizeMB = compatibility.infos.reduce((sum, info) => sum + (info.size / (1024 * 1024)), 0);
    const shouldUseBatch = videoPaths.length > 10 || totalSizeMB > 5000;
    
    if (forceNormalize) {
      console.log("🔧 Force normalize mode - sử dụng chuẩn hóa format để khắc phục timing issues...");
      await mergeVideosWithNormalization(videoPaths, outputPath);
    } else if (shouldUseBatch) {
      console.log(`📦 Số lượng video lớn (${videoPaths.length}) hoặc dung lượng lớn (${totalSizeMB.toFixed(2)}MB)`);
      console.log("📦 Sử dụng phương pháp batch processing...");
      await mergeVideosInBatches(videoPaths, outputPath, 5);
    } else if (compatibility.hasFpsMismatch || compatibility.hasTimingIssues) {
      // CRITICAL: FPS/Timing issues MUST use normalization to avoid 4.5-hour bug
      console.log("🚨 CRITICAL TIMING ISSUES DETECTED!");
      console.log("🔧 Using normalization to prevent 4.5-hour duration bug...");
      await mergeVideosWithNormalization(videoPaths, outputPath);
    } else if (compatibility.needsReencode || compatibility.hasResolutionMismatch) {
      console.log("🔄 Using re-encode for compatibility...");
      await mergeVideosWithReencode(videoPaths, outputPath);
    } else {
      console.log("⚡ Using copy codec (videos are compatible)...");
      try {
        await mergeVideos(videoPaths, outputPath);
      } catch (copyError) {
        console.log("⚠️  Copy codec failed, fallback to re-encode...");
        try {
          await mergeVideosWithReencode(videoPaths, outputPath);
        } catch (reencodeError) {
          console.log("🔧 Re-encode failed, using normalization (safest)...");
          await mergeVideosWithNormalization(videoPaths, outputPath);
        }
      }
    }
    
    // Hiển thị thông tin file đã ghép
    const mergedStats = fs.statSync(outputPath);
    const mergedSizeMB = (mergedStats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Ghép video hoàn thành: ${outputPath.split('\\').pop()} (${mergedSizeMB}MB)`);
    
    // Bước 2: Gắn subtitle nếu có
    if (subtitlePath) {
      const subtitleOutputPath = generateOutputName(folder, true);
      console.log(`\n📝 Bắt đầu gắn subtitle (phương pháp: ${subtitleMethod})...`);
      
      await addSubtitleToVideoEnhanced(outputPath, subtitlePath, subtitleOutputPath, subtitleMethod);
      
      // Hiển thị thông tin file có subtitle
      const subtitleStats = fs.statSync(subtitleOutputPath);
      const subtitleSizeMB = (subtitleStats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ File với subtitle: ${subtitleOutputPath.split('\\').pop()} (${subtitleSizeMB}MB)`);
      
      finalOutputPath = subtitleOutputPath;
      
      // Tùy chọn: Xóa file trung gian (chỉ có video, chưa có subtitle)
      console.log(`🗑️ Bạn có muốn xóa file trung gian không có subtitle không? (${outputPath.split('\\').pop()})`);
    }
    
    // Hiển thị kết quả cuối cùng
    const finalStats = fs.statSync(finalOutputPath);
    const finalSizeMB = (finalStats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n🎉 HOÀN THÀNH! File cuối cùng: ${finalOutputPath.split('\\').pop()} (${finalSizeMB}MB)`);
    
  } catch (err) {
    handleVideoError(err);
  }
}

// Xử lý tham số command line
const args = process.argv.slice(2);
const customFolder = args.find(arg => arg.startsWith('--folder='))?.split('=')[1];
const subtitleMethod = args.find(arg => arg.startsWith('--subtitle='))?.split('=')[1] || 'hardburn';
const forceNormalize = args.includes('--normalize') || args.includes('--fix-timing');
const helpFlag = args.includes('--help') || args.includes('-h');

if (helpFlag) {
  showHelp();
  process.exit(0);
}

// Chạy chương trình chính
if (customFolder) {
  console.log(`📁 Sử dụng thư mục tùy chỉnh: ${customFolder}`);
}

main(customFolder, subtitleMethod, forceNormalize).catch(err => {
  console.error("💥 Lỗi nghiêm trọng:", err.message);
  process.exit(1);
});