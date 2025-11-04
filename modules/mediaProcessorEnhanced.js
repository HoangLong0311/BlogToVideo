// Enhanced media processor với duration checking và flexible audio handling
import fs from 'fs';
import { ffmpeg } from '../config/ffmpegConfig.js';

/**
 * Lấy thông tin metadata của file media
 */
async function getMediaInfo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}

/**
 * Ghép audio vào video với kiểm tra duration và xử lý flexible
 */
async function mergeAudioToVideoEnhanced(options = {}) {
  const {
    videoPath = './videos/final_video_with_subtitle.mp4',
    audioPath = './audio/output.mp3',
    outputPath = './videos/final_video_with_audio.mp4',
    audioDelay = 9, // seconds
    strategy = 'auto' // 'auto', 'video_length', 'audio_length', 'shortest'
  } = options;
  
  // Kiểm tra files tồn tại
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  console.log('🎬 Bắt đầu phân tích media files...');
  console.log(`📹 Video: ${videoPath}`);
  console.log(`🎵 Audio: ${audioPath}`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`⏰ Audio delay: ${audioDelay}s`);

  try {
    // Lấy thông tin duration
    const videoInfo = await getMediaInfo(videoPath);
    const audioInfo = await getMediaInfo(audioPath);
    
    const videoDuration = parseFloat(videoInfo.format.duration);
    const audioDuration = parseFloat(audioInfo.format.duration);
    const effectiveAudioDuration = audioDuration + audioDelay; // Audio bắt đầu sau delay
    
    console.log(`\n📊 MEDIA ANALYSIS:`);
    console.log(`   Video duration: ${videoDuration.toFixed(1)}s`);
    console.log(`   Audio duration: ${audioDuration.toFixed(1)}s`);
    console.log(`   Effective audio duration (with delay): ${effectiveAudioDuration.toFixed(1)}s`);
    
    // Phân tích strategy
    let finalStrategy = strategy;
    let outputDuration = videoDuration;
    
    if (strategy === 'auto') {
      if (effectiveAudioDuration > videoDuration) {
        finalStrategy = 'audio_length';
        outputDuration = effectiveAudioDuration;
        console.log(`   🔍 Auto strategy: Audio longer than video -> extending video`);
      } else {
        finalStrategy = 'video_length';
        console.log(`   🔍 Auto strategy: Video longer than audio -> keeping video length`);
      }
    }
    
    console.log(`   📋 Final strategy: ${finalStrategy}`);
    console.log(`   ⏱️  Output duration will be: ${outputDuration.toFixed(1)}s\n`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(videoPath)
        .input(audioPath);

      // Xây dựng complex filter
      const filters = [];
      let videoOutput = '0:v';
      let audioOutput = '[delayed_audio]';

      // Delay audio
      filters.push({
        filter: 'adelay',
        options: `${audioDelay * 1000}|${audioDelay * 1000}`, // Convert to milliseconds
        inputs: '1:a',
        outputs: 'delayed_audio'
      });

      // Xử lý theo strategy
      if (finalStrategy === 'audio_length' && effectiveAudioDuration > videoDuration) {
        // Extend video by looping or padding
        const extraTime = effectiveAudioDuration - videoDuration;
        console.log(`   🔄 Extending video by ${extraTime.toFixed(1)}s`);
        
        // Loop video to match audio duration
        filters.push({
          filter: 'loop',
          options: `loop=-1:size=1:start=0`,
          inputs: '0:v',
          outputs: 'looped_video'
        });
        
        videoOutput = '[extended_video]';
        filters.push({
          filter: 'trim',
          options: `duration=${effectiveAudioDuration}`,
          inputs: 'looped_video',
          outputs: 'extended_video'
        });
      }

      command.complexFilter(filters);

      // Output options
      let outputOptions = [
        '-c:v libx264',                 // Video codec
        '-preset fast',                 // Encoding preset
        '-crf 23',                      // Quality
        '-c:a aac',                     // Audio codec
        '-b:a 192k',                    // Audio bitrate
        '-ar 48000',                    // Sample rate
        '-ac 2',                        // Stereo
        '-movflags', '+faststart'       // Web compatible
      ];
      
      // Handle mapping based on filter usage
      if (videoOutput === '0:v') {
        outputOptions.push('-map', '0:v:0');  // Direct video mapping
      } else {
        outputOptions.push('-map', videoOutput);  // Filtered video mapping
      }
      
      outputOptions.push('-map', audioOutput);   // Audio mapping

      // Thêm duration control
      if (finalStrategy === 'shortest') {
        outputOptions.push('-shortest');
      } else if (finalStrategy === 'video_length') {
        outputOptions.push(`-t ${videoDuration}`);
      } else if (finalStrategy === 'audio_length') {
        outputOptions.push(`-t ${effectiveAudioDuration}`);
      }

      command.outputOptions(outputOptions);

      command
        .on('start', (commandLine) => {
          console.log('▶️  FFmpeg command:');
          console.log(`   ${commandLine}`);
          console.log('⏳ Processing...');
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r⏳ Progress: ${Math.floor(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ Ghép audio thành công!');
          console.log(`📁 File output: ${outputPath}`);
          
          // Verify output
          getMediaInfo(outputPath).then(outputInfo => {
            const outputDur = parseFloat(outputInfo.format.duration);
            console.log(`📊 Output duration: ${outputDur.toFixed(1)}s`);
            console.log(`🎵 Audio streams: ${outputInfo.streams.filter(s => s.codec_type === 'audio').length}`);
            console.log(`📹 Video streams: ${outputInfo.streams.filter(s => s.codec_type === 'video').length}`);
          });
          
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

  } catch (error) {
    console.error('❌ Lỗi khi phân tích media:', error.message);
    throw error;
  }
}

/**
 * Test function để kiểm tra media info
 */
async function analyzeMedia() {
  const videoPath = './videos/final_video_with_subtitle.mp4';
  const audioPath = './audio/output.mp3';
  
  try {
    if (fs.existsSync(videoPath)) {
      console.log('📹 VIDEO INFO:');
      const videoInfo = await getMediaInfo(videoPath);
      console.log(`   Duration: ${parseFloat(videoInfo.format.duration).toFixed(1)}s`);
      console.log(`   Format: ${videoInfo.format.format_name}`);
      console.log(`   Streams: ${videoInfo.streams.length}`);
      videoInfo.streams.forEach((stream, i) => {
        console.log(`     Stream ${i}: ${stream.codec_type} - ${stream.codec_name}`);
      });
    }
    
    if (fs.existsSync(audioPath)) {
      console.log('\n🎵 AUDIO INFO:');
      const audioInfo = await getMediaInfo(audioPath);
      console.log(`   Duration: ${parseFloat(audioInfo.format.duration).toFixed(1)}s`);
      console.log(`   Format: ${audioInfo.format.format_name}`);
      console.log(`   Channels: ${audioInfo.streams[0]?.channels || 'Unknown'}`);
      console.log(`   Sample rate: ${audioInfo.streams[0]?.sample_rate || 'Unknown'}Hz`);
    }
    
  } catch (error) {
    console.error('❌ Error analyzing media:', error.message);
  }
}

export {
    analyzeMedia, getMediaInfo, mergeAudioToVideoEnhanced
};
