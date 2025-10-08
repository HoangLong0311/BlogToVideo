import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";

// Cấu hình đường dẫn ffmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Thử import ffprobe-installer nếu có
let ffprobeInstaller = null;
try {
  ffprobeInstaller = await import("@ffprobe-installer/ffprobe");
  ffmpeg.setFfprobePath(ffprobeInstaller.default.path);
  console.log("✅ FFprobe from installer:", ffprobeInstaller.default.path);
} catch (error) {
  // Nếu không có ffprobe-installer, tìm trong thư mục ffmpeg
  const ffmpegDir = path.dirname(ffmpegInstaller.path);
  const ffprobePath = path.join(ffmpegDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
  
  if (fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
    console.log("✅ FFprobe found with ffmpeg:", ffprobePath);
  } else {
    console.log("⚠️ FFprobe not found. Installing @ffprobe-installer/ffprobe recommended");
    console.log("� Run: npm install @ffprobe-installer/ffprobe");
    console.log("🔍 Will try to proceed without detailed video analysis...");
  }
}

console.log("🎬 === CÔNG CỤ GHÉP VIDEO & GẮN SUBTITLE ===");
console.log("📋 Hướng dẫn sử dụng:");
console.log("   1. Đặt tất cả video cần ghép vào thư mục 'videos'");
console.log("   2. Đặt file subtitle (.srt) vào cùng thư mục (tùy chọn)");
console.log("   3. Chạy script này");
console.log("   4. Video đã ghép (và có subtitle) sẽ được lưu trong cùng thư mục");
console.log("==========================================\n");

async function mergeVideos(videoPaths, outputPath) {
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

      // Cấu hình timeout dựa trên số lượng và kích thước video
      const totalSizeMB = videoInfos.reduce((sum, info) => sum + parseFloat(info.size), 0);
      const estimatedTimeoutMinutes = Math.max(5, Math.ceil(totalSizeMB / 100) * videoPaths.length);
      const timeoutMs = estimatedTimeoutMinutes * 60 * 1000;
      
      console.log(`⏰ Timeout ước tính: ${estimatedTimeoutMinutes} phút (${totalSizeMB.toFixed(2)}MB tổng)`);

      // Thiết lập timeout
      timeoutId = setTimeout(() => {
        console.log("\n⏰ TIMEOUT! Quá trình ghép video quá lâu, sẽ thử phương pháp khác...");
        reject(new Error(`Timeout sau ${estimatedTimeoutMinutes} phút`));
      }, timeoutMs);

      // Thử phương pháp 1: Copy codec (nhanh nhất)
      let command = ffmpeg()
        .input(mergedFileList)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c copy",
          "-avoid_negative_ts make_zero",
          "-fflags +genpts",
          "-max_muxing_queue_size 1024" // Tăng buffer cho nhiều video
        ]);

      const setupHandlers = (method = "copy") => {
        command
          .on("start", (cmd) => {
            console.log("▶️ Bắt đầu thực thi FFmpeg...");
            console.log(`🔧 Phương pháp: ${method}`);
            console.log("🔧 Command:", cmd);
          })
          .on("progress", (progress) => {
            if (progress.percent) {
              process.stdout.write(`\r⏳ Đang xử lý: ${Math.round(progress.percent)}% (${method})`);
            }
          })
          .on("error", (err) => {
            clearTimeout(timeoutId);
            console.log(`\n❌ Lỗi FFmpeg (${method}):`, err.message);
            
            // Nếu copy codec thất bại, thử re-encode
            if (method === "copy" && (
              err.message.includes('Decoder') || 
              err.message.includes('codec') ||
              err.message.includes('format')
            )) {
              console.log("🔄 Copy codec thất bại, chuyển sang re-encode...");
              
              // Cleanup trước khi thử lại
              if (fs.existsSync(mergedFileList)) {
                try { fs.unlinkSync(mergedFileList); } catch {}
              }
              
              // Thử lại với re-encode
              mergeVideosWithReencode(videoPaths, outputPath)
                .then(resolve)
                .catch(reject);
              return;
            }
            
            // Cleanup
            if (fs.existsSync(mergedFileList)) {
              try { fs.unlinkSync(mergedFileList); } catch {}
            }
            reject(err);
          })
          .on("end", () => {
            clearTimeout(timeoutId);
            console.log(`\n✅ Ghép video hoàn thành (${method})!`);
            
            // Cleanup
            if (fs.existsSync(mergedFileList)) {
              try { fs.unlinkSync(mergedFileList); } catch {}
            }
            resolve(outputPath);
          });
      };

      setupHandlers("copy");
      command.save(outputPath);

    } catch (error) {
      clearTimeout(timeoutId);
      // Cleanup nếu có lỗi
      if (fs.existsSync(mergedFileList)) {
        try { fs.unlinkSync(mergedFileList); } catch {}
      }
      reject(error);
    }
  });
}

