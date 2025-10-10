// Quick test with only 2 videos to validate fix
import path from "path";
import "../config/ffmpegConfig.js";
import { checkVideoCompatibilityEnhanced } from "../modules/videoCompatibilityEnhanced.js";
import { mergeVideosWithNormalization } from "../modules/videoMerger.js";

console.log("🧪 QUICK FIX VALIDATION TEST");
console.log("============================");

const testFolder = path.join(process.cwd(), "videos");
const videoPaths = [
  path.join(testFolder, "part3.mp4"),  // 30 FPS, 1920x1080
  path.join(testFolder, "part4.mp4")   // 24 FPS, 1280x720
];

const outputPath = path.join(testFolder, `fix_test_${Date.now()}.mp4`);

async function quickTest() {
  console.log("🔍 Running enhanced compatibility check...");
  const compatibility = await checkVideoCompatibilityEnhanced(videoPaths);
  
  console.log("\n🚀 Testing normalization fix...");
  const startTime = Date.now();
  
  try {
    await mergeVideosWithNormalization(videoPaths, outputPath);
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Normalization completed in: ${(duration / 1000).toFixed(2)}s`);
    
    // Quick duration check
    const ffprobePath = path.join(process.cwd(), "node_modules", "@ffprobe-installer", "win32-x64", "ffprobe.exe");
    const { exec } = require('child_process');
    
    exec(`"${ffprobePath}" -v quiet -show_entries format=duration -of csv=p=0 "${outputPath}"`, (error, stdout) => {
      if (!error) {
        const actualDuration = parseFloat(stdout.trim());
        console.log(`📏 Result duration: ${actualDuration.toFixed(2)}s`);
        console.log(`🎯 Expected: ~20.5s`);
        
        if (actualDuration > 60) {
          console.log("🚨 STILL HAS TIMING BUG!");
        } else if (actualDuration > 15 && actualDuration < 25) {
          console.log("✅ TIMING BUG FIXED!");
        } else {
          console.log("⚠️  Unexpected duration");
        }
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n💥 Test failed after ${(duration / 1000).toFixed(2)}s: ${error.message}`);
  }
}

// Run with timeout
const testTimeout = setTimeout(() => {
  console.log("\n⏰ Test timeout! May still have performance issues");
  process.exit(1);
}, 5 * 60 * 1000); // 5 minutes

quickTest()
  .then(() => {
    clearTimeout(testTimeout);
    console.log("\n🎉 Quick test completed!");
    // Don't exit to see duration check
  })
  .catch(error => {
    clearTimeout(testTimeout);
    console.error("\n💥 Quick test failed:", error.message);
    process.exit(1);
  });