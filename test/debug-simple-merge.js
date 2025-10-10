// Simple debug test cho video merging
import fs from "fs";
import path from "path";
import "../config/ffmpegConfig.js";
import { mergeVideosWithReencode } from "../modules/videoMerger.js";

console.log("🐛 DEBUG TEST - SIMPLE VIDEO MERGE");
console.log("===================================");

const testFolder = path.join(process.cwd(), "videos");
const videoPaths = [
  path.join(testFolder, "part3.mp4"),
  path.join(testFolder, "part4.mp4")
];

// Check files exist
console.log("📋 Kiểm tra files:");
videoPaths.forEach((file, idx) => {
  const exists = fs.existsSync(file);
  const size = exists ? (fs.statSync(file).size / 1024 / 1024).toFixed(2) : "N/A";
  console.log(`   ${idx + 1}. ${path.basename(file)}: ${exists ? "✅" : "❌"} (${size}MB)`);
});

const outputPath = path.join(testFolder, `debug_merge_${Date.now()}.mp4`);

console.log("\n🚀 Bắt đầu debug merge...");
const startTime = Date.now();

mergeVideosWithReencode(videoPaths, outputPath)
  .then(() => {
    const duration = Date.now() - startTime;
    console.log(`\n✅ Debug merge hoàn thành trong: ${(duration / 1000).toFixed(2)}s`);
    
    // Check output file
    if (fs.existsSync(outputPath)) {
      const outputSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
      console.log(`📄 Output file: ${path.basename(outputPath)} (${outputSize}MB)`);
    } else {
      console.log("❌ Output file không tồn tại!");
    }
  })
  .catch(error => {
    const duration = Date.now() - startTime;
    console.error(`\n💥 Debug merge thất bại sau ${(duration / 1000).toFixed(2)}s:`);
    console.error(`   ${error.message}`);
  });