import fs from "fs";
import path from "path";
import { ffmpeg, ffprobeAvailable } from "../config/ffmpegConfig.js";

// Hàm kiểm tra thông tin video để đảm bảo tương thích
export async function checkVideoCompatibility(videoPaths) {
  console.log("🔍 Kiểm tra tương thích video...");
  
  // Kiểm tra ffprobe trước khi sử dụng
  if (!ffprobeAvailable) {
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

  // Kiểm tra ffprobe có thể chạy không
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
    console.log("⚠️ FFprobe không thể chạy, bỏ qua kiểm tra tương thích");
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