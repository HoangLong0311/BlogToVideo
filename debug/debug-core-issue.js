// Debug script để test ghép 3 video gốc
import fs from "fs";
import path from "path";
import "../config/ffmpegConfig.js";
import { addSubtitleToVideoEnhanced } from "../modules/subtitleProcessor.js";
import { checkVideoCompatibilityEnhanced } from "../modules/videoCompatibilityEnhanced.js";
import { mergeVideos, mergeVideosWithNormalization, mergeVideosWithReencode } from "../modules/videoMerger.js";

console.log("🐛 DEBUG: GHÉP 3 VIDEO GỐC VÀ SUBTITLE");
console.log("=======================================");

const testFolder = path.join(process.cwd(), "videos");
const videoPaths = [
  path.join(testFolder, "part1.mp4"),
  path.join(testFolder, "part2.mp4"), 
  path.join(testFolder, "part3.mp4")
];

const subtitlePath = path.join(testFolder, "subtitle.srt");

console.log("📋 Input files:");
videoPaths.forEach((file, idx) => {
  const exists = fs.existsSync(file);
  const size = exists ? (fs.statSync(file).size / 1024 / 1024).toFixed(2) : "N/A";
  console.log(`   ${idx + 1}. ${path.basename(file)}: ${exists ? "✅" : "❌"} (${size}MB)`);
});

const subtitleExists = fs.existsSync(subtitlePath);
console.log(`   📝 ${path.basename(subtitlePath)}: ${subtitleExists ? "✅" : "❌"}`);

if (!subtitleExists || videoPaths.some(p => !fs.existsSync(p))) {
  console.log("❌ Missing required files!");
  process.exit(1);
}

async function debugVideoMerging() {
  try {
    console.log("\n🔍 Step 1: Check video compatibility...");
    const compatibility = await checkVideoCompatibilityEnhanced(videoPaths);
    
    console.log("\n🔄 Step 2: Merge videos...");
    const mergedPath = path.join(testFolder, `debug_merged_${Date.now()}.mp4`);
    
    // Test ghép video với method phù hợp
    if (compatibility.hasFpsMismatch || compatibility.hasTimingIssues) {
      console.log("🔧 Using normalization (timing issues detected)...");
      await mergeVideosWithNormalization(videoPaths, mergedPath);
    } else if (compatibility.needsReencode) {
      console.log("🔄 Using re-encode (compatibility issues)...");
      await mergeVideosWithReencode(videoPaths, mergedPath);
    } else {
      console.log("⚡ Using copy codec (fast)...");
      await mergeVideos(videoPaths, mergedPath);
    }
    
    // Check merged result
    if (fs.existsSync(mergedPath)) {
      const mergedSize = (fs.statSync(mergedPath).size / 1024 / 1024).toFixed(2);
      console.log(`✅ Merged video created: ${path.basename(mergedPath)} (${mergedSize}MB)`);
      
      // Quick duration check với ffprobe
      const ffprobePath = path.join(process.cwd(), "node_modules", "@ffprobe-installer", "win32-x64", "ffprobe.exe");
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync(`"${ffprobePath}" -v quiet -show_entries format=duration -of csv=p=0 "${mergedPath}"`);
        const duration = parseFloat(stdout.trim());
        console.log(`📏 Merged duration: ${duration.toFixed(2)}s`);
        
        // Expected duration từ input videos
        let totalExpected = 0;
        for (const videoPath of videoPaths) {
          const { stdout: durStr } = await execAsync(`"${ffprobePath}" -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`);
          totalExpected += parseFloat(durStr.trim());
        }
        console.log(`🎯 Expected duration: ${totalExpected.toFixed(2)}s`);
        
        if (Math.abs(duration - totalExpected) < 1) {
          console.log("✅ Duration matches - merge successful!");
        } else {
          console.log("⚠️ Duration mismatch - possible timing issue");
        }
        
      } catch (error) {
        console.log("⚠️ Could not check duration:", error.message);
      }
      
      console.log("\n📝 Step 3: Add subtitle...");
      const finalPath = path.join(testFolder, `debug_final_${Date.now()}.mp4`);
      
      try {
        await addSubtitleToVideoEnhanced(mergedPath, subtitlePath, finalPath, 'hardburn');
        
        if (fs.existsSync(finalPath)) {
          const finalSize = (fs.statSync(finalPath).size / 1024 / 1024).toFixed(2);
          console.log(`✅ Final video with subtitle: ${path.basename(finalPath)} (${finalSize}MB)`);
        } else {
          console.log("❌ Final video not created!");
        }
        
      } catch (subtitleError) {
        console.log(`❌ Subtitle error: ${subtitleError.message}`);
        console.log("🔄 Trying embed method...");
        
        try {
          await addSubtitleToVideoEnhanced(mergedPath, subtitlePath, finalPath, 'embed');
          console.log("✅ Embed method successful!");
        } catch (embedError) {
          console.log(`❌ Embed also failed: ${embedError.message}`);
        }
      }
      
    } else {
      console.log("❌ Merged video not created!");
    }
    
  } catch (error) {
    console.error(`💥 Debug failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run debug với timeout
const debugTimeout = setTimeout(() => {
  console.log("\n⏰ DEBUG TIMEOUT!");
  process.exit(1);
}, 10 * 60 * 1000); // 10 minutes

debugVideoMerging()
  .then(() => {
    clearTimeout(debugTimeout);
    console.log("\n🎉 Debug completed!");
  })
  .catch(error => {
    clearTimeout(debugTimeout);
    console.error("\n💥 Debug failed:", error.message);
    process.exit(1);
  });