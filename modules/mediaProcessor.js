import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Ghép file âm thanh output.mp3 vào video final_video_with_subtitle.mp4
 * Audio sẽ bắt đầu từ giây thứ 9
 * Enhanced version để xử lý audio dài hơn video
 */
async function mergeAudioToVideo(options = {}) {
  const {
    videoPath = './videos/final_video_with_subtitle.mp4',
    audioPath = './audio/output.mp3', 
    outputPath = './videos/final_video_with_audio.mp4',
    audioDelay = 9,
    keepVideoLength = true // Giữ độ dài video, audio sẽ được cắt hoặc ghép theo
  } = options;
  
  // Kiểm tra files tồn tại
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  console.log('🎬 Bắt đầu ghép audio vào video...');
  console.log(`📹 Video: ${videoPath}`);
  console.log(`🎵 Audio: ${audioPath}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`⏰ Audio delay: ${audioDelay}s`);
  console.log(`📏 Keep video length: ${keepVideoLength ? 'Yes (cut/fit audio to video)' : 'No (may extend video)'}`);

  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(videoPath)
      .input(audioPath);
    
    // Build complex filter
    const filters = [];
    
    // Delay audio if specified
    if (audioDelay > 0) {
      filters.push({
        filter: 'adelay',
        options: `${audioDelay * 1000}|${audioDelay * 1000}`, // Convert to milliseconds for stereo
        inputs: '1:a',
        outputs: 'delayed_audio'
      });
    }
    
    if (filters.length > 0) {
      command.complexFilter(filters);
    }
    
    // Build output options
    const outputOptions = [
      '-c:v copy',                    // Copy video stream
      '-c:a aac',                     // Convert audio to AAC  
      '-b:a 192k',                    // Audio bitrate 192kbps
      '-ar 48000',                    // Sample rate 48kHz
      '-ac 2',                        // Force stereo
      '-movflags', '+faststart',      // Web compatible
      '-map 0:v:0',                   // Map video from first input
      '-avoid_negative_ts', 'make_zero' // Handle timing issues
    ];
    
    // Map audio - delayed or direct
    if (audioDelay > 0) {
      outputOptions.push('-map', '[delayed_audio]');
    } else {
      outputOptions.push('-map', '1:a:0');
    }
    
    // Add duration control - always keep video length
    if (keepVideoLength) {
      outputOptions.push('-shortest'); // Cut to video duration
    }
    
    command.outputOptions(outputOptions)
      .on('start', (commandLine) => {
        console.log('▶️  FFmpeg started...');
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r⏳ Progress: ${Math.floor(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('\n✅ Ghép audio thành công!');
        console.log(`📁 File output: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('\n❌ Lỗi khi ghép audio:', err.message);
        if (stderr) {
          console.error('FFmpeg stderr:', stderr);
        }
        reject(err);
      })
      .save(outputPath);
  });
}

// Chạy function khi file được execute trực tiếp
const isMainModule = process.argv[1] && process.argv[1].includes('mergeAudio.js');

if (isMainModule) {
  mergeAudioToVideo()
    .then((outputPath) => {
      console.log(`\n🎉 Hoàn thành! File đã được tạo: ${outputPath}`);
      console.log('💡 Hãy mở file này để kiểm tra audio!');
    })
    .catch((error) => {
      console.error('💥 Lỗi:', error.message);
      process.exit(1);
    });
}

export { mergeAudioToVideo };
