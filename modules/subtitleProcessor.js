// Enhanced subtitle processor với các fix chính
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { ffmpeg } from "../config/ffmpegConfig.js";

const execAsync = promisify(exec);

// Enhanced subtitle validation
function validateSubtitleFileEnhanced(subtitlePath) {
  if (!fs.existsSync(subtitlePath)) {
    throw new Error(`File subtitle không tồn tại: ${subtitlePath}`);
  }
  
  const stats = fs.statSync(subtitlePath);
  if (stats.size === 0) {
    throw new Error(`File subtitle rỗng: ${subtitlePath}`);
  }
  
  if (stats.size > 10 * 1024 * 1024) { // > 10MB
    throw new Error(`File subtitle quá lớn (${(stats.size / 1024 / 1024).toFixed(2)}MB). Max: 10MB`);
  }
  
  const ext = path.extname(subtitlePath).toLowerCase();
  const supportedExts = ['.srt', '.ass', '.ssa', '.vtt'];
  if (!supportedExts.includes(ext)) {
    throw new Error(`Định dạng subtitle không hỗ trợ: ${ext}. Hỗ trợ: ${supportedExts.join(', ')}`);
  }
  
  // Enhanced SRT format validation
  if (ext === '.srt') {
    const content = fs.readFileSync(subtitlePath, 'utf8');
    const lines = content.split('\n');
    
    // Check basic SRT structure
    let hasValidTimecode = false;
    for (const line of lines) {
      // Look for timecode pattern: 00:00:00,000 --> 00:00:00,000
      if (/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(line)) {
        hasValidTimecode = true;
        break;
      }
    }
    
    if (!hasValidTimecode) {
      console.log("⚠️ CẢNH BÁO: Subtitle format có thể không chuẩn SRT");
      console.log("   Ví dụ format đúng: 00:00:08,200 --> 00:00:10,000");
    }
  }
  
  console.log(`✅ Subtitle hợp lệ: ${path.basename(subtitlePath)} (${(stats.size / 1024).toFixed(2)}KB)`);
}

