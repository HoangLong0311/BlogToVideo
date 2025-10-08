// Test script để kiểm tra các cải thiện trong mergedVids.js
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

console.log("🧪 === TEST SCRIPT CHO MERGE VIDEO IMPROVEMENTS ===");

// Tạo test videos giả để kiểm tra
async function createTestVideos() {
  const testFolder = path.join(process.cwd(), "test-videos");
  
  if (!fs.existsSync(testFolder)) {
    fs.mkdirSync(testFolder, { recursive: true });
  }

  console.log("🎬 Tạo 3 video test...");
  
  const videoPromises = [];
  
  for (let i = 1; i <= 3; i++) {
    const outputPath = path.join(testFolder, `test-video-${i}.mp4`);
    
    if (fs.existsSync(outputPath)) {
      console.log(`   ✅ Video ${i} đã tồn tại: ${path.basename(outputPath)}`);
      continue;
    }
    
    const promise = new Promise((resolve, reject) => {
      ffmpeg()
        .input('color=red:size=320x240:duration=3')
        .inputOptions(['-f lavfi'])
        .output(outputPath)
        .outputOptions([
          '-c:v libx264',
          '-r 30',
          '-pix_fmt yuv420p'
        ])
        .on('start', () => {
          console.log(`   🎬 Tạo video test ${i}...`);
        })
        .on('end', () => {
          console.log(`   ✅ Video ${i} hoàn thành: ${path.basename(outputPath)}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.log(`   ❌ Lỗi tạo video ${i}:`, err.message);
          reject(err);
        })
        .run();
    });
    
    videoPromises.push(promise);
  }
  
  if (videoPromises.length > 0) {
    await Promise.all(videoPromises);
  }
  
  return testFolder;
}

// Test compatibility check function
async function testCompatibilityCheck() {
  try {
    const testFolder = await createTestVideos();
    const videoPaths = fs.readdirSync(testFolder)
      .filter(file => file.endsWith('.mp4'))
      .map(file => path.join(testFolder, file));
    
    console.log("\n🔍 Test kiểm tra tương thích video:");
    console.log(`📊 Tìm thấy ${videoPaths.length} video test`);
    
    // Import function từ mergedVids.js để test
    // (Thực tế cần export function để test được)
    console.log("✅ Test videos đã sẵn sàng tại:", testFolder);
    console.log("👉 Bây giờ có thể chạy: node mergedVids.js --folder=" + testFolder);
    
  } catch (error) {
    console.error("❌ Lỗi test:", error.message);
  }
}

// Chạy test
testCompatibilityCheck();