// Hàm ghép video với re-encode (dự phòng khi copy codec thất bại)
async function mergeVideosWithReencode(videoPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const mergedFileList = path.join(process.cwd(), `file_list_reencode_${Date.now()}.txt`);
    
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
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c:v libx264",        // Re-encode video với H.264
          "-c:a aac",            // Re-encode audio với AAC
          "-crf 23",             // Chất lượng tốt
          "-preset medium",      // Tốc độ trung bình
          "-r 30",               // Frame rate cố định
          "-avoid_negative_ts make_zero",
          "-fflags +genpts",
          "-max_muxing_queue_size 2048"
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
          if (fs.existsSync(mergedFileList)) {
            try { fs.unlinkSync(mergedFileList); } catch {}
          }
          reject(err);
        })
        .on("end", () => {
          console.log("\n✅ Re-encode hoàn thành!");
          
          // Cleanup
          if (fs.existsSync(mergedFileList)) {
            try { fs.unlinkSync(mergedFileList); } catch {}
          }
          resolve(outputPath);
        });

      command.save(outputPath);

    } catch (error) {
      if (fs.existsSync(mergedFileList)) {
        try { fs.unlinkSync(mergedFileList); } catch {}
      }
      reject(error);
    }
  });
}

// Hàm kiểm tra thông tin video để đảm bảo tương thích
async function checkVideoCompatibility(videoPaths) {
  console.log("🔍 Kiểm tra tương thích video...");
  
  // Kiểm tra ffprobe trước khi sử dụng
  try {
    await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(__filename, (err) => {
        // Chỉ kiểm tra lỗi ffprobe không tìm thấy, không cần check file
        if (err && (err.message.includes('ffprobe') || err.message.includes('ENOENT'))) {
          reject(new Error('FFprobe không tìm thấy hoặc không thể chạy'));
        }
        resolve();
      });
    });
  } catch (error) {
    console.log("⚠️ FFprobe không khả dụng, bỏ qua kiểm tra tương thích");
    console.log("📝 Sẽ sử dụng phương pháp copy codec (mặc định)");
    
    // Trả về thông tin cơ bản không cần ffprobe
    const basicInfos = videoPaths.map(videoPath => {
      const stats = fs.statSync(videoPath);
      return {
        path: videoPath,
        name: path.basename(videoPath),
        duration: 'unknown',
        size: stats.size,
        videoCodec: 'unknown',
        audioCodec: 'unknown',
        width: 'unknown',
        height: 'unknown',
        fps: 'unknown'
      };
    });
    
    return {
      infos: basicInfos,
      needsReencode: false, // Assume compatible để dùng copy codec
      codecs: { video: ['unknown'], audio: ['unknown'] },
      resolutions: ['unknown']
    };
  }
  
  const videoInfos = [];
  
  for (let i = 0; i < videoPaths.length; i++) {
    const videoPath = videoPaths[i];
    
    try {
      const info = await new Promise((resolve, reject) => {
        // Thêm timeout cho ffprobe
        const timeoutId = setTimeout(() => {
          reject(new Error('FFprobe timeout'));
        }, 10000); // 10 giây timeout
        
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          clearTimeout(timeoutId);
          
          if (err) {
            reject(err);
            return;
          }
          
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
          
          resolve({
            path: videoPath,
            name: path.basename(videoPath),
            duration: metadata.format.duration,
            size: metadata.format.size,
            videoCodec: videoStream ? videoStream.codec_name : 'unknown',
            audioCodec: audioStream ? audioStream.codec_name : 'unknown',
            width: videoStream ? videoStream.width : 0,
            height: videoStream ? videoStream.height : 0,
            fps: videoStream ? (videoStream.r_frame_rate ? eval(videoStream.r_frame_rate) : 0) : 0
          });
        });
      });
      
      videoInfos.push(info);
      console.log(`   ✅ ${info.name}: ${info.videoCodec}/${info.audioCodec} ${info.width}x${info.height} @${info.fps.toFixed(1)}fps`);
      
    } catch (error) {
      console.log(`   ❌ ${path.basename(videoPath)}: Không thể đọc thông tin - ${error.message}`);
      
      // Nếu lỗi ffprobe, tạo thông tin cơ bản
      const stats = fs.statSync(videoPath);
      const basicInfo = {
        path: videoPath,
        name: path.basename(videoPath),
        duration: 'unknown',
        size: stats.size,
        videoCodec: 'unknown',
        audioCodec: 'unknown',
        width: 'unknown',
        height: 'unknown',
        fps: 'unknown'
      };
      
      videoInfos.push(basicInfo);
      console.log(`   ⚠️ ${basicInfo.name}: Sử dụng thông tin cơ bản (${(stats.size / (1024 * 1024)).toFixed(2)}MB)`);
    }
  }
  
  // Kiểm tra tương thích codec
  const videoCodecs = [...new Set(videoInfos.map(v => v.videoCodec))];
  const audioCodecs = [...new Set(videoInfos.map(v => v.audioCodec))];
  const resolutions = [...new Set(videoInfos.map(v => `${v.width}x${v.height}`))];
  
  console.log(`📊 Thống kê:`);
  console.log(`   Video codecs: ${videoCodecs.join(', ')}`);
  console.log(`   Audio codecs: ${audioCodecs.join(', ')}`);
  console.log(`   Resolutions: ${resolutions.join(', ')}`);
  
  // Đề xuất phương pháp ghép
  const needsReencode = videoCodecs.length > 1 || audioCodecs.length > 1 || resolutions.length > 1;
  
  if (needsReencode) {
    console.log("⚠️ Video có codec/resolution khác nhau, có thể cần re-encode");
  } else {
    console.log("✅ Tất cả video tương thích, có thể dùng copy codec");
  }
  
  return {
    infos: videoInfos,
    needsReencode,
    codecs: { video: videoCodecs, audio: audioCodecs },
    resolutions
  };
}

