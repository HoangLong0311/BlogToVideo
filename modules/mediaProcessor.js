import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Ghép file âm thanh output.mp3 vào video final_video_with_subtitle.mp4
 * Audio sẽ bắt đầu từ giây thứ 9
 */
async function mergeAudioToVideo() {
  const videoPath = './videos/final_video_with_subtitle.mp4';
  const audioPath = './audio/output.mp3';
  const outputPath = './videos/final_video_with_audio.mp4';
  
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

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      // Delay audio 9 seconds
      .complexFilter([
        {
          filter: 'adelay',
          options: '9000|9000', // 9 seconds in milliseconds for stereo
          inputs: '1:a',
          outputs: 'delayed_audio'
        }
      ])
      .outputOptions([
        '-c:v copy',                    // Copy video stream
        '-c:a aac',                     // Convert audio to AAC
        '-b:a 192k',                    // Audio bitrate 192kbps
        '-ar 48000',                    // Sample rate 48kHz
        '-ac 2',                        // Force stereo
        '-movflags', '+faststart',      // Web compatible
        '-map 0:v:0',                   // Map video from first input
        '-map [delayed_audio]',         // Map delayed audio
        '-shortest'                     // End when shortest stream ends
      ])
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
