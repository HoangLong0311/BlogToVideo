import fs from "fs";
import path from "path";
import { ffmpeg } from "../config/ffmpegConfig.js";
import { cleanupTempFile } from "../utils/fileUtils.js";

// ⚡ Hàm ghép video với copy codec (nhanh nhất)
export async function mergeVideos(videoPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const mergedFileList = path.join(process.cwd(), `file_list_${Date.now()}.txt`);
    let timeoutId;
    let ffmpegCommand;

    try {
      console.log(`📊 Chuẩn bị ghép ${videoPaths.length} video...`);
      
      // Kiểm tra tất cả file input
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

      // Tạo file list
      const fileContent = videoPaths.map((file) => {
        let processedPath = path.resolve(file).replace(/\\/g, '/').replace(/'/g, "\\'");
        return `file '${processedPath}'`;
      }).join("\n");
      
      fs.writeFileSync(mergedFileList, fileContent, 'utf8');
      console.log("📝 File danh sách được tạo:", path.basename(mergedFileList));

      // Cấu hình timeout tối ưu (1-5 phút)
      const totalSizeMB = videoInfos.reduce((sum, info) => sum + parseFloat(info.size), 0);
      const estimatedTimeoutMinutes = Math.max(1, Math.min(5, Math.ceil(totalSizeMB / 300))); // Faster timeout
      const timeoutMs = estimatedTimeoutMinutes * 60 * 1000;
      
      console.log(`⏰ Timeout: ${estimatedTimeoutMinutes} phút (${totalSizeMB.toFixed(2)}MB tổng)`);

      // Enhanced timeout với graceful cleanup
      timeoutId = setTimeout(() => {
        console.log("\n⏰ TIMEOUT! Gracefully stopping FFmpeg...");
        if (ffmpegCommand && ffmpegCommand.ffmpegProc && !ffmpegCommand.ffmpegProc.killed) {
          console.log("🛑 Sending SIGTERM...");
          ffmpegCommand.ffmpegProc.kill('SIGTERM'); // Graceful first
          
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (ffmpegCommand && ffmpegCommand.ffmpegProc && !ffmpegCommand.ffmpegProc.killed) {
              console.log("🔪 Force killing with SIGKILL...");
              ffmpegCommand.ffmpegProc.kill('SIGKILL');
            }
          }, 5000);
        }
        cleanupTempFile(mergedFileList);
        reject(new Error(`Copy codec timeout sau ${estimatedTimeoutMinutes} phút`));
      }, timeoutMs);

      // EMERGENCY FIX: Copy codec với timing safety
      ffmpegCommand = ffmpeg()
        .input(mergedFileList)
        .inputOptions([
          "-f concat", 
          "-safe 0",
          "-probesize 50M",
          "-analyzeduration 50M"
        ])
        .outputOptions([
          "-c copy",                         
          "-avoid_negative_ts make_zero",    
          "-fflags +genpts+igndts",          // Force regenerate timing
          "-max_muxing_queue_size 1024",     
          "-vsync drop",                     // Drop frames instead of CFR (CRITICAL FIX)
          "-async 1",                        
          "-copyts",                         // Copy input timestamps
          "-start_at_zero"                   // Start output at zero
        ])
        .on("start", (cmd) => {
          console.log("▶️ Bắt đầu thực thi FFmpeg...");
          console.log("🔧 Phương pháp: copy codec");
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r⏳ Đang xử lý: ${Math.round(progress.percent)}% (copy)`);
          }
        })
        .on("error", (err) => {
          clearTimeout(timeoutId);
          console.log(`\n❌ Lỗi FFmpeg (copy):`, err.message);
          cleanupTempFile(mergedFileList);
          reject(err);
        })
        .on("end", () => {
          clearTimeout(timeoutId);
          console.log(`\n✅ Ghép video hoàn thành (copy)!`);
          cleanupTempFile(mergedFileList);
          resolve(outputPath);
        });

      ffmpegCommand.save(outputPath);

    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      cleanupTempFile(mergedFileList);
      reject(error);
    }
  });
}

// 🔄 Hàm ghép video với re-encode (ổn định hơn)
export async function mergeVideosWithReencode(videoPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const mergedFileList = path.join(process.cwd(), `file_list_reencode_${Date.now()}.txt`);
    let timeoutId;
    let reencodeCommand;
    
    try {
      console.log("🔄 Bắt đầu ghép video với re-encode...");
      
      // Tạo file list
      const fileContent = videoPaths.map((file) => {
        let processedPath = path.resolve(file).replace(/\\/g, '/').replace(/'/g, "\\'");
        return `file '${processedPath}'`;
      }).join("\n");
      
      fs.writeFileSync(mergedFileList, fileContent, 'utf8');
      
      // Timeout cho re-encode (7 phút - tối ưu)
      const timeoutMs = 7 * 60 * 1000;
      
      timeoutId = setTimeout(() => {
        console.log("\n⏰ TIMEOUT! Gracefully stopping re-encode...");
        if (reencodeCommand && reencodeCommand.ffmpegProc && !reencodeCommand.ffmpegProc.killed) {
          console.log("� Sending SIGTERM to re-encode...");
          reencodeCommand.ffmpegProc.kill('SIGTERM'); // Graceful first
          
          setTimeout(() => {
            if (reencodeCommand && reencodeCommand.ffmpegProc && !reencodeCommand.ffmpegProc.killed) {
              console.log("🔪 Force killing re-encode...");
              reencodeCommand.ffmpegProc.kill('SIGKILL');
            }
          }, 5000);
        }
        cleanupTempFile(mergedFileList);
        reject(new Error(`Re-encode timeout sau 7 phút`));
      }, timeoutMs);
      
      reencodeCommand = ffmpeg()
        .input(mergedFileList)
        .inputOptions([
          "-f concat", 
          "-safe 0",
          "-probesize 50M",
          "-analyzeduration 50M"
        ])
        .outputOptions([
          "-c:v libx264",                    // H.264 video codec
          "-c:a aac",                        // AAC audio codec
          "-crf 23",                         // Good quality
          "-preset fast",                    // Fast encoding (thay vì medium/slow)
          "-r 30",                           // 30fps fixed
          "-g 60",                           // Keyframe interval
          "-avoid_negative_ts make_zero",
          "-fflags +genpts",
          "-max_muxing_queue_size 1024",     // Tối ưu buffer
          "-vsync cfr",
          "-async 1",
          "-ar 44100",                       // 44.1kHz audio
          "-ac 2",                           // Stereo
          "-threads 0",                      // Use all CPU cores
          "-movflags +faststart"             // Web optimization
        ])
        .on("start", (cmd) => {
          console.log("▶️ Bắt đầu re-encode...");
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r🔄 Re-encoding: ${Math.round(progress.percent)}%`);
          }
        })
        .on("error", (err) => {
          clearTimeout(timeoutId);
          console.log("\n❌ Lỗi re-encode:", err.message);
          cleanupTempFile(mergedFileList);
          reject(err);
        })
        .on("end", () => {
          clearTimeout(timeoutId);
          console.log("\n✅ Re-encode hoàn thành!");
          cleanupTempFile(mergedFileList);
          resolve(outputPath);
        });

      reencodeCommand.save(outputPath);

    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      cleanupTempFile(mergedFileList);
      reject(error);
    }
  });
}

