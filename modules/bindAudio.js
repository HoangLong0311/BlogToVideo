// bindAudio.js - Module ghép audio vào video với độ dài theo video gốc
import ffmpegStatic from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Ghép audio vào video với yêu cầu mặc định:
 * - Độ dài video final = độ dài video gốc
 * - Audio dài hơn thì cắt ngắn, ngắn hơn thì hết sớm
 * - Lưu video final vào folder videos
 */
class AudioBinder {
  constructor() {
    this.videosDir = './videos';
    this.audioDir = './audio';
    this.defaultAudioFile = 'output.mp3';
  }

  /**
   * Tìm tất cả video files trong folder videos (loại trừ final output)
   */
  async findVideoFiles() {
    try {
      if (!fs.existsSync(this.videosDir)) {
        throw new Error(`Videos directory not found: ${this.videosDir}`);
      }

      const files = fs.readdirSync(this.videosDir);
      const videoFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.avi', '.mov', '.mkv', '.wmv'].includes(ext) && 
               !file.includes('final_video_with_audio'); // Loại trừ output files
      });

      console.log(`📁 Found ${videoFiles.length} video files:`);
      videoFiles.forEach(file => console.log(`   - ${file}`));

      return videoFiles.map(file => path.join(this.videosDir, file));
    } catch (error) {
      throw new Error(`Error finding video files: ${error.message}`);
    }
  }

  /**
   * Ghép audio vào một video cụ thể
   */
  async bindAudioToVideo(videoPath, options = {}) {
    const {
      audioPath = path.join(this.audioDir, this.defaultAudioFile),
      outputPath = null,
      audioDelay = 0,
      videoCodec = 'copy', // Copy để giữ chất lượng và tốc độ
      audioCodec = 'aac',
      audioBitrate = '128k'
    } = options;

    // Kiểm tra files tồn tại
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Tạo output path nếu không được cung cấp
    const finalOutputPath = outputPath || this.generateOutputPath(videoPath);

    console.log('🎬 BINDING AUDIO TO VIDEO');
    console.log('========================');
    console.log(`📹 Video: ${videoPath}`);
    console.log(`🎵 Audio: ${audioPath}`);
    console.log(`📁 Output: ${finalOutputPath}`);
    if (audioDelay > 0) {
      console.log(`⏰ Audio delay: ${audioDelay}s`);
    }
    console.log('📏 Duration: Match video length (audio will be cut/fit)');
    console.log('⏳ Processing...\n');

    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .audioBitrate(audioBitrate)
        .audioChannels(2)
        .audioFrequency(44100);

      // Xử lý audio delay nếu có
      if (audioDelay > 0) {
        command.complexFilter([
          {
            filter: 'adelay',
            options: `${audioDelay * 1000}|${audioDelay * 1000}`, // Convert to milliseconds for stereo
            inputs: '1:a',
            outputs: 'delayed_audio'
          }
        ]);
        
        command.outputOptions([
          '-map 0:v:0',                    // Map video from first input
          '-map [delayed_audio]',          // Map delayed audio
          '-shortest',                     // Video duration controls final length
          '-avoid_negative_ts make_zero'   // Handle timing issues
        ]);
      } else {
        command.outputOptions([
          '-map 0:v:0',                    // Map video from first input
          '-map 1:a:0',                    // Map audio from second input
          '-shortest',                     // Video duration controls final length
          '-avoid_negative_ts make_zero'   // Handle timing issues
        ]);
      }

      command
        .on('start', (commandLine) => {
          console.log('🚀 FFmpeg started...');
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r⏳ Progress: ${Math.floor(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('\n✅ Audio binding completed successfully!');
          console.log(`📁 Output saved: ${finalOutputPath}`);
          
          // Verify output file
          if (fs.existsSync(finalOutputPath)) {
            const stats = fs.statSync(finalOutputPath);
            console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
          }
          
          resolve(finalOutputPath);
        })
        .on('error', (err, stdout, stderr) => {
          console.error('\n❌ Error during audio binding:', err.message);
          if (stderr) {
            console.error('FFmpeg stderr:', stderr.slice(-200));
          }
          reject(err);
        })
        .save(finalOutputPath);
    });
  }

  /**
   * Ghép audio vào tất cả video files tìm được
   */
  async bindAudioToAllVideos(options = {}) {
    try {
      const videoFiles = await this.findVideoFiles();
      
      if (videoFiles.length === 0) {
        console.log('⚠️  No video files found to bind audio');
        return [];
      }

      console.log(`\n🎬 BATCH AUDIO BINDING`);
      console.log(`======================`);
      console.log(`📊 Processing ${videoFiles.length} video files...\n`);

      const results = [];
      
      for (let i = 0; i < videoFiles.length; i++) {
        const videoFile = videoFiles[i];
        console.log(`📝 Processing ${i + 1}/${videoFiles.length}: ${path.basename(videoFile)}`);
        
        try {
          const outputPath = await this.bindAudioToVideo(videoFile, options);
          results.push({
            success: true,
            input: videoFile,
            output: outputPath
          });
          console.log(`✅ Completed: ${path.basename(outputPath)}\n`);
        } catch (error) {
          console.error(`❌ Failed: ${error.message}\n`);
          results.push({
            success: false,
            input: videoFile,
            error: error.message
          });
        }
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`\n📊 BATCH PROCESSING SUMMARY`);
      console.log(`===========================`);
      console.log(`✅ Successful: ${successful}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`📁 Total processed: ${results.length}`);

      if (successful > 0) {
        console.log(`\n🎉 Successfully created video files with audio:`);
        results.filter(r => r.success).forEach(r => {
          console.log(`   - ${path.basename(r.output)}`);
        });
      }

      return results;
    } catch (error) {
      throw new Error(`Batch processing failed: ${error.message}`);
    }
  }

  /**
   * Ghép audio cho một video cụ thể bằng tên file
   */
  async bindAudioByFileName(videoFileName, options = {}) {
    const videoPath = path.join(this.videosDir, videoFileName);
    return this.bindAudioToVideo(videoPath, options);
  }

  /**
   * Tạo output path từ video path
   */
  generateOutputPath(videoPath) {
    const dir = path.dirname(videoPath);
    const name = path.basename(videoPath, path.extname(videoPath));
    const ext = path.extname(videoPath);
    return path.join(dir, `${name}_with_audio${ext}`);
  }

  /**
   * Lấy thông tin video và audio để phân tích
   */
  async getMediaInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  /**
   * Phân tích và hiển thị thông tin trước khi xử lý
   */
  async analyzeBeforeBinding(videoPath, audioPath) {
    try {
      console.log('📊 MEDIA ANALYSIS BEFORE BINDING');
      console.log('================================');
      
      const videoInfo = await this.getMediaInfo(videoPath);
      const audioInfo = await this.getMediaInfo(audioPath);
      
      const videoDuration = parseFloat(videoInfo.format.duration);
      const audioDuration = parseFloat(audioInfo.format.duration);
      
      console.log(`📹 Video: ${path.basename(videoPath)}`);
      console.log(`   Duration: ${videoDuration.toFixed(1)}s`);
      console.log(`   Format: ${videoInfo.format.format_name}`);
      console.log(`   Size: ${(parseInt(videoInfo.format.size) / 1024 / 1024).toFixed(1)} MB`);
      
      console.log(`🎵 Audio: ${path.basename(audioPath)}`);
      console.log(`   Duration: ${audioDuration.toFixed(1)}s`);
      console.log(`   Format: ${audioInfo.format.format_name}`);
      console.log(`   Size: ${(parseInt(audioInfo.format.size) / 1024 / 1024).toFixed(1)} MB`);
      
      console.log(`\n💡 BINDING PREDICTION:`);
      console.log(`   Final video duration: ${videoDuration.toFixed(1)}s (matches video)`);
      
      if (audioDuration > videoDuration) {
        console.log(`   Audio action: Cut ${(audioDuration - videoDuration).toFixed(1)}s (audio too long)`);
      } else if (audioDuration < videoDuration) {
        console.log(`   Audio action: Silent for last ${(videoDuration - audioDuration).toFixed(1)}s (audio too short)`);
      } else {
        console.log(`   Audio action: Perfect match, no adjustment needed`);
      }
      
      return { videoDuration, audioDuration };
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    }
  }
}

// Export default instance và class
const audioBinder = new AudioBinder();

export { AudioBinder, audioBinder };
export default audioBinder;