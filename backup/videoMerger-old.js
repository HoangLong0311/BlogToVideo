import fs from "fs";
import path from "path";
import { ffmpeg } from "../config/ffmpegConfig.js";
import { cleanupTempFile } from "../utils/fileUtils.js";

// Hàm ghép video với chuẩn hóa format (khuyến nghị cho video có vấn đề)
export async function mergeVideosWithNormalization(videoPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const mergedFileList = path.join(process.cwd(), `file_list_normalize_${Date.now()}.txt`);
    let timeoutId;
    
    try {
      console.log("🔧 Bắt đầu ghép video với chuẩn hóa format...");
      
      // Tạo file list
      const fileContent = videoPaths.map((file) => {
        let processedPath = path.resolve(file).replace(/\\/g, '/').replace(/'/g, "\\'");
        return `file '${processedPath}'`;
      }).join("\n");
      
      fs.writeFileSync(mergedFileList, fileContent, 'utf8');
      
      const command = ffmpeg()
        .input(mergedFileList)
        .inputOptions([
          "-f concat", 
          "-safe 0",
          "-probesize 50M",                  // Giảm probe size (thay vì 200M)
          "-analyzeduration 50M"             // Giảm analyze duration (thay vì 200M)
        ])
        .outputOptions([
          "-c:v libx264",                    // H.264 codec
          "-c:a aac",                        // AAC codec
          "-crf 23",                         // Chất lượng cân bằng (thay vì 18)
          "-preset fast",                    // Tốc độ nhanh hơn (thay vì slow)
          "-r 30",                           // 30fps cố định
          "-g 60",                           // GOP size = 2 giây
          "-keyint_min 30",                  // Min keyframe interval
          "-sc_threshold 0",                 // Disable scene cut detection
          "-avoid_negative_ts make_zero",    // Fix timestamp
          "-fflags +genpts+igndts",          // Generate PTS, ignore DTS
          "-max_muxing_queue_size 1024",     // Giảm buffer size (thay vì 8192)
          "-vsync cfr",                      // Constant frame rate
          "-async 1",                        // A/V sync
          "-ar 44100",                       // 44.1kHz audio
          "-ac 2",                           // Stereo
          "-b:a 128k",                       // Audio bitrate
          "-movflags +faststart",            // Web optimized
          "-threads 0"                       // Sử dụng tối đa CPU cores
        ])
        .on("start", (cmd) => {
          console.log("▶️ Bắt đầu normalize và ghép...");
          console.log("🔧 Command:", cmd);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r🔧 Normalizing: ${Math.round(progress.percent)}%`);
          }
        })
        .on("error", (err) => {
          console.log("\n❌ Lỗi normalize:", err.message);
          cleanupTempFile(mergedFileList);
          reject(err);
        })
        .on("end", () => {
          console.log("\n✅ Normalize và ghép hoàn thành!");
          cleanupTempFile(mergedFileList);
          resolve(outputPath);
        });

      command.save(outputPath);

    } catch (error) {
      cleanupTempFile(mergedFileList);
      reject(error);
    }
  });
}

// Hàm ghép video cơ bản với copy codec
export async function mergeVideos(videoPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const mergedFileList = path.join(process.cwd(), `file_list_${Date.now()}.txt`);
    let timeoutId;

    try {
      console.log(`📊 Chuẩn bị ghép ${videoPaths.length} video...`);
      
      // Kiểm tra tất cả file input có tồn tại không và lấy thông tin
      const videoInfos = [];
      for (let i = 0; i < videoPaths.length; i++) {
        const videoPath = videoPaths[i];
        if (!fs.existsSync(videoPath)) {
          throw new Error(`File không tồn tại: ${videoPath}`);
        }
        
        const stats = fs.statSync(videoPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        videoInfos.push({ path: videoPath, size: sizeMB });
        console.log(`   ${i + 1}/${videoPaths.length}: ${path.basename(videoPath)} (${sizeMB}MB)`);
      }

      // Tạo file list với đường dẫn được xử lý cẩn thận
      const fileContent = videoPaths.map((file) => {
        // Xử lý đường dẫn cho Windows - escape các ký tự đặc biệt
        let processedPath = path.resolve(file);
        
        // Chuyển sang forward slash và escape
        processedPath = processedPath.replace(/\\/g, '/');
        
        // Escape các ký tự đặc biệt cho FFmpeg
        processedPath = processedPath.replace(/'/g, "\\'");
        
        return `file '${processedPath}'`;
      }).join("\n");
      
      fs.writeFileSync(mergedFileList, fileContent, 'utf8');
      console.log("📝 File danh sách được tạo:", path.basename(mergedFileList));
      
      // Debug: In nội dung file list
      console.log("📋 Nội dung file list:");
      fileContent.split('\n').forEach((line, idx) => {
        console.log(`   ${idx + 1}. ${line}`);
      });

      // Cấu hình timeout ngắn hơn và thông minh hơn
      const totalSizeMB = videoInfos.reduce((sum, info) => sum + parseFloat(info.size), 0);
      const estimatedTimeoutMinutes = Math.max(2, Math.min(10, Math.ceil(totalSizeMB / 200))); // 2-10 phút
      const timeoutMs = estimatedTimeoutMinutes * 60 * 1000;
      
      console.log(`⏰ Timeout: ${estimatedTimeoutMinutes} phút (${totalSizeMB.toFixed(2)}MB tổng)`);

      let ffmpegCommand; // Declare command để có thể kill
      
      // Thiết lập timeout với khả năng kill command
      timeoutId = setTimeout(() => {
        console.log("\n⏰ TIMEOUT! Dừng FFmpeg và thử phương pháp khác...");
        if (ffmpegCommand && ffmpegCommand.ffmpegProc && !ffmpegCommand.ffmpegProc.killed) {
          console.log("🔪 Killing FFmpeg process...");
          ffmpegCommand.ffmpegProc.kill('SIGKILL');
        }
        reject(new Error(`Timeout sau ${estimatedTimeoutMinutes} phút`));
      }, timeoutMs);

      // Thử phương pháp copy codec (nhanh nhất)
      ffmpegCommand = ffmpeg()
        .input(mergedFileList)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c copy",
          "-avoid_negative_ts make_zero",    // Xử lý timestamp âm
          "-fflags +genpts",                 // Tạo lại PTS/DTS
          "-max_muxing_queue_size 1024",     // Giảm buffer queue (thay vì 4096)
          "-probesize 50M",                  // Giảm probe size (thay vì 100M)
          "-analyzeduration 50M",            // Giảm analyze duration (thay vì 100M)
          "-async 1",                        // Đồng bộ audio/video
          "-vsync cfr"                       // Constant frame rate
        ])
        .on("start", (cmd) => {
          console.log("▶️ Bắt đầu thực thi FFmpeg...");
          console.log("🔧 Phương pháp: copy codec");
          console.log("🔧 Command:", cmd);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r⏳ Đang xử lý: ${Math.round(progress.percent)}% (copy)`);
          }
        })
        .on("error", (err) => {
          clearTimeout(timeoutId);
          console.log(`\n❌ Lỗi FFmpeg (copy):`, err.message);
          
          // Cleanup
          cleanupTempFile(mergedFileList);
          reject(err);
        })
        .on("end", () => {
          clearTimeout(timeoutId);
          console.log(`\n✅ Ghép video hoàn thành (copy)!`);
          
          // Cleanup
          cleanupTempFile(mergedFileList);
          resolve(outputPath);
        });

      ffmpegCommand.save(outputPath);

    } catch (error) {
      clearTimeout(timeoutId);
      // Cleanup nếu có lỗi
      cleanupTempFile(mergedFileList);
      reject(error);
    }
  });
}

