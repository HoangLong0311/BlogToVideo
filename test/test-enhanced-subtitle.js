// Test enhanced subtitle processor
import fs from "fs";
import path from "path";
import "../config/ffmpegConfig.js";
import { addSubtitleToVideoEnhanced } from "../modules/subtitleProcessor.js";

console.log("🧪 ENHANCED SUBTITLE PROCESSOR TEST");
console.log("=====================================");

const testFolder = path.join(process.cwd(), "videos");
const videoPath = path.join(testFolder, "part1.mp4");
const subtitlePath = path.join(testFolder, "subtitle.srt");

// Check test files
console.log("📋 Checking test files:");
console.log(`   Video: ${fs.existsSync(videoPath) ? "✅" : "❌"} ${path.basename(videoPath)}`);
console.log(`   Subtitle: ${fs.existsSync(subtitlePath) ? "✅" : "❌"} ${path.basename(subtitlePath)}`);

if (!fs.existsSync(videoPath) || !fs.existsSync(subtitlePath)) {
  console.log("❌ Missing test files!");
  process.exit(1);
}

async function testSubtitleMethods() {
  const methods = ['hardburn', 'embed', 'sidecar'];
  
  for (const method of methods) {
    console.log(`\n🧪 Testing method: ${method.toUpperCase()}`);
    const outputPath = path.join(testFolder, `test_${method}_${Date.now()}.mp4`);
    
    const startTime = Date.now();
    
    try {
      await addSubtitleToVideoEnhanced(videoPath, subtitlePath, outputPath, method);
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${method.toUpperCase()} completed in: ${(duration / 1000).toFixed(2)}s`);
      
      // Check output
      if (fs.existsSync(outputPath)) {
        const size = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
        console.log(`📄 Output: ${path.basename(outputPath)} (${size}MB)`);
        
        // Check sidecar
        if (method === 'sidecar') {
          const sidecarPath = outputPath.replace('.mp4', '.srt');
          if (fs.existsSync(sidecarPath)) {
            console.log(`📋 Sidecar: ${path.basename(sidecarPath)} ✅`);
          }
        }
      } else {
        console.log("❌ Output file not created!");
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${method.toUpperCase()} failed after ${(duration / 1000).toFixed(2)}s:`);
      console.log(`   ${error.message}`);
    }
  }
}

// Run tests with global timeout
const globalTimeout = setTimeout(() => {
  console.log("\n⏰ GLOBAL TEST TIMEOUT!");
  process.exit(1);
}, 10 * 60 * 1000); // 10 minutes total

testSubtitleMethods()
  .then(() => {
    clearTimeout(globalTimeout);
    console.log("\n🎉 All subtitle tests completed!");
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(globalTimeout);
    console.error("\n💥 Test suite failed:", error.message);
    process.exit(1);
  });