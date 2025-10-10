// Test script để kiểm tra hiệu suất ghép video
import path from "path";
import "../config/ffmpegConfig.js";
import { mergeVideos, mergeVideosWithReencode } from "../modules/videoMerger.js";
import { findVideoFiles } from "../utils/fileUtils.js";

console.log("🧪 TEST HIỆU SUẤT GHÉP VIDEO");
console.log("===============================");

const testFolder = path.join(process.cwd(), "videos");
const videoPaths = findVideoFiles(testFolder);

if (videoPaths.length < 2) {
  console.log("❌ Cần ít nhất 2 video để test");
  process.exit(1);
}

console.log(`📹 Tìm thấy ${videoPaths.length} video:`);
videoPaths.forEach((file, idx) => {
  console.log(`   ${idx + 1}. ${path.basename(file)}`);
});

async function testPerformance() {
  const startTime = Date.now();
  const outputPath = path.join(testFolder, `test_merge_${Date.now()}.mp4`);
  
  try {
    console.log("\n⚡ Test phương pháp copy codec...");
    const copyStart = Date.now();
    
    await mergeVideos(videoPaths.slice(0, 2), outputPath); // Test với 2 video đầu
    
    const copyTime = Date.now() - copyStart;
    console.log(`✅ Copy codec hoàn thành trong: ${(copyTime / 1000).toFixed(2)}s`);
    
  } catch (error) {
    console.log(`❌ Copy codec thất bại: ${error.message}`);
    
    try {
      console.log("\n🔄 Test phương pháp re-encode...");
      const reencodeStart = Date.now();
      
      await mergeVideosWithReencode(videoPaths.slice(0, 2), outputPath);
      
      const reencodeTime = Date.now() - reencodeStart;
      console.log(`✅ Re-encode hoàn thành trong: ${(reencodeTime / 1000).toFixed(2)}s`);
      
    } catch (reencodeError) {
      console.log(`❌ Re-encode cũng thất bại: ${reencodeError.message}`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`\n🏃 Tổng thời gian test: ${(totalTime / 1000).toFixed(2)}s`);
}

// Chạy test với timeout tổng thể
const testTimeout = setTimeout(() => {
  console.log("\n⏰ TEST TIMEOUT! Có vấn đề về hiệu suất nghiêm trọng");
  process.exit(1);
}, 5 * 60 * 1000); // 5 phút timeout

testPerformance()
  .then(() => {
    clearTimeout(testTimeout);
    console.log("\n✅ Test hoàn thành!");
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(testTimeout);
    console.error("\n💥 Test thất bại:", error.message);
    process.exit(1);
  });