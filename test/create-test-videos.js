import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Tạo video test đơn giản
async function createTestVideo(outputPath, duration = 5, text = "Test Video", color = "blue") {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`color=c=${color}:size=640x480:duration=${duration}`)
      .inputOptions(['-f lavfi'])
      .videoFilters([
        `drawtext=text='${text}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2`
      ])
      .outputOptions(['-pix_fmt yuv420p'])
      .on('start', (cmd) => {
        console.log(`🎥 Tạo video test: ${text}...`);
      })
      .on('error', (err) => {
        console.error(`❌ Lỗi tạo video ${text}:`, err.message);
        reject(err);
      })
      .on('end', () => {
        console.log(`✅ Đã tạo video: ${outputPath.split('\\').pop()}`);
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

async function main() {
  const videosFolder = path.join(process.cwd(), "videos");
  
  // Tạo thư mục nếu chưa có
  if (!fs.existsSync(videosFolder)) {
    fs.mkdirSync(videosFolder, { recursive: true });
  }

  console.log("🎬 Tạo video test cho việc ghép...\n");

  try {
    // Tạo 2 video test
    await createTestVideo(
      path.join(videosFolder, "test1.mp4"), 
      3, 
      "Video 1 - Intro", 
      "red"
    );
    
    await createTestVideo(
      path.join(videosFolder, "test2.mp4"), 
      4, 
      "Video 2 - Main Content", 
      "green"
    );

    console.log("\n🎉 Đã tạo xong video test!");
    console.log("📁 Vị trí:", videosFolder);
    console.log("🚀 Bây giờ bạn có thể chạy: node mergedVids.js");
    
  } catch (error) {
    console.error("💥 Lỗi:", error.message);
  }
}

main();