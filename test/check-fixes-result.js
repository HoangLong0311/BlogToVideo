// Script kiểm tra kết quả fixes
import fs from "fs";
import path from "path";

console.log("🔍 KIỂM TRA KẾT QUẢ FIXES");
console.log("==========================");

const testFolder = path.join(process.cwd(), "videos");

// List all files
console.log("\n📁 Files trong videos folder:");
const files = fs.readdirSync(testFolder);
files.forEach(file => {
  const filePath = path.join(testFolder, file);
  const stats = fs.statSync(filePath);
  const size = (stats.size / 1024 / 1024).toFixed(2);
  const modified = stats.mtime.toLocaleString();
  
  console.log(`   ${file}`);
  console.log(`      Size: ${size}MB`);
  console.log(`      Modified: ${modified}`);
  
  // Check for merged videos
  if (file.includes('merged_video')) {
    console.log(`      🎬 MERGED VIDEO DETECTED!`);
    
    // Quick duration check would go here if we had ffprobe
    if (parseFloat(size) > 100) {
      console.log(`      ⚠️  Large file - possible timing bug (${size}MB)`);
    } else if (parseFloat(size) < 50) {
      console.log(`      ✅ Normal size - likely fixed (${size}MB)`);
    }
  }
  
  // Check for subtitle files
  if (file.includes('test_') && (file.includes('.srt') || file.includes('.mp4'))) {
    console.log(`      🧪 TEST FILE from enhanced processor`);
  }
  
  console.log("");
});

// Check for temp directories
const tempDir = path.join(testFolder, '.temp_subtitle');
if (fs.existsSync(tempDir)) {
  console.log("📁 Temp subtitle directory exists:");
  const tempFiles = fs.readdirSync(tempDir);
  tempFiles.forEach(file => {
    console.log(`   🗑️ Temp file: ${file}`);
  });
} else {
  console.log("✅ No temp directories left (good cleanup)");
}

// Summary
console.log("\n📊 SUMMARY:");
const mergedFiles = files.filter(f => f.includes('merged_video'));
const testFiles = files.filter(f => f.includes('test_'));

console.log(`   📹 Merged videos: ${mergedFiles.length}`);
console.log(`   🧪 Test files: ${testFiles.length}`);
console.log(`   📋 Total files: ${files.length}`);

if (mergedFiles.length > 0) {
  console.log("\n🎯 Latest merged video:");
  const latest = mergedFiles[mergedFiles.length - 1];
  const latestPath = path.join(testFolder, latest);
  const latestStats = fs.statSync(latestPath);
  const latestSize = (latestStats.size / 1024 / 1024).toFixed(2);
  
  console.log(`   File: ${latest}`);
  console.log(`   Size: ${latestSize}MB`);
  console.log(`   Time: ${latestStats.mtime.toLocaleString()}`);
  
  // Predict if timing bug is fixed
  if (parseFloat(latestSize) > 100) {
    console.log(`   🚨 POTENTIAL TIMING BUG! (${latestSize}MB is too large)`);
  } else if (parseFloat(latestSize) < 50) {
    console.log(`   ✅ TIMING BUG LIKELY FIXED! (${latestSize}MB is reasonable)`);
  } else {
    console.log(`   ⚠️  Size unclear, need duration check (${latestSize}MB)`);
  }
}

console.log("\n✅ Check completed!");