// 🔧 Hàm ghép video với normalization (cho video có vấn đề nghiêm trọng)
export async function mergeVideosWithNormalization(videoPaths, outputPath) {
  return new Promise((resolve, reject) => {
    let timeoutId;
    let normalizeCommand;
    
    try {
      console.log("🔧 Bắt đầu ghép video với chuẩn hóa format...");
      
      if (videoPaths.length === 0) {
        throw new Error("Không có video để ghép");
      }
      
      // Timeout cho normalization (8 phút - tối ưu)
      const timeoutMs = 8 * 60 * 1000;
      
      timeoutId = setTimeout(() => {
        console.log("\n⏰ TIMEOUT! Gracefully stopping normalization...");
        if (normalizeCommand && normalizeCommand.ffmpegProc && !normalizeCommand.ffmpegProc.killed) {
          console.log("� Sending SIGTERM to normalize...");
          normalizeCommand.ffmpegProc.kill('SIGTERM'); // Graceful first
          
          setTimeout(() => {
            if (normalizeCommand && normalizeCommand.ffmpegProc && !normalizeCommand.ffmpegProc.killed) {
              console.log("🔪 Force killing normalize...");
              normalizeCommand.ffmpegProc.kill('SIGKILL');
            }
          }, 5000);
        }
        reject(new Error(`Normalization timeout sau 8 phút`));
      }, timeoutMs);
      
      // FIXED: Sử dụng concat FILTER thay vì concat DEMUXER để fix timing issues
      normalizeCommand = ffmpeg();
      
      // Add all input videos
      videoPaths.forEach((videoPath) => {
        normalizeCommand.input(videoPath);
      });
      
      // Tạo filter complex để scale tất cả video về cùng format rồi concat
      const filterInputs = [];
      const filterOutputs = [];
      
      for (let i = 0; i < videoPaths.length; i++) {
        filterInputs.push(`[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30[v${i}]`);
        filterOutputs.push(`[v${i}]`);
      }
      
      const filterComplex = filterInputs.join(';') + ';' + filterOutputs.join('') + `concat=n=${videoPaths.length}:v=1:a=0[outv]`;
      
      normalizeCommand
        .complexFilter(filterComplex)
        .outputOptions([
          "-map [outv]",
          "-c:v libx264",
          "-c:a aac",
          "-crf 23",                         // Good quality
          "-preset fast",                    // Fast preset
          "-g 60",                           // GOP size
          "-keyint_min 30",
          "-sc_threshold 0",
          "-b:a 128k",
          "-ar 44100",
          "-ac 2",
          "-threads 0",                      // Use all CPU cores
          "-movflags +faststart"
        ])
        .on("start", (cmd) => {
          console.log("▶️ Bắt đầu normalize và ghép...");
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r🔧 Normalizing: ${Math.round(progress.percent)}%`);
          }
        })
        .on("error", (err) => {
          clearTimeout(timeoutId);
          console.log("\n❌ Lỗi normalize:", err.message);
          reject(err);
        })
        .on("end", () => {
          clearTimeout(timeoutId);
          console.log("\n✅ Normalize và ghép hoàn thành!");
          resolve(outputPath);
        });

      normalizeCommand.save(outputPath);

    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      reject(error);
    }
  });
}