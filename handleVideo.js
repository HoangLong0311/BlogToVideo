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

console.log("🎬 === BẮT ĐẦU GHÉP VIDEO ===");
console.log("📋 Hướng dẫn sử dụng:");
console.log("   1. Đặt tất cả video cần ghép vào thư mục 'videos'");
console.log("   2. Đặt file subtitle (.srt) vào cùng thư mục (tùy chọn)");
console.log("   3. Chạy script này");
console.log("   4. Video đã ghép (và có subtitle) sẽ được lưu trong cùng thư mục");
console.log("==========================================\n");

// Hàm dọn dẹp các file video gốc sau khi ghép
async function cleanupSourceVideos(videoPaths, mergedPath, finalPath, folder) {
  console.log("\n🗑️ === DỌN DẸP FILES ===");
  
  // Tính tổng dung lượng các file gốc
  let totalSourceSize = 0;
  const sourceFiles = [];
  
  videoPaths.forEach(videoPath => {
    const stats = fs.statSync(videoPath);
    totalSourceSize += stats.size;
    sourceFiles.push({
      name: path.basename(videoPath),
      path: videoPath,
      size: (stats.size / (1024 * 1024)).toFixed(2)
    });
  });
  
  const totalSourceSizeMB = (totalSourceSize / (1024 * 1024)).toFixed(2);
  const finalStats = fs.statSync(finalPath);
  const finalSizeMB = (finalStats.size / (1024 * 1024)).toFixed(2);
  
  console.log("📊 Thống kê dung lượng:");
  console.log(`   📹 ${videoPaths.length} file gốc: ${totalSourceSizeMB}MB`);
  console.log(`   🎬 File cuối cùng: ${finalSizeMB}MB`);
  console.log(`   💾 Tiết kiệm: ${(totalSourceSize - finalStats.size > 0 ? '+' : '')}${((finalStats.size - totalSourceSize) / (1024 * 1024)).toFixed(2)}MB`);
  
  console.log("\n📋 Danh sách file sẽ bị xóa:");
  sourceFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.name} (${file.size}MB)`);
  });
  
  // Kiểm tra file trung gian (merged không có subtitle)
  const hasIntermediateFile = mergedPath !== finalPath && fs.existsSync(mergedPath);
  if (hasIntermediateFile) {
    const intermediateStats = fs.statSync(mergedPath);
    const intermediateSizeMB = (intermediateStats.size / (1024 * 1024)).toFixed(2);
    console.log(`   + File trung gian: ${path.basename(mergedPath)} (${intermediateSizeMB}MB)`);
  }
  
  console.log("\n🤔 Bạn có muốn dọn dẹp các file này không?");
  console.log("   [Y] Có - Xóa tất cả file gốc và file trung gian");
  console.log("   [S] Chỉ xóa file gốc - Giữ lại file trung gian");
  console.log("   [N] Không - Giữ lại tất cả");
  
  // Trong môi trường Node.js, chúng ta sẽ thêm tham số command line cho việc này
  // const cleanupMode = process.argv.find(arg => arg.startsWith('--cleanup='))?.split('=')[1] || 'ask';
  
  // if (cleanupMode === 'auto' || cleanupMode === 'yes' || cleanupMode === 'y') {
  //   await performCleanup(sourceFiles, mergedPath, finalPath, hasIntermediateFile, true);
  // } else if (cleanupMode === 'source' || cleanupMode === 's') {
  //   await performCleanup(sourceFiles, mergedPath, finalPath, hasIntermediateFile, false);
  // } else if (cleanupMode === 'no' || cleanupMode === 'n') {
  //   console.log("✅ Giữ lại tất cả file");
  // } else {
  //   console.log("💡 Sử dụng tham số --cleanup=yes/source/no để tự động hóa việc dọn dẹp");
  //   console.log("   Ví dụ: node handleVideo.js --cleanup=yes");
  // }
  
  // Cleanup
  await performCleanup(sourceFiles, mergedPath, finalPath, hasIntermediateFile, true);

}

// Hàm thực hiện dọn dẹp
async function performCleanup(sourceFiles, mergedPath, finalPath, hasIntermediateFile, removeIntermediate) {
  console.log("\n🗑️ Bắt đầu dọn dẹp...");
  
  let deletedCount = 0;
  let deletedSize = 0;
  
  // Xóa các file gốc
  for (const file of sourceFiles) {
    try {
      const stats = fs.statSync(file.path);
      fs.unlinkSync(file.path);
      deletedCount++;
      deletedSize += stats.size;
      console.log(`   ✅ Đã xóa: ${file.name}`);
    } catch (error) {
      console.log(`   ❌ Lỗi xóa ${file.name}: ${error.message}`);
    }
  }
  
  // Xóa file trung gian nếu được yêu cầu
  if (removeIntermediate && hasIntermediateFile) {
    try {
      const stats = fs.statSync(mergedPath);
      fs.unlinkSync(mergedPath);
      deletedSize += stats.size;
      console.log(`   ✅ Đã xóa file trung gian: ${path.basename(mergedPath)}`);
    } catch (error) {
      console.log(`   ❌ Lỗi xóa file trung gian: ${error.message}`);
    }
  }
  
  const deletedSizeMB = (deletedSize / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ Dọn dẹp hoàn thành!`);
  console.log(`   📁 Đã xóa: ${deletedCount} file`);
  console.log(`   💾 Tiết kiệm: ${deletedSizeMB}MB dung lượng`);
  console.log(`   🎬 Chỉ còn lại: ${path.basename(finalPath)}`);
}

async function combineVideo(customFolder = null, subtitleMethod = 'hardburn', forceNormalize = false) {
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
    const shouldUseBatch = videoPaths.length > 15 || totalSizeMB > 5000;
    
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
    
    // Bước 3: Tùy chọn dọn dẹp các file video gốc
    await cleanupSourceVideos(videoPaths, outputPath, finalOutputPath, folder);
    
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

combineVideo(customFolder, subtitleMethod, forceNormalize).catch(err => {
  console.error("💥 Lỗi nghiêm trọng:", err.message);
  process.exit(1);
});

export default combineVideo;