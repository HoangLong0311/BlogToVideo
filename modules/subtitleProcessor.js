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
    
    // 1. Fix format thiếu milliseconds (hh:mm:ss -> hh:mm:ss,000)
    content = content.replace(
      /(\d{2}:\d{2}:\d{2})\s*(-->)\s*(\d{2}:\d{2}:\d{2})(?![,\d])/g,
      (match, start_time, arrow, end_time) => {
        const fixed = `${start_time},000 ${arrow} ${end_time},000`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Added missing milliseconds: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 2. Fix format thiếu giờ - xử lý đơn giản từng pattern
    // Pattern: mm:ss,ms --> 00:mm:ss,ms
    content = content.replace(
      /(?:^|\n)(\d{1,2}):(\d{2}),(\d{3})\s*(-->)\s*(\d{1,2}):(\d{2}),(\d{3})(?=\s*$)/gm,
      (match, start_min, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        const fixed = `00:${start_min.padStart(2, '0')}:${start_sec},${start_ms} ${arrow} 00:${end_min.padStart(2, '0')}:${end_sec},${end_ms}`;
        if (fixed !== match.trim()) {
          modified = true;
          console.log(`🔧 Added missing hour: ${match.trim()} → ${fixed}`);
        }
        return match.startsWith('\n') ? '\n' + fixed : fixed;
      }
    );

    // 2b. Fix mixed format - start có giờ, end thiếu giờ  
    content = content.replace(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*(-->)\s*(\d{1,2}):(\d{2}),(\d{3})/g,
      (match, start_time, arrow, end_min, end_sec, end_ms) => {
        const fixed = `${start_time} ${arrow} 00:${end_min.padStart(2, '0')}:${end_sec},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed mixed format (start has hour, end missing): ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 2c. Fix critical timeline break - end thiếu giây gây nhảy lên giờ
    content = content.replace(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*(-->)\s*(\d{2}):(\d{2}),(\d{3})/g,
      (match, start_time, arrow, end_hour, end_min, end_ms) => {
        // Kiểm tra nếu end_hour thực ra là phút (01:00,000 -> 00:01:00,000)
        const startParts = start_time.split(/[:,]/);
        const startTotalSeconds = parseInt(startParts[0]) * 3600 + parseInt(startParts[1]) * 60 + parseInt(startParts[2]);
        
        // Nếu end_hour <= 59 và có khả năng là phút thay vì giờ
        if (parseInt(end_hour) <= 59) {
          const fixed = `${start_time} ${arrow} 00:${end_hour.padStart(2, '0')}:${end_min.padStart(2, '0')},${end_ms}`;
          if (fixed !== match) {
            modified = true;
            console.log(`🔧 Fixed timeline break (end missing seconds): ${match} → ${fixed}`);
            console.log(`   Converted ${end_hour}:${end_min} → 00:${end_hour}:${end_min} (hour→minute:second)`);
          }
          return fixed;
        }
        return match;
      }
    );

    // 2d. Fix abnormal timeline jumps - detect và fix timeline inconsistency
    content = content.replace(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*(-->)\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/g,
      (match, start_time, arrow, end_hour, end_min, end_sec, end_ms) => {
        const startParts = start_time.split(/[:,]/);
        const startTotalSeconds = parseInt(startParts[0]) * 3600 + parseInt(startParts[1]) * 60 + parseInt(startParts[2]);
        const endTotalSeconds = parseInt(end_hour) * 3600 + parseInt(end_min) * 60 + parseInt(end_sec);
        
        // Nếu end time quá xa so với start time (> 5 phút gap) và start < 5 phút
        if (startTotalSeconds < 300 && endTotalSeconds > startTotalSeconds + 300) {
          // Có thể là lỗi format: 01:01:14,500 thực ra là 00:01:14,500
          if (parseInt(end_hour) === 1 && parseInt(end_min) <= 59) {
            const fixed = `${start_time} ${arrow} 00:${end_min.padStart(2, '0')}:${end_sec.padStart(2, '0')},${end_ms}`;
            if (fixed !== match) {
              modified = true;
              console.log(`🔧 Fixed abnormal timeline jump: ${match} → ${fixed}`);
              console.log(`   Detected suspicious jump: ${Math.floor(startTotalSeconds/60)}m${startTotalSeconds%60}s → ${Math.floor(endTotalSeconds/60)}m${endTotalSeconds%60}s`);
            }
            return fixed;
          }
        }
        return match;
      }
    );
    
    // Pattern: mm:s,ms --> 00:mm:0s,ms (giây 1 chữ số)
    content = content.replace(
      /(?:^|\n)(\d{1,2}):(\d{1}),(\d{3})\s*(-->)\s*(\d{1,2}):(\d{1,3}),(\d{3})(?=\s*$)/gm,
      (match, start_min, start_sec, start_ms, arrow, end_min, end_sec_or_min, end_ms) => {
        let fixedEnd;
        if (end_sec_or_min.length <= 2) {
          fixedEnd = `00:${end_min.padStart(2, '0')}:${end_sec_or_min.padStart(2, '0')},${end_ms}`;
        } else {
          // Trường hợp như 01:00,800 -> end_min=01, end_sec_or_min=00, end_ms=800
          fixedEnd = `00:${end_min.padStart(2, '0')}:${end_sec_or_min},${end_ms}`;
        }
        const fixed = `00:${start_min.padStart(2, '0')}:0${start_sec},${start_ms} ${arrow} ${fixedEnd}`;
        if (fixed !== match.trim()) {
          modified = true;
          console.log(`🔧 Fixed single digit format: ${match.trim()} → ${fixed}`);
        }
        return match.startsWith('\n') ? '\n' + fixed : fixed;
      }
    );

    // 3. Fix format đầy đủ - chuẩn hóa milliseconds và seconds  
    content = content.replace(
      /(\d{2}:\d{2}:\d{1,2}),(\d{1,3})\s*(-->)\s*(\d{2}:\d{2}:\d{1,2}),(\d{1,3})/g,
      (match, start_time, start_ms, arrow, end_time, end_ms) => {
        // Pad seconds to 2 digits
        start_time = start_time.replace(/(\d{2}:\d{2}:)(\d{1})$/, '$10$2');
        end_time = end_time.replace(/(\d{2}:\d{2}:)(\d{1})$/, '$10$2');
        
        // Ensure milliseconds are exactly 3 digits
        start_ms = start_ms.padEnd(3, '0').substring(0, 3);
        end_ms = end_ms.padEnd(3, '0').substring(0, 3);
        
        const fixed = `${start_time},${start_ms} ${arrow} ${end_time},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed timing format: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );
    
    // 4. Fix mixed format trong cùng một line (vd: 00:53:8,800 --> 01:00,800)
    content = content.replace(
      /(\d{2}:\d{2}:\d{1}),(\d{3})\s*(-->)\s*(\d{1,2}):(\d{2}),(\d{3})/g,
      (match, start_time, start_ms, arrow, end_min, end_sec, end_ms) => {
        // Fix start time - pad seconds
        const fixedStart = start_time.replace(/(\d{2}:\d{2}:)(\d{1})$/, '$10$2');
        // Fix end time - add missing hour
        const fixedEnd = `00:${end_min.padStart(2, '0')}:${end_sec},${end_ms}`;
        const fixed = `${fixedStart},${start_ms} ${arrow} ${fixedEnd}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed mixed format: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );
    
    // 5. Fix format mm:ss,s --> 00:mm:ss,s00 (milliseconds không đủ 3 chữ số)
    content = content.replace(
      /(?:^|\n)(\d{1,2}):(\d{2}),(\d{1,2})\s*(-->)\s*(\d{1,2}):(\d{2}),(\d{1,2})(?=\s*$)/gm,
      (match, start_min, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        const fixed = `00:${start_min.padStart(2, '0')}:${start_sec},${start_ms.padEnd(3, '0')} ${arrow} 00:${end_min.padStart(2, '0')}:${end_sec},${end_ms.padEnd(3, '0')}`;
        if (fixed !== match.trim()) {
          modified = true;
          console.log(`🔧 Fixed short milliseconds: ${match.trim()} → ${fixed}`);
        }
        return match.startsWith('\n') ? '\n' + fixed : fixed;
      }
    );
    
    // 6. Fix invalid format mm:ss:sss (dấu : thay vì , cho milliseconds)
    content = content.replace(
      /(\d{1,2}):(\d{2}):(\d{3})\s*(-->)\s*(\d{1,2}):(\d{2}),(\d{3})/g,
      (match, start_min, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        const fixed = `00:${start_min.padStart(2, '0')}:${start_sec},${start_ms} ${arrow} 00:${end_min.padStart(2, '0')}:${end_sec},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed colon format: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );
    
    // 7. Fix invalid format hh:mm:sss (dấu : cho milliseconds trong format đầy đủ)
    content = content.replace(
      /(\d{2}):(\d{2}):(\d{2}):(\d{3})\s*(-->)\s*(\d{1,2}):(\d{2}),(\d{3})/g,
      (match, start_hour, start_min, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        const fixed = `${start_hour}:${start_min}:${start_sec},${start_ms} ${arrow} 00:${end_min.padStart(2, '0')}:${end_sec},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed full colon format: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );
    
    // 8. Fix cascade timeline - cue bắt đầu với 01:00:xx thay vì 00:01:xx  
    content = content.replace(
      /01:00:(\d{2}),(\d{3})\s*(-->)\s*01:00:(\d{2}),(\d{3})/g,
      (match, start_sec, start_ms, arrow, end_sec, end_ms) => {
        const fixed = `00:01:${start_sec},${start_ms} ${arrow} 00:01:${end_sec},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed cascade timeline (01:00:xx → 00:01:xx): ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 8b. Fix extended cascade - cue với format 01:01:xx, 01:02:xx pattern
    content = content.replace(
      /01:0([1-9]):(\d{2}),(\d{3})\s*(-->)\s*01:0([1-9]):(\d{2}),(\d{3})/g,
      (match, start_min, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        const fixed = `00:0${start_min}:${start_sec},${start_ms} ${arrow} 00:0${end_min}:${end_sec},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed extended cascade (01:0${start_min}:xx → 00:0${start_min}:xx): ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 8c. Fix general hour-to-minute cascade (01:XX:XX → 00:XX:XX for first few minutes)
    content = content.replace(
      /01:([0-5]\d):(\d{2}),(\d{3})\s*(-->)\s*01:([0-5]\d):(\d{2}),(\d{3})/g,
      (match, start_min, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        const fixed = `00:${start_min}:${start_sec},${start_ms} ${arrow} 00:${end_min}:${end_sec},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed hour-to-minute cascade (01:${start_min}:${start_sec} → 00:${start_min}:${start_sec}): ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 9. Fix special format mm:sss,ms (phút bình thường, "giây" 3 chữ số)
    content = content.replace(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*(-->)\s*(\d{1,2}):(\d{3}),(\d{3})/g,
      (match, start_time, arrow, end_min, end_fake_sec, end_ms) => {
        // Chuyển đổi end_fake_sec (3 chữ số) thành phút:giây
        const minutes = Math.floor(parseInt(end_fake_sec) / 100); // Chữ số đầu là phút  
        const seconds = parseInt(end_fake_sec) % 100;             // 2 chữ số cuối là giây
        
        const fixed = `${start_time} ${arrow} 00:${(parseInt(end_min) + minutes).toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed special mm:sss format: ${match} → ${fixed}`);
          console.log(`   Converted ${end_fake_sec} → ${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
        return fixed;
      }
    );

    // 10. Fix remaining mm:ss,ms patterns (thiếu giờ) - final catch
    content = content.replace(
      /(?:^|\n)(\d{1,2}):(\d{2}),(\d{3})\s*(-->)\s*(\d{1,2}):(\d{2}),(\d{3})(?=\s*$)/gm,
      (match, start_min, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        // Chỉ fix nếu chưa có giờ (không bắt đầu với 00:)
        if (!match.trim().startsWith('00:')) {
          const fixed = `00:${start_min.padStart(2, '0')}:${start_sec},${start_ms} ${arrow} 00:${end_min.padStart(2, '0')}:${end_sec},${end_ms}`;
          if (fixed !== match.trim()) {
            modified = true;
            console.log(`🔧 Added missing hour (final): ${match.trim()} → ${fixed}`);
          }
          return match.startsWith('\n') ? '\n' + fixed : fixed;
        }
        return match;
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