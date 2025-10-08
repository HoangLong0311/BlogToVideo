import fs from "fs";
import { ffmpeg } from "../config/ffmpegConfig.js";

// Hàm để gắn subtitle vào video với nhiều phương pháp
export async function addSubtitleToVideo(videoPath, subtitlePath, outputPath, method = 'hardburn') {
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