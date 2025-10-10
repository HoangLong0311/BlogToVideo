import fs from "fs";
import path from "path";
import { ffmpeg } from "../config/ffmpegConfig.js";

// Hàm validate subtitle file
function validateSubtitleFile(subtitlePath) {
  if (!fs.existsSync(subtitlePath)) {
    throw new Error(`File subtitle không tồn tại: ${subtitlePath}`);
  }
  
  const stats = fs.statSync(subtitlePath);
  if (stats.size === 0) {
    throw new Error(`File subtitle rỗng: ${subtitlePath}`);
  }
  
  const ext = path.extname(subtitlePath).toLowerCase();
  const supportedExts = ['.srt', '.ass', '.ssa', '.vtt'];
  if (!supportedExts.includes(ext)) {
    throw new Error(`Định dạng subtitle không hỗ trợ: ${ext}. Hỗ trợ: ${supportedExts.join(', ')}`);
  }
  
  console.log(`✅ Subtitle hợp lệ: ${path.basename(subtitlePath)} (${(stats.size / 1024).toFixed(2)}KB)`);
}

// Hàm để gắn subtitle vào video với nhiều phương pháp
export async function addSubtitleToVideo(videoPath, subtitlePath, outputPath, method = 'hardburn') {
  return new Promise((resolve, reject) => {
    console.log(`📝 Bắt đầu gắn subtitle (phương pháp: ${method})...`);
    
    // Validate inputs
    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`File video không tồn tại: ${videoPath}`);
      }
      validateSubtitleFile(subtitlePath);
    } catch (error) {
      reject(error);
      return;
    }
    
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
      let currentCommand = null;
      let timeoutId = null;
      
      const cleanupCommand = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (currentCommand) {
          try {
            currentCommand.kill('SIGKILL');
          } catch (e) {
            // Command đã kết thúc hoặc không thể kill
          }
          currentCommand = null;
        }
      };
      
      const tryFilter = () => {
        if (filterIndex >= subtitleFilters.length) {
          cleanupCommand();
          reject(new Error('Tất cả các cách gắn hardburn subtitle đều thất bại'));
          return;
        }
        
        // Cleanup command cũ trước khi tạo mới
        cleanupCommand();
        
        const currentFilter = subtitleFilters[filterIndex];
        console.log(`🔧 Thử filter ${filterIndex + 1}/${subtitleFilters.length}: ${currentFilter}`);
        
        currentCommand = ffmpeg()
          .input(videoPath)
          .videoFilters([currentFilter])
          .outputOptions([
            '-c:a copy',           // Copy audio codec, re-encode video
            '-crf 23',             // Chất lượng video tốt
            '-preset medium',      // Cân bằng giữa tốc độ và chất lượng
            '-max_muxing_queue_size 1024', // Buffer queue
            '-avoid_negative_ts make_zero'  // Fix timestamp issues
          ]);
        
        // Timeout cho mỗi attempt (5 phút)
        timeoutId = setTimeout(() => {
          console.log(`\n⏰ Filter ${filterIndex + 1} timeout, thử filter tiếp theo...`);
          filterIndex++;
          tryFilter();
        }, 5 * 60 * 1000);
        
        currentCommand
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
            console.log(`\n❌ Filter ${filterIndex + 1} thất bại: ${err.message}`);
            filterIndex++;
            
            // Delay nhỏ trước khi thử filter tiếp theo
            setTimeout(() => {
              tryFilter();
            }, 1000);
          })
          .on('end', () => {
            console.log(`\n✅ Burn subtitle hoàn thành với filter ${filterIndex + 1}!`);
            cleanupCommand();
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
    // Thêm timeout cho embed/sidecar (3 phút)
    const timeoutId = setTimeout(() => {
      console.log('\n⏰ Timeout khi gắn subtitle!');
      try {
        command.kill('SIGKILL');
      } catch (e) {
        // Command đã kết thúc
      }
      
      if (method === 'embed') {
        console.log('🔄 Timeout embed, thử tạo file sidecar...');
        addSubtitleToVideo(videoPath, subtitlePath, outputPath, 'sidecar')
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error(`Timeout khi gắn subtitle với phương pháp ${method}`));
      }
    }, 3 * 60 * 1000);
    
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
        clearTimeout(timeoutId);
        console.log('\n❌ Lỗi khi gắn subtitle:', err.message);
        
        // Nếu embed không thành công, tạo file sidecar
        if (method === 'embed') {
          console.log('🔄 Embed thất bại, thử tạo file subtitle riêng...');
          addSubtitleToVideo(videoPath, subtitlePath, outputPath, 'sidecar')
            .then(resolve)
            .catch(reject);
          return;
        }
        
        reject(err);
      })
      .on('end', () => {
        clearTimeout(timeoutId);
        console.log(`\n✅ Gắn subtitle hoàn thành (${method})!`);
        resolve(outputPath);
      });

    command.save(outputPath);
  });
}