// Fix SRT timing format
function fixSrtFormat(subtitlePath) {
  const ext = path.extname(subtitlePath).toLowerCase();
  if (ext !== '.srt') return subtitlePath;
  
  try {
    let content = fs.readFileSync(subtitlePath, 'utf8');
    let modified = false;
    
    // Fix common timing format issues
    content = content.replace(
      /(\d{2}:\d{2}:\d{1,2}),?(\d{3}?)\s*->\s*(\d{2}:\d{2}:\d{1,2}),?(\d{3}?)/g,
      (match, start_time, start_ms, end_time, end_ms) => {
        // Pad seconds to 2 digits
        start_time = start_time.replace(/(\d{2}:\d{2}:)(\d{1})$/, '$10$2');
        end_time = end_time.replace(/(\d{2}:\d{2}:)(\d{1})$/, '$10$2');
        
        // Ensure milliseconds are 3 digits
        start_ms = (start_ms || '000').padEnd(3, '0');
        end_ms = (end_ms || '000').padEnd(3, '0');
        
        const fixed = `${start_time},${start_ms} --> ${end_time},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed timing: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );
    
    if (modified) {
      const fixedPath = subtitlePath.replace('.srt', '_fixed.srt');
      fs.writeFileSync(fixedPath, content, 'utf8');
      console.log(`✅ Created fixed subtitle: ${path.basename(fixedPath)}`);
      return fixedPath;
    }
    
    return subtitlePath;
    
  } catch (error) {
    console.log(`⚠️ Không thể fix format SRT: ${error.message}`);
    return subtitlePath;
  }
}

// Safe path processing for Windows
function createSafePath(filePath, tempDir) {
  // Create a safe copy with ASCII name
  const ext = path.extname(filePath);
  const safeName = `temp_subtitle_${Date.now()}${ext}`;
  const safePath = path.join(tempDir, safeName);
  
  fs.copyFileSync(filePath, safePath);
  console.log(`🔒 Created safe path: ${safeName}`);
  
  return safePath;
}

// Enhanced subtitle processor
export async function addSubtitleToVideoEnhanced(videoPath, subtitlePath, outputPath, method = 'hardburn') {
  return new Promise(async (resolve, reject) => {
    console.log(`📝 Bắt đầu gắn subtitle (Enhanced, phương pháp: ${method})...`);
    
    let tempFiles = [];
    let activeCommand = null;
    
    const cleanup = () => {
      // Graceful cleanup
      if (activeCommand && activeCommand.ffmpegProc && !activeCommand.ffmpegProc.killed) {
        console.log("🛑 Gracefully stopping FFmpeg...");
        activeCommand.ffmpegProc.kill('SIGTERM'); // Graceful first
        
        setTimeout(() => {
          if (activeCommand && activeCommand.ffmpegProc && !activeCommand.ffmpegProc.killed) {
            console.log("🔪 Force killing FFmpeg...");
            activeCommand.ffmpegProc.kill('SIGKILL');
          }
        }, 5000); // 5 seconds grace period
      }
      
      // Clean temp files
      tempFiles.forEach(file => {
        try {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`🗑️ Cleaned temp file: ${path.basename(file)}`);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    };
    
    try {
      // Enhanced validation
      if (!fs.existsSync(videoPath)) {
        throw new Error(`File video không tồn tại: ${videoPath}`);
      }
      
      validateSubtitleFileEnhanced(subtitlePath);
      
      // Check output path conflict
      if (fs.existsSync(outputPath)) {
        console.log(`⚠️ Output file exists, will overwrite: ${path.basename(outputPath)}`);
      }
      
      // Fix subtitle format
      const fixedSubtitlePath = fixSrtFormat(subtitlePath);
      
      // Create temp directory for safe paths
      const tempDir = path.join(path.dirname(outputPath), '.temp_subtitle');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      tempFiles.push(tempDir);
      
      if (method === 'hardburn') {
        console.log('🔥 Enhanced HARDBURN method...');
        
        // Create safe path copy
        const safeSubtitlePath = createSafePath(fixedSubtitlePath, tempDir);
        tempFiles.push(safeSubtitlePath);
        
        // Use absolute path với proper escaping for Windows
        const absoluteSubtitlePath = safeSubtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
        
        console.log(`🔧 Using absolute path: ${absoluteSubtitlePath}`);
        
        // Single, robust hardburn attempt
        activeCommand = ffmpeg()
          .input(videoPath)
          .videoFilters([`subtitles='${absoluteSubtitlePath}'`])
          .outputOptions([
            '-c:a copy',
            '-crf 23',
            '-preset fast', // Faster than medium
            '-max_muxing_queue_size 1024',
            '-avoid_negative_ts make_zero',
            '-threads 0' // Use all CPU cores
          ]);
        
        // Reasonable timeout (3 minutes)
        const timeoutId = setTimeout(() => {
          console.log('\n⏰ Hardburn timeout (3 min), stopping...');
          cleanup();
          reject(new Error('Hardburn timeout sau 3 phút'));
        }, 3 * 60 * 1000);
        
        activeCommand
          .on('start', (cmd) => {
            console.log('▶️ Starting enhanced hardburn...');
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              process.stdout.write(`\r🔥 Hardburn: ${Math.round(progress.percent)}%`);
            }
          })
          .on('error', (err) => {
            clearTimeout(timeoutId);
            console.log(`\n❌ Hardburn failed: ${err.message}`);
            
            // Try fallback to embed
            console.log('🔄 Trying embed fallback...');
            addSubtitleToVideoEnhanced(videoPath, subtitlePath, outputPath, 'embed')
              .then(resolve)
              .catch(reject)
              .finally(cleanup);
          })
          .on('end', () => {
            clearTimeout(timeoutId);
            console.log('\n✅ Enhanced hardburn completed!');
            cleanup();
            resolve(outputPath);
          })
          .save(outputPath);
          
      } else if (method === 'embed') {
        console.log('💎 Enhanced EMBED method...');
        
        activeCommand = ffmpeg()
          .input(videoPath)
          .input(fixedSubtitlePath)
          .outputOptions([
            '-c:v copy',
            '-c:a copy',
            '-c:s mov_text',
            '-disposition:s:0 default',
            '-metadata:s:s:0 language=vie',
            '-metadata:s:s:0 title=Vietnamese'
          ]);
        
        const timeoutId = setTimeout(() => {
          console.log('\n⏰ Embed timeout, trying sidecar...');
          cleanup();
          addSubtitleToVideoEnhanced(videoPath, subtitlePath, outputPath, 'sidecar')
            .then(resolve)
            .catch(reject);
        }, 2 * 60 * 1000); // 2 minutes
        
        activeCommand
          .on('start', () => console.log('▶️ Starting embed...'))
          .on('progress', (progress) => {
            if (progress.percent) {
              process.stdout.write(`\r💎 Embed: ${Math.round(progress.percent)}%`);
            }
          })
          .on('error', (err) => {
            clearTimeout(timeoutId);
            console.log(`\n❌ Embed failed: ${err.message}`);
            console.log('🔄 Fallback to sidecar...');
            cleanup();
            addSubtitleToVideoEnhanced(videoPath, subtitlePath, outputPath, 'sidecar')
              .then(resolve)
              .catch(reject);
          })
          .on('end', () => {
            clearTimeout(timeoutId);
            console.log('\n✅ Enhanced embed completed!');
            cleanup();
            resolve(outputPath);
          })
          .save(outputPath);
          
      } else if (method === 'sidecar') {
        console.log('📋 Enhanced SIDECAR method...');
        
        // Create sidecar file
        const sidecarPath = outputPath.replace(/\.(mp4|mkv|avi)$/i, '.srt');
        fs.copyFileSync(fixedSubtitlePath, sidecarPath);
        console.log(`📋 Created sidecar: ${path.basename(sidecarPath)}`);
        
        // Just copy video
        activeCommand = ffmpeg()
          .input(videoPath)
          .outputOptions(['-c:v copy', '-c:a copy']);
        
        const timeoutId = setTimeout(() => {
          console.log('\n⏰ Sidecar timeout!');
          cleanup();
          reject(new Error('Sidecar timeout'));
        }, 1 * 60 * 1000); // 1 minute
        
        activeCommand
          .on('start', () => console.log('▶️ Creating sidecar...'))
          .on('progress', (progress) => {
            if (progress.percent) {
              process.stdout.write(`\r📋 Sidecar: ${Math.round(progress.percent)}%`);
            }
          })
          .on('error', (err) => {
            clearTimeout(timeoutId);
            console.log(`\n❌ Sidecar failed: ${err.message}`);
            cleanup();
            reject(err);
          })
          .on('end', () => {
            clearTimeout(timeoutId);
            console.log('\n✅ Enhanced sidecar completed!');
            cleanup();
            resolve(outputPath);
          })
          .save(outputPath);
      }
      
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}