// Hàm để tìm file subtitle trong thư mục
function findSubtitleFiles(folder) {
  const subtitleExtensions = ['.srt', '.ass', '.ssa', '.vtt'];
  
  if (!fs.existsSync(folder)) {
    return [];
  }

  const files = fs.readdirSync(folder);
  const subtitleFiles = files
    .filter(file => subtitleExtensions.some(ext => file.toLowerCase().endsWith(ext)))
    .map(file => path.join(folder, file))
    .sort();

  return subtitleFiles;
}

// Hàm để tìm tất cả video trong thư mục
function findVideoFiles(folder) {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm'];
  
  if (!fs.existsSync(folder)) {
    console.log(`📁 Tạo thư mục: ${folder}`);
    fs.mkdirSync(folder, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(folder);
  const videoFiles = files
    .filter(file => videoExtensions.some(ext => file.toLowerCase().endsWith(ext)))
    .map(file => path.join(folder, file))
    .sort(); // Sắp xếp theo tên file

  return videoFiles;
}

// Hàm tạo tên output dựa trên timestamp
function generateOutputName(folder, withSubtitle = false) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('.')[0];
  const suffix = withSubtitle ? '_with_subtitle' : '';
  return path.join(folder, `merged_video${suffix}_${timestamp}.mp4`);
}

// Hàm ghép video theo batch nếu có quá nhiều video
async function mergeVideosInBatches(videoPaths, outputPath, batchSize = 5) {
  if (videoPaths.length <= batchSize) {
    // Nếu không quá nhiều video, ghép trực tiếp
    return await mergeVideos(videoPaths, outputPath);
  }
  
  console.log(`📦 Ghép theo batch: ${videoPaths.length} video, ${batchSize} video/batch`);
  
  const tempFolder = path.join(path.dirname(outputPath), 'temp_merge');
  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }
  
  const batchPaths = [];
  
  try {
    // Chia video thành các batch và ghép từng batch
    for (let i = 0; i < videoPaths.length; i += batchSize) {
      const batch = videoPaths.slice(i, i + batchSize);
      const batchOutputPath = path.join(tempFolder, `batch_${Math.floor(i/batchSize) + 1}.mp4`);
      
      console.log(`📦 Xử lý batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(videoPaths.length/batchSize)}: ${batch.length} video`);
      
      if (batch.length === 1) {
        // Nếu chỉ có 1 video trong batch, copy trực tiếp
        fs.copyFileSync(batch[0], batchOutputPath);
      } else {
        await mergeVideos(batch, batchOutputPath);
      }
      
      batchPaths.push(batchOutputPath);
    }
    
    // Ghép tất cả các batch lại với nhau
    console.log(`🔗 Ghép ${batchPaths.length} batch thành file cuối cùng...`);
    await mergeVideos(batchPaths, outputPath);
    
    // Cleanup temp files
    console.log("🗑️ Dọn dẹp file tạm...");
    for (const batchPath of batchPaths) {
      if (fs.existsSync(batchPath)) {
        fs.unlinkSync(batchPath);
      }
    }
    fs.rmdirSync(tempFolder);
    
    return outputPath;
    
  } catch (error) {
    // Cleanup nếu có lỗi
    console.log("🗑️ Dọn dẹp file tạm do lỗi...");
    for (const batchPath of batchPaths) {
      if (fs.existsSync(batchPath)) {
        try { fs.unlinkSync(batchPath); } catch {}
      }
    }
    if (fs.existsSync(tempFolder)) {
      try { fs.rmdirSync(tempFolder); } catch {}
    }
    throw error;
  }
}

