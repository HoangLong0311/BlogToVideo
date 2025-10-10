// Quick test hardburn fix
import fs from "fs";
import path from "path";
import "../config/ffmpegConfig.js";
import { addSubtitleToVideoEnhanced } from "../modules/subtitleProcessor.js";

console.log("🧪 QUICK HARDBURN TEST");
console.log("======================");

const testFolder = path.join(process.cwd(), "videos");
const videoPath = path.join(testFolder, "part1.mp4");
const subtitlePath = path.join(testFolder, "subtitle.srt");
const outputPath = path.join(testFolder, `hardburn_test_${Date.now()}.mp4`);

console.log(`📹 Video: ${fs.existsSync(videoPath) ? "✅" : "❌"} ${path.basename(videoPath)}`);
console.log(`📝 Subtitle: ${fs.existsSync(subtitlePath) ? "✅" : "❌"} ${path.basename(subtitlePath)}`);

if (!fs.existsSync(videoPath) || !fs.existsSync(subtitlePath)) {
  console.log("❌ Missing files!");
  process.exit(1);
}

console.log("\n🔥 Testing hardburn with absolute path fix...");

const startTime = Date.now();

addSubtitleToVideoEnhanced(videoPath, subtitlePath, outputPath, 'hardburn')
  .then(() => {
    const duration = Date.now() - startTime;
    console.log(`\n✅ Hardburn test completed in: ${(duration / 1000).toFixed(2)}s`);
    
    if (fs.existsSync(outputPath)) {
      const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
      console.log(`📄 Output: ${path.basename(outputPath)} (${size}MB)`);
    }
  })
  .catch(error => {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Hardburn test failed after ${(duration / 1000).toFixed(2)}s:`);
    console.error(`   ${error.message}`);
  });