// Hàm ghép video với re-encode (dự phòng khi copy codec thất bại)
export async function mergeVideosWithReencode(videoPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const mergedFileList = path.join(process.cwd(), `file_list_reencode_${Date.now()}.txt`);
    let timeoutId;
    
    try {
      console.log("🔄 Bắt đầu ghép video với re-encode...");
      
      // Tạo file list
      const fileContent = videoPaths.map((file) => {
        let processedPath = path.resolve(file).replace(/\\/g, '/').replace(/'/g, "\\'");
        return `file '${processedPath}'`;
      }).join("\n");
      
      fs.writeFileSync(mergedFileList, fileContent, 'utf8');
      
      const command = ffmpeg()
        .input(mergedFileList)
        .inputOptions([
          "-f concat", 
          "-safe 0",
          "-probesize 50M",                  // Giảm probe size (thay vì 100M)
          "-analyzeduration 50M"             // Giảm analyze duration (thay vì 100M)
        ])
        .outputOptions([
          "-c:v libx264",                    // Re-encode video với H.264
          "-c:a aac",                        // Re-encode audio với AAC
          "-crf 23",                         // Chất lượng tốt
          "-preset fast",                    // Tốc độ nhanh hơn (thay vì medium)
          "-r 30",                           // Frame rate cố định 30fps
          "-g 60",                           // Keyframe interval
          "-avoid_negative_ts make_zero",    // Xử lý timestamp âm
          "-fflags +genpts",                 // Tạo lại PTS/DTS
          "-max_muxing_queue_size 1024",     // Giảm buffer queue (thay vì 4096)
          "-vsync cfr",                      // Constant frame rate
          "-async 1",                        // Đồng bộ audio/video
          "-ar 44100",                       // Audio sample rate cố định
          "-ac 2",                           // Stereo audio
          "-threads 0"                       // Sử dụng tối đa CPU cores
        ])
        .on("start", (cmd) => {
          console.log("▶️ Bắt đầu re-encode...");
          console.log("🔧 Command:", cmd);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r🔄 Re-encoding: ${Math.round(progress.percent)}%`);
          }
        })
        .on("error", (err) => {
          console.log("\n❌ Lỗi re-encode:", err.message);
          
          // Cleanup
          cleanupTempFile(mergedFileList);
          reject(err);
        })
        .on("end", () => {
          console.log("\n✅ Re-encode hoàn thành!");
          
          // Cleanup
          cleanupTempFile(mergedFileList);
          resolve(outputPath);
        });

      command.save(outputPath);

    } catch (error) {
      cleanupTempFile(mergedFileList);
      reject(error);
    }
  });
}