// Hàm để gắn subtitle vào video với nhiều phương pháp
async function addSubtitleToVideo(videoPath, subtitlePath, outputPath, method = 'hardburn') {
  return new Promise((resolve, reject) => {
    console.log(`📝 Bắt đầu gắn subtitle (phương pháp: ${method})...`);
    
    let command = ffmpeg()
      .input(videoPath);

    if (method === 'hardburn') {
      // Phương pháp 1: Burn subtitle vào video (luôn hiển thị, không thể tắt)
      console.log('🔥 Sử dụng phương pháp HARDBURN - subtitle sẽ được burn vào video');
      
      // Xử lý đường dẫn cho Windows và FFmpeg
      let processedPath = subtitlePath;
      
      // Chuyển đổi đường dẫn Windows sang format phù hợp với FFmpeg
      if (process.platform === 'win32') {
        // Thay thế backslash bằng forward slash và escape colon
        processedPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
      }
      
      // Sử dụng nhiều cách khác nhau để xử lý subtitle filter
      const subtitleFilters = [
        `subtitles='${processedPath}'`,
        `subtitles=${processedPath}`,
        `subtitles="${processedPath}"`,
        // Backup: sử dụng đường dẫn gốc
        `subtitles='${subtitlePath}'`
      ];
      
      // Thử từng filter cho đến khi thành công
      let filterIndex = 0;
      const tryFilter = () => {
        if (filterIndex >= subtitleFilters.length) {
          reject(new Error('Tất cả các cách gắn hardburn subtitle đều thất bại'));
          return;
        }
        
        const currentFilter = subtitleFilters[filterIndex];
        console.log(`🔧 Thử filter ${filterIndex + 1}/${subtitleFilters.length}: ${currentFilter}`);
        
        command = ffmpeg()
          .input(videoPath)
          .videoFilters([currentFilter])
          .outputOptions([
            '-c:a copy',  // Copy audio codec, re-encode video
            '-crf 23',    // Chất lượng video tốt
            '-preset medium' // Cân bằng giữa tốc độ và chất lượng
          ]);
          
        setupCommand();
        filterIndex++;
      };
      
      const setupCommand = () => {
        command
          .on('start', (cmd) => {
            console.log('▶️ Bắt đầu burn subtitle vào video...');
            console.log('🔧 Command:', cmd);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              process.stdout.write(`\r🔥 Đang burn subtitle: ${Math.round(progress.percent)}%`);
            }
          })
          .on('error', (err) => {
            console.log(`\n❌ Filter ${filterIndex} thất bại: ${err.message}`);
            tryFilter(); // Thử filter tiếp theo
          })
          .on('end', () => {
            console.log(`\n✅ Burn subtitle hoàn thành với filter ${filterIndex}!`);
            resolve(outputPath);
          })
          .save(outputPath);
      };
      
      tryFilter(); // Bắt đầu thử
      return; // Không thực hiện code bên dưới
      
    } else if (method === 'embed') {
      // Phương pháp 2: Nhúng subtitle vào video (có thể bật/tắt trong player)
      command = command
        .input(subtitlePath)
        .outputOptions([
          '-c:v copy',           // Copy video codec
          '-c:a copy',           // Copy audio codec
          '-c:s mov_text',       // Subtitle codec for MP4
          '-disposition:s:0 default', // Set subtitle as default
          '-metadata:s:s:0 language=vie', // Set subtitle language
          '-metadata:s:s:0 title=Vietnamese' // Set subtitle title
        ]);
    } else if (method === 'sidecar') {
      // Phương pháp 3: Tạo file subtitle riêng cùng tên
      const sidecarPath = outputPath.replace('.mp4', '.srt');
      fs.copyFileSync(subtitlePath, sidecarPath);
      console.log(`📋 Đã tạo file subtitle riêng: ${sidecarPath.split('\\').pop()}`);
      
      // Chỉ copy video, không gắn subtitle
      command = command
        .outputOptions([
          '-c:v copy',
          '-c:a copy'
        ]);
    }
    
    // Xử lý cho embed và sidecar (hardburn đã được xử lý ở trên)
    command
      .on('start', (cmd) => {
        console.log('▶️ Bắt đầu xử lý subtitle...');
        console.log('🔧 Command:', cmd);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r📝 Đang gắn subtitle: ${Math.round(progress.percent)}%`);
        }
      })
      .on('error', (err) => {
        console.log('\n❌ Lỗi khi gắn subtitle:', err.message);
        
        // Nếu embed không thành công, tạo file sidecar
        if (method === 'embed') {
          console.log('🔄 Thử tạo file subtitle riêng...');
          addSubtitleToVideo(videoPath, subtitlePath, outputPath, 'sidecar')
            .then(resolve)
            .catch(reject);
          return;
        }
        
        reject(err);
      })
      .on('end', () => {
        console.log(`\n✅ Gắn subtitle hoàn thành (${method})!`);
        resolve(outputPath);
      });

    command.save(outputPath);
  });
}

async function main(customFolder = null, subtitleMethod = 'hardburn') {
  const folder = customFolder ? path.resolve(customFolder) : path.join(process.cwd(), "videos");
  console.log(`🔍 Tìm kiếm video trong thư mục: ${folder}`);
  
  const videoPaths = findVideoFiles(folder);
  const subtitlePaths = findSubtitleFiles(folder);
  
  if (videoPaths.length === 0) {
    console.log("⚠️ Không tìm thấy video nào trong thư mục!");
    console.log("📝 Hãy đặt các file video vào thư mục 'videos'");
    return;
  }

  if (videoPaths.length < 2) {
    console.log("⚠️ Cần ít nhất 2 video để ghép!");
    console.log(`📊 Tìm thấy: ${videoPaths.length} video`);
    videoPaths.forEach((path, index) => {
      console.log(`   ${index + 1}. ${path.split('\\').pop()}`);
    });
    return;
  }

  // Kiểm tra subtitle
  let subtitlePath = null;
  if (subtitlePaths.length > 0) {
    subtitlePath = subtitlePaths[0]; // Sử dụng subtitle đầu tiên tìm thấy
    console.log(`📝 Tìm thấy subtitle: ${subtitlePath.split('\\').pop()}`);
  } else {
    console.log(`📝 Không tìm thấy file subtitle (.srt, .ass, .ssa, .vtt)`);
  }

  const outputPath = generateOutputName(folder, false);
  
  console.log(`📹 Sẽ ghép ${videoPaths.length} video:`);
  videoPaths.forEach((path, index) => {
    const fileName = path.split('\\').pop();
    const stats = fs.statSync(path);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`   ${index + 1}. ${fileName} (${sizeMB}MB)`);
  });
  
  console.log(`💾 Output: ${outputPath.split('\\').pop()}`);

  try {
    console.log("🚀 Bắt đầu ghép video...");
    let finalOutputPath = outputPath;
    
    // Bước 0: Kiểm tra tương thích video
    const compatibility = await checkVideoCompatibility(videoPaths);
    
    // Bước 1: Quyết định phương pháp ghép dựa trên số lượng và tương thích
    const totalSizeMB = compatibility.infos.reduce((sum, info) => sum + (info.size / (1024 * 1024)), 0);
    const shouldUseBatch = videoPaths.length > 10 || totalSizeMB > 5000; // > 10 video hoặc > 5GB
    
    if (shouldUseBatch) {
      console.log(`📦 Số lượng video lớn (${videoPaths.length}) hoặc dung lượng lớn (${totalSizeMB.toFixed(2)}MB)`);
      console.log("📦 Sử dụng phương pháp batch processing...");
      await mergeVideosInBatches(videoPaths, outputPath, 5);
    } else if (compatibility.needsReencode) {
      console.log("🔄 Sử dụng phương pháp re-encode để đảm bảo tương thích...");
      await mergeVideosWithReencode(videoPaths, outputPath);
    } else {
      console.log("⚡ Sử dụng phương pháp copy codec (nhanh)...");
      await mergeVideos(videoPaths, outputPath);
    }
    
    // Hiển thị thông tin file đã ghép
    const mergedStats = fs.statSync(outputPath);
    const mergedSizeMB = (mergedStats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Ghép video hoàn thành: ${outputPath.split('\\').pop()} (${mergedSizeMB}MB)`);
    
    // Bước 2: Gắn subtitle nếu có
    if (subtitlePath) {
      const subtitleOutputPath = generateOutputName(folder, true);
      console.log(`\n📝 Bắt đầu gắn subtitle (phương pháp: ${subtitleMethod})...`);
      
      await addSubtitleToVideo(outputPath, subtitlePath, subtitleOutputPath, subtitleMethod);
      
      // Hiển thị thông tin file có subtitle
      const subtitleStats = fs.statSync(subtitleOutputPath);
      const subtitleSizeMB = (subtitleStats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ File với subtitle: ${subtitleOutputPath.split('\\').pop()} (${subtitleSizeMB}MB)`);
      
      finalOutputPath = subtitleOutputPath;
      
      // Tùy chọn: Xóa file trung gian (chỉ có video, chưa có subtitle)
      console.log(`🗑️ Bạn có muốn xóa file trung gian không có subtitle không? (${outputPath.split('\\').pop()})`);
    }
    
    // Hiển thị kết quả cuối cùng
    const finalStats = fs.statSync(finalOutputPath);
    const finalSizeMB = (finalStats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n🎉 HOÀN THÀNH! File cuối cùng: ${finalOutputPath.split('\\').pop()} (${finalSizeMB}MB)`);
    
  } catch (err) {
    console.error("❌ Lỗi khi ghép video:", err.message);
    
    // Gợi ý một số lỗi thường gặp
    if (err.message.includes('No such file')) {
      console.log("💡 Gợi ý: Kiểm tra lại đường dẫn file video");
    } else if (err.message.includes('codec') || err.message.includes('Decoder')) {
      console.log("💡 Gợi ý: Video có codec không tương thích");
      console.log("   - Thử convert video về MP4/H.264 trước khi ghép");
      console.log("   - Hoặc dùng tham số --subtitle=embed thay vì hardburn");
    } else if (err.message.includes('Permission denied')) {
      console.log("💡 Gợi ý: Kiểm tra quyền truy cập thư mục");
    } else if (err.message.includes('ffprobe') || err.message.includes('FFprobe')) {
      console.log("💡 Gợi ý: FFprobe không tìm thấy hoặc không hoạt động");
      console.log("   - Cài đặt: npm install @ffprobe-installer/ffprobe");
      console.log("   - Hoặc tải FFmpeg full từ: https://ffmpeg.org/download.html");
      console.log("   - Script vẫn có thể chạy nhưng không kiểm tra được tương thích video");
      console.log("   - Thử chạy: node check-ffmpeg-setup.js để kiểm tra setup");
    } else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
      console.log("💡 Gợi ý: Quá trình ghép video quá lâu");
      console.log("   - Video có thể quá lớn hoặc có vấn đề");
      console.log("   - Thử chia nhỏ thành các batch nhỏ hơn");
      console.log("   - Kiểm tra dung lượng ổ cứng còn trống");
    } else if (err.message.includes('format') || err.message.includes('Invalid')) {
      console.log("💡 Gợi ý: Định dạng video không hợp lệ");
      console.log("   - Kiểm tra tất cả file có phải video hợp lệ không");
      console.log("   - Thử với video định dạng khác (.mp4, .avi, .mov)");
    } else if (err.message.includes('memory') || err.message.includes('Memory')) {
      console.log("💡 Gợi ý: Hết bộ nhớ");
      console.log("   - Đóng các ứng dụng khác để giải phóng RAM");
      console.log("   - Thử ghép ít video hơn trong một lần");
    } else {
      console.log("💡 Gợi ý chung:");
      console.log("   - Kiểm tra tất cả video có mở được không");
      console.log("   - Thử ghép từng cặp video để tìm video lỗi");
      console.log("   - Đảm bảo đủ dung lượng ổ cứng trống");
      console.log("   - Khởi động lại máy nếu cần thiết");
    }
  }
}

// Xử lý tham số command line
const args = process.argv.slice(2);
const customFolder = args.find(arg => arg.startsWith('--folder='))?.split('=')[1];
const subtitleMethod = args.find(arg => arg.startsWith('--subtitle='))?.split('=')[1] || 'hardburn';
const helpFlag = args.includes('--help') || args.includes('-h');

if (helpFlag) {
  console.log("🎬 === CÔNG CỤ GHÉP VIDEO & GẮN SUBTITLE - HƯỚNG DẪN ===");
  console.log("Cách sử dụng:");
  console.log("  node mergedVids.js                          # Ghép video và burn subtitle (mặc định)");
  console.log("  node mergedVids.js --folder=path            # Chỉ định thư mục khác");
  console.log("  node mergedVids.js --subtitle=hardburn      # Burn subtitle vào video (mặc định)");
  console.log("  node mergedVids.js --subtitle=embed         # Nhúng subtitle vào video (có thể bật/tắt)");
  console.log("  node mergedVids.js --subtitle=sidecar       # Tạo file subtitle riêng");
  console.log("  node mergedVids.js --help                   # Hiển thị hướng dẫn này");
  console.log("\nĐịnh dạng video hỗ trợ:");
  console.log("  .mp4, .avi, .mov, .mkv, .flv, .wmv, .webm");
  console.log("\nĐịnh dạng subtitle hỗ trợ:");
  console.log("  .srt, .ass, .ssa, .vtt");
  console.log("\nPhương pháp gắn subtitle:");
  console.log("  📌 embed     - Nhúng vào video (có thể bật/tắt trong player)");
  console.log("  🔥 hardburn  - Burn vào video (luôn hiển thị, không thể tắt)");
  console.log("  📄 sidecar   - File subtitle riêng (cùng tên với video)");
  console.log("\nChức năng:");
  console.log("  ✅ Ghép nhiều video thành 1 file");
  console.log("  ✅ 3 phương pháp gắn subtitle khác nhau");
  console.log("  ✅ Tự động fallback nếu một phương pháp thất bại");
  console.log("  ✅ Hiển thị progress bar trong quá trình xử lý");
  console.log("  ✅ Tạo tên file output tự động theo timestamp");
  console.log("=============================================================");
  process.exit(0);
}

// Chạy chương trình chính
if (customFolder) {
  console.log(`📁 Sử dụng thư mục tùy chỉnh: ${customFolder}`);
}

main(customFolder, subtitleMethod).catch(err => {
  console.error("💥 Lỗi nghiêm trọng:", err.message);
  process.exit(1);
});
