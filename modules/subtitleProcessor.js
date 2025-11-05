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

    // 10. Fix invalid seconds (>59) - critical timing fix
    content = content.replace(
      /(\d{2}:\d{2}:)(\d{2}),(\d{3})\s*(-->)\s*(\d{2}:\d{2}:)(\d{2}),(\d{3})/g,
      (match, start_prefix, start_sec, start_ms, arrow, end_prefix, end_sec, end_ms) => {
        let fixed = match;
        let startSecInt = parseInt(start_sec);
        let endSecInt = parseInt(end_sec);
        
        if (startSecInt > 59) {
          // Convert excess seconds to minutes
          const extraMin = Math.floor(startSecInt / 60);
          const realSec = startSecInt % 60;
          const timeParts = start_prefix.split(':');
          const newMin = parseInt(timeParts[1]) + extraMin;
          start_prefix = `${timeParts[0]}:${newMin.toString().padStart(2, '0')}:`;
          start_sec = realSec.toString().padStart(2, '0');
          
          modified = true;
          console.log(`🔧 Fixed invalid seconds (start): ${startSecInt}s → ${newMin}:${realSec}`);
        }
        
        if (endSecInt > 59) {
          // Convert excess seconds to minutes
          const extraMin = Math.floor(endSecInt / 60);
          const realSec = endSecInt % 60;
          const timeParts = end_prefix.split(':');
          const newMin = parseInt(timeParts[1]) + extraMin;
          end_prefix = `${timeParts[0]}:${newMin.toString().padStart(2, '0')}:`;
          end_sec = realSec.toString().padStart(2, '0');
          
          modified = true;
          console.log(`🔧 Fixed invalid seconds (end): ${endSecInt}s → ${newMin}:${realSec}`);
        }
        
        const result = `${start_prefix}${start_sec},${start_ms} ${arrow} ${end_prefix}${end_sec},${end_ms}`;
        return result;
      }
    );

    // 11. Fix malformed 3-digit seconds - 064 -> 04
    content = content.replace(
      /(\d{2}:\d{2}:)0(\d{2}),(\d{3})\s*(-->)\s*(\d{1,2}):0(\d{2}),(\d{3})/g,
      (match, start_prefix, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        const fixed = `${start_prefix}${start_sec},${start_ms} ${arrow} 00:${end_min.padStart(2, '0')}:${end_sec},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed 3-digit seconds: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 12. Fix missing milliseconds pattern: HH:MM:SS --> HH:MM:SS,000  
    content = content.replace(
      /(\d{2}:\d{2}:\d{2})\s*(-->)\s*(\d{2}:\d{2}:\d{2})(?![,:])/g,
      (match, start_time, arrow, end_time) => {
        const fixed = `${start_time},000 ${arrow} ${end_time},000`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Added missing milliseconds: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 13. Fix extreme seconds (100+, 400+) - convert to minutes:seconds
    content = content.replace(
      /(\d{2}:\d{2}:)(\d{3,}),?(\d{0,3})\s*(-->)\s*(\d{2}:\d{2}:)(\d{3,}),?(\d{0,3})/g,
      (match, start_prefix, start_extreme_sec, start_ms, arrow, end_prefix, end_extreme_sec, end_ms) => {
        // Handle start time
        const startSecInt = parseInt(start_extreme_sec);
        const startExtraMin = Math.floor(startSecInt / 60);
        const startRealSec = startSecInt % 60;
        const startTimeParts = start_prefix.split(':');
        const startNewMin = parseInt(startTimeParts[1]) + startExtraMin;
        const startNewHour = Math.floor(startNewMin / 60);
        const startFinalMin = startNewMin % 60;
        const startFinalHour = (parseInt(startTimeParts[0]) + startNewHour).toString().padStart(2, '0');
        
        // Handle end time  
        const endSecInt = parseInt(end_extreme_sec);
        const endExtraMin = Math.floor(endSecInt / 60);
        const endRealSec = endSecInt % 60;
        const endTimeParts = end_prefix.split(':');
        const endNewMin = parseInt(endTimeParts[1]) + endExtraMin;
        const endNewHour = Math.floor(endNewMin / 60);
        const endFinalMin = endNewMin % 60;
        const endFinalHour = (parseInt(endTimeParts[0]) + endNewHour).toString().padStart(2, '0');
        
        // Fix milliseconds
        start_ms = start_ms ? start_ms.padEnd(3, '0').substring(0, 3) : '000';
        end_ms = end_ms ? end_ms.padEnd(3, '0').substring(0, 3) : '000';
        
        const fixed = `${startFinalHour}:${startFinalMin.toString().padStart(2, '0')}:${startRealSec.toString().padStart(2, '0')},${start_ms} ${arrow} ${endFinalHour}:${endFinalMin.toString().padStart(2, '0')}:${endRealSec.toString().padStart(2, '0')},${end_ms}`;
        
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed extreme seconds: ${match} → ${fixed}`);
          console.log(`   Start: ${start_extreme_sec}s → ${startFinalHour}:${startFinalMin.toString().padStart(2, '0')}:${startRealSec.toString().padStart(2, '0')}`);
          console.log(`   End: ${end_extreme_sec}s → ${endFinalHour}:${endFinalMin.toString().padStart(2, '0')}:${endRealSec.toString().padStart(2, '0')}`);
        }
        
        return fixed;
      }
    );
    
    // 11b. Fix extreme invalid seconds in 3-digit format (100+, 400+)
    content = content.replace(
      /(\d{2}:\d{2}:)(\d{3}),(\d{3})\s*(-->)\s*(\d{1,2}):(\d{3}),(\d{3})/g,
      (match, start_prefix, start_3digit, start_ms, arrow, end_min, end_3digit, end_ms) => {
        let fixedStart = start_prefix;
        let fixedEnd = `00:${end_min.padStart(2, '0')}:`;
        let fixedStartSec = start_3digit;
        let fixedEndSec = end_3digit;
        
        // Handle start time with extreme seconds (100+, 400+)
        const startSeconds = parseInt(start_3digit);
        if (startSeconds >= 100) {
          const extraMin = Math.floor(startSeconds / 60);
          const realSec = startSeconds % 60;
          const timeParts = start_prefix.split(':');
          const newMin = parseInt(timeParts[1]) + extraMin;
          fixedStart = `${timeParts[0]}:${newMin.toString().padStart(2, '0')}:`;
          fixedStartSec = realSec.toString().padStart(2, '0');
          
          modified = true;
          console.log(`🔧 Fixed extreme start seconds: ${startSeconds}s → ${extraMin}m ${realSec}s`);
        } else if (start_3digit.startsWith('0')) {
          fixedStartSec = start_3digit.slice(1).padStart(2, '0');
        } else {
          fixedStartSec = start_3digit.slice(-2).padStart(2, '0');
        }
        
        // Handle end time with extreme seconds (100+, 400+)
        const endSeconds = parseInt(end_3digit);
        if (endSeconds >= 100) {
          const extraMin = Math.floor(endSeconds / 60);
          const realSec = endSeconds % 60;
          const currentMin = parseInt(end_min);
          const newMin = currentMin + extraMin;
          fixedEnd = `00:${newMin.toString().padStart(2, '0')}:`;
          fixedEndSec = realSec.toString().padStart(2, '0');
          
          modified = true;
          console.log(`🔧 Fixed extreme end seconds: ${endSeconds}s → ${extraMin}m ${realSec}s`);
        } else if (end_3digit.startsWith('0')) {
          fixedEndSec = end_3digit.slice(1).padStart(2, '0');
        } else {
          fixedEndSec = end_3digit.slice(-2).padStart(2, '0');
        }
        
        const fixed = `${fixedStart}${fixedStartSec},${start_ms} ${arrow} ${fixedEnd}${fixedEndSec},${end_ms}`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed 3-digit seconds format: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 11c. Fix extreme invalid seconds (100+, 400+) - multi-pass approach
    let passCount = 0;
    let hasExtremeSeconds = true;
    
    while (hasExtremeSeconds && passCount < 5) {
      hasExtremeSeconds = false;
      passCount++;
      
      content = content.replace(
        /(\d{2}:\d{2}:)(\d{3})(?=\s|$|-->)/g,
        (match, prefix, invalidSeconds) => {
          const seconds = parseInt(invalidSeconds);
          if (seconds >= 100) {
            const extraMin = Math.floor(seconds / 60);
            const realSec = seconds % 60;
            
            const timeParts = prefix.split(':');
            const currentMin = parseInt(timeParts[1]);
            const newMin = currentMin + extraMin;
            
            const fixed = `${timeParts[0]}:${newMin.toString().padStart(2, '0')}:${realSec.toString().padStart(2, '0')}`;
            
            hasExtremeSeconds = true;
            modified = true;
            console.log(`🔧 Pass ${passCount} - Fixed extreme seconds: ${match} → ${fixed}`);
            console.log(`   ${seconds}s = ${extraMin}m ${realSec}s`);
            return fixed;
          } else if (invalidSeconds.startsWith('0') && invalidSeconds.length === 3) {
            const fixed = prefix + invalidSeconds.slice(1).padStart(2, '0');
            if (fixed !== match) {
              hasExtremeSeconds = true;
              modified = true;
              console.log(`🔧 Pass ${passCount} - Fixed leading zero: ${match} → ${fixed}`);
            }
            return fixed;
          }
          return match;
        }
      );
    }
    
    if (passCount > 1) {
      console.log(`✅ Completed ${passCount} passes for extreme seconds fix`);
    }

    // 11d. Fix missing milliseconds in end time (hh:mm:ss --> hh:mm:ss,000)
    content = content.replace(
      /(\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*)(\d{2}:\d{2}:\d{2})(?!\d|,)/g,
      (match, prefix, endTime) => {
        const fixed = `${prefix}${endTime},000`;
        if (fixed !== match) {
          modified = true;
          console.log(`🔧 Fixed missing end time milliseconds: ${match} → ${fixed}`);
        }
        return fixed;
      }
    );

    // 11e. Fix massive timeline jumps (detect abnormal gaps)
    content = content.replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})\s*(-->)\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/g,
      (match, start_time, start_ms, arrow, end_hour, end_min, end_sec, end_ms) => {
        // Parse times to seconds
        const startParts = start_time.split(':');
        const startTotalSec = parseInt(startParts[0]) * 3600 + parseInt(startParts[1]) * 60 + parseInt(startParts[2]);
        const endTotalSec = parseInt(end_hour) * 3600 + parseInt(end_min) * 60 + parseInt(end_sec);
        
        // Check for abnormal jump (> 10 minutes OR > 5 minutes from start < 2 minutes)
        const gapSec = endTotalSec - startTotalSec;
        const isAbnormal = gapSec > 600 || (startTotalSec < 120 && gapSec > 300);
        
        if (isAbnormal) {
          // Create reasonable end time: start + 6 seconds (typical subtitle duration)
          const reasonableEndSec = startTotalSec + 6;
          
          const newEh = Math.floor(reasonableEndSec / 3600).toString().padStart(2, '0');
          const newEm = Math.floor((reasonableEndSec % 3600) / 60).toString().padStart(2, '0');
          const newEs = (reasonableEndSec % 60).toString().padStart(2, '0');
          
          const fixed = `${start_time},${start_ms} ${arrow} ${newEh}:${newEm}:${newEs},${end_ms}`;
          
          modified = true;
          console.log(`🔧 Fixed massive timeline jump: ${match} → ${fixed}`);
          console.log(`   Reduced gap from ${Math.floor(gapSec/60)}m${gapSec%60}s to 6s`);
          return fixed;
        }
        return match;
      }
    );

    // 12. Fix remaining mm:ss,ms patterns (thiếu giờ) - final catch
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
    
    // 13. Final validation and cleanup - check for any remaining invalid timecodes
    const lines = content.split('\n');
    let finalContent = [];
    let finalModified = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains timecode
      if (/\d{1,2}:\d{1,2}:\d{1,2},\d{1,3}\s*-->\s*\d{1,2}:\d{1,2}:\d{1,2},\d{1,3}/.test(line)) {
        // Validate and fix any remaining issues
        const fixedLine = line.replace(
          /(\d{1,2}):(\d{1,2}):(\d{1,2}),(\d{1,3})\s*(-->)\s*(\d{1,2}):(\d{1,2}):(\d{1,2}),(\d{1,3})/,
          (match, sh, sm, ss, sms, arrow, eh, em, es, ems) => {
            // Ensure all parts are properly formatted
            sh = sh.padStart(2, '0');
            sm = sm.padStart(2, '0');
            ss = ss.padStart(2, '0');
            sms = sms.padEnd(3, '0').substring(0, 3);
            
            eh = eh.padStart(2, '0');
            em = em.padStart(2, '0');
            es = es.padStart(2, '0');
            ems = ems.padEnd(3, '0').substring(0, 3);
            
            // Fix any seconds > 59
            if (parseInt(ss) > 59) {
              const extraMin = Math.floor(parseInt(ss) / 60);
              ss = (parseInt(ss) % 60).toString().padStart(2, '0');
              sm = (parseInt(sm) + extraMin).toString().padStart(2, '0');
              finalModified = true;
              console.log(`🔧 Final fix - invalid start seconds: ${match}`);
            }
            
            if (parseInt(es) > 59) {
              const extraMin = Math.floor(parseInt(es) / 60);
              es = (parseInt(es) % 60).toString().padStart(2, '0');
              em = (parseInt(em) + extraMin).toString().padStart(2, '0');
              finalModified = true;
              console.log(`🔧 Final fix - invalid end seconds: ${match}`);
            }
            
            // Fix any minutes > 59
            if (parseInt(sm) > 59) {
              const extraHour = Math.floor(parseInt(sm) / 60);
              sm = (parseInt(sm) % 60).toString().padStart(2, '0');
              sh = (parseInt(sh) + extraHour).toString().padStart(2, '0');
              finalModified = true;
              console.log(`🔧 Final fix - invalid start minutes: ${match}`);
            }
            
            if (parseInt(em) > 59) {
              const extraHour = Math.floor(parseInt(em) / 60);
              em = (parseInt(em) % 60).toString().padStart(2, '0');
              eh = (parseInt(eh) + extraHour).toString().padStart(2, '0');
              finalModified = true;
              console.log(`🔧 Final fix - invalid end minutes: ${match}`);
            }
            
            return `${sh}:${sm}:${ss},${sms} ${arrow} ${eh}:${em}:${es},${ems}`;
          }
        );
        
        finalContent.push(fixedLine);
      } else {
        finalContent.push(line);
      }
    }
    
    // 14. Post-process timeline consistency check
    for (let i = 0; i < finalContent.length; i++) {
      const line = finalContent[i];
      if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(line)) {
        const timecodeMatch = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timecodeMatch) {
          const [, sh, sm, ss, sms, eh, em, es, ems] = timecodeMatch;
          
          // Calculate total seconds for comparison
          const startTotal = parseInt(sh) * 3600 + parseInt(sm) * 60 + parseInt(ss);
          const endTotal = parseInt(eh) * 3600 + parseInt(em) * 60 + parseInt(es);
          
          // Check for backward timeline (end < start)
          if (endTotal < startTotal) {
            // Likely timeline reversal, swap or fix
            const nextLineIndex = i + 6; // Skip to next cue (number, timecode, text, text, text, blank)
            if (nextLineIndex < finalContent.length) {
              const nextLine = finalContent[nextLineIndex];
              if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(nextLine)) {
                const nextMatch = nextLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (nextMatch) {
                  const [, nsh, nsm, nss, nsms, neh, nem, nes, nems] = nextMatch;
                  // Use next cue's start time as current cue's end time
                  const fixedLine = line.replace(
                    /(\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*)\d{2}:\d{2}:\d{2},\d{3}/,
                    `$1${nsh}:${nsm}:${nss},${nsms}`
                  );
                  finalContent[i] = fixedLine;
                  finalModified = true;
                  console.log(`🔧 Fixed timeline reversal: ${line.trim()} → ${fixedLine.trim()}`);
                }
              }
            }
          }
          
          // Check for massive forward jump (> 30 min gap from early timeline)
          if (startTotal < 300 && endTotal > startTotal + 1800) {
            // Estimate reasonable end time based on subtitle duration pattern
            const estimatedDuration = 6; // ~6 seconds per subtitle (typical)
            const newEndTotal = startTotal + estimatedDuration;
            
            const newEh = Math.floor(newEndTotal / 3600).toString().padStart(2, '0');
            const newEm = Math.floor((newEndTotal % 3600) / 60).toString().padStart(2, '0');
            const newEs = (newEndTotal % 60).toString().padStart(2, '0');
            
            const fixedLine = line.replace(
              /(\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*)\d{2}:\d{2}:\d{2},\d{3}/,
              `$1${newEh}:${newEm}:${newEs},${ems}`
            );
            finalContent[i] = fixedLine;
            finalModified = true;
            console.log(`🔧 Fixed massive timeline jump: ${line.trim()} → ${fixedLine.trim()}`);
            console.log(`   Reduced gap from ${Math.floor((endTotal-startTotal)/60)}m to ${estimatedDuration}s`);
          }
        }
      }
    }
    
    // 15. Fix timeline sequence consistency
    for (let i = 0; i < finalContent.length - 6; i++) {
      const currentLine = finalContent[i];
      const nextLineIndex = i + 6; // Next cue is 6 lines away
      const nextLine = finalContent[nextLineIndex];
      
      if (currentLine && nextLine && 
          currentLine.includes('-->') && nextLine.includes('-->')) {
        
        const currentMatch = currentLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        const nextMatch = nextLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        
        if (currentMatch && nextMatch) {
          // Parse current end time and next start time
          const [, , , , , ceh, cem, ces] = currentMatch;
          const [, nsh, nsm, nss] = nextMatch;
          
          const currentEndSec = parseInt(ceh) * 3600 + parseInt(cem) * 60 + parseInt(ces);
          const nextStartSec = parseInt(nsh) * 3600 + parseInt(nsm) * 60 + parseInt(nss);
          
          // If next starts before current ends, fix the sequence
          if (nextStartSec < currentEndSec) {
            // Adjust current end time to be 1 second before next start
            const adjustedEndSec = Math.max(nextStartSec - 1, currentEndSec - 300); // Max 5min adjustment
            
            const aeh = Math.floor(adjustedEndSec / 3600).toString().padStart(2, '0');
            const aem = Math.floor((adjustedEndSec % 3600) / 60).toString().padStart(2, '0');
            const aes = (adjustedEndSec % 60).toString().padStart(2, '0');
            
            const fixedCurrentLine = currentLine.replace(
              /(\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*)\d{2}:\d{2}:\d{2},(\d{3})/,
              `$1${aeh}:${aem}:${aes},$2`
            );
            
            finalContent[i] = fixedCurrentLine;
            finalModified = true;
            console.log(`🔧 Fixed timeline sequence overlap:`);
            console.log(`   Current: ${currentLine.trim()} → ${fixedCurrentLine.trim()}`);
            console.log(`   Next:    ${nextLine.trim()}`);
          }
        }
      }
    }
    
    if (finalModified) {
      content = finalContent.join('\n');
      modified = true;
    }

    if (modified) {
      const fixedPath = subtitlePath.replace('.srt', '_fixed.srt');
      fs.writeFileSync(fixedPath, content, 'utf8');
      console.log(`✅ Created fixed subtitle: ${path.basename(fixedPath)}`);
      
      // Run final validation
      validateSubtitleFileEnhanced(fixedPath);
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

// Enhanced function to handle specific subtitle exceptions
export function fixSubtitleExceptions(subtitlePath) {
  try {
    if (!fs.existsSync(subtitlePath)) {
      throw new Error(`Subtitle file not found: ${subtitlePath}`);
    }

    let content = fs.readFileSync(subtitlePath, 'utf8');
    let fixCount = 0;
    let modified = false;

    console.log('🔧 Processing subtitle exceptions...');

    // Exception 1: Missing milliseconds pattern: HH:MM:SS --> HH:MM:SS,000 (multi-pass)
    let missingMilliseconds = true;
    let passCount = 0;
    
    while (missingMilliseconds && passCount < 3) {
      passCount++;
      missingMilliseconds = false;
      
      content = content.replace(
        /(\d{2}:\d{2}:\d{2})(\s*-->\s*)(\d{2}:\d{2}:\d{2})(?![,\d])/g,
        (match, start_time, arrow, end_time) => {
          const fixed = `${start_time},000${arrow}${end_time},000`;
          console.log(`   🔧 Pass ${passCount} - Fixed missing milliseconds: ${match.trim()} → ${fixed}`);
          fixCount++;
          modified = true;
          missingMilliseconds = true;
          return fixed;
        }
      );
      
      // Also handle single side missing
      content = content.replace(
        /(\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*)(\d{2}:\d{2}:\d{2})(?![,\d])/g,
        (match, prefix, end_time) => {
          const fixed = `${prefix}${end_time},000`;
          console.log(`   🔧 Pass ${passCount} - Fixed missing end milliseconds: ${match.trim()} → ${fixed}`);
          fixCount++;
          modified = true;
          missingMilliseconds = true;
          return fixed;
        }
      );
      
      content = content.replace(
        /(\d{2}:\d{2}:\d{2})(\s*-->\s*)(\d{2}:\d{2}:\d{2},\d{3})/g,
        (match, start_time, arrow, end_time) => {
          const fixed = `${start_time},000${arrow}${end_time}`;
          console.log(`   🔧 Pass ${passCount} - Fixed missing start milliseconds: ${match.trim()} → ${fixed}`);
          fixCount++;
          modified = true;
          missingMilliseconds = true;
          return fixed;
        }
      );
    }

    // Exception 2: Handle extreme seconds in full timeline context
    content = content.replace(
      /(\d{2}:\d{2}:)(\d{3})\s*(-->)\s*(\d{2}:\d{2}:)(\d{3})/g,
      (match, start_prefix, start_extreme, arrow, end_prefix, end_extreme) => {
        let fixedMatch = match;
        let wasModified = false;
        
        // Handle start time extreme seconds
        const startSecInt = parseInt(start_extreme);
        if (startSecInt >= 100 || start_extreme.endsWith('00')) {
          let newStartTime;
          
          if (start_extreme.endsWith('00') && startSecInt < 100) {
            // Simple case: 000 -> 00
            const realSec = start_extreme.slice(0, -1);
            newStartTime = `${start_prefix}${realSec.padStart(2, '0')}`;
          } else {
            // Extreme seconds conversion  
            const extraMin = Math.floor(startSecInt / 60);
            const realSec = startSecInt % 60;
            const timeParts = start_prefix.split(':');
            const currentMin = parseInt(timeParts[1]);
            const newMin = currentMin + extraMin;
            const newHour = Math.floor(newMin / 60);
            const finalMin = newMin % 60;
            const finalHour = (parseInt(timeParts[0]) + newHour).toString().padStart(2, '0');
            
            newStartTime = `${finalHour}:${finalMin.toString().padStart(2, '0')}:${realSec.toString().padStart(2, '0')}`;
          }
          
          fixedMatch = fixedMatch.replace(start_prefix + start_extreme, newStartTime);
          wasModified = true;
          console.log(`   🔧 Fixed start extreme seconds: ${start_prefix}${start_extreme} → ${newStartTime}`);
        }
        
        // Handle end time extreme seconds
        const endSecInt = parseInt(end_extreme);
        if (endSecInt >= 100 || end_extreme.endsWith('00')) {
          let newEndTime;
          
          if (end_extreme.endsWith('00') && endSecInt < 100) {
            // Simple case: 000 -> 00
            const realSec = end_extreme.slice(0, -1);
            newEndTime = `${end_prefix}${realSec.padStart(2, '0')}`;
          } else {
            // Extreme seconds conversion
            const extraMin = Math.floor(endSecInt / 60);
            const realSec = endSecInt % 60;
            const timeParts = end_prefix.split(':');
            const currentMin = parseInt(timeParts[1]);
            const newMin = currentMin + extraMin;
            const newHour = Math.floor(newMin / 60);
            const finalMin = newMin % 60;
            const finalHour = (parseInt(timeParts[0]) + newHour).toString().padStart(2, '0');
            
            newEndTime = `${finalHour}:${finalMin.toString().padStart(2, '0')}:${realSec.toString().padStart(2, '0')}`;
          }
          
          const currentEndTime = fixedMatch.match(new RegExp(`${arrow}\\s*(\\d{2}:\\d{2}:\\d+)`))[1];
          fixedMatch = fixedMatch.replace(currentEndTime, newEndTime);
          wasModified = true;
          console.log(`   🔧 Fixed end extreme seconds: ${end_prefix}${end_extreme} → ${newEndTime}`);
        }
        
        if (wasModified) {
          fixCount++;
          modified = true;
          console.log(`   📋 Full timeline fix: ${match} → ${fixedMatch}`);
        }
        
        return fixedMatch;
      }
    );

    // Exception 2b: Handle specific timeline logic issues
    // Pattern: 01:00:10,000 should become 00:00:59,000 in context
    content = content.replace(
      /(00:00:\d{2},\d{3}\s*-->\s*)(01:00:10,000)/g,
      (match, prefix, problematic_end) => {
        // If start is in 00:00:xx range and end jumps to 01:00:10, likely should be 00:00:59
        const fixed = `${prefix}00:00:59,000`;
        console.log(`   🔧 Fixed timeline logic: ${match} → ${fixed}`);
        fixCount++;
        modified = true;
        return fixed;
      }
    );

    // Exception 2c: Final pass - fix any remaining invalid seconds (>59)
    content = content.replace(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})/g,
      (match, hours, minutes, seconds, ms) => {
        let h = parseInt(hours);
        let m = parseInt(minutes);
        let s = parseInt(seconds);
        
        if (s > 59) {
          const extraMin = Math.floor(s / 60);
          s = s % 60;
          m += extraMin;
          
          if (m > 59) {
            const extraHour = Math.floor(m / 60);
            m = m % 60;
            h += extraHour;
          }
          
          const fixed = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms}`;
          console.log(`   🔧 Final seconds fix: ${match} → ${fixed}`);
          fixCount++;
          modified = true;
          return fixed;
        }
        
        return match;
      }
    );

    // Exception 3: Invalid timeline sequences (overlapping times)
    const lines = content.split('\n');
    const timelines = [];
    
    // Extract all timeline info
    lines.forEach((line, index) => {
      if (line.includes('-->')) {
        const match = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (match) {
          const [, sh, sm, ss, sms, eh, em, es, ems] = match;
          const startSec = parseInt(sh) * 3600 + parseInt(sm) * 60 + parseInt(ss);
          const endSec = parseInt(eh) * 3600 + parseInt(em) * 60 + parseInt(es);
          
          timelines.push({
            lineIndex: index,
            startSec,
            endSec,
            originalLine: line
          });
        }
      }
    });

    // Check and fix overlapping timelines
    for (let i = 0; i < timelines.length - 1; i++) {
      const current = timelines[i];
      const next = timelines[i + 1];
      
      if (next.startSec < current.endSec) {
        // Adjust current end time to be 1 second before next start
        const adjustedEndSec = Math.max(next.startSec - 1, current.startSec + 3);
        
        const aeh = Math.floor(adjustedEndSec / 3600).toString().padStart(2, '0');
        const aem = Math.floor((adjustedEndSec % 3600) / 60).toString().padStart(2, '0');
        const aes = (adjustedEndSec % 60).toString().padStart(2, '0');
        
        const newLine = current.originalLine.replace(
          /(\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*)\d{2}:\d{2}:\d{2},(\d{3})/,
          `$1${aeh}:${aem}:${aes},$2`
        );
        
        lines[current.lineIndex] = newLine;
        console.log(`   🔧 Fixed timeline overlap: ${current.originalLine.trim()} → ${newLine.trim()}`);
        fixCount++;
        modified = true;
      }
    }

    if (modified) {
      content = lines.join('\n');
      
      // Final cleanup pass - fix any remaining invalid seconds
      console.log('   🔧 Final cleanup pass...');
      let finalPassModified = false;
      
      content = content.replace(
        /(\d{2}):(\d{2}):(\d{2}),(\d{3})/g,
        (match, hours, minutes, seconds, ms) => {
          let h = parseInt(hours);
          let m = parseInt(minutes);
          let s = parseInt(seconds);
          
          if (s > 59) {
            const extraMin = Math.floor(s / 60);
            s = s % 60;
            m += extraMin;
            
            if (m > 59) {
              const extraHour = Math.floor(m / 60);
              m = m % 60;
              h += extraHour;
            }
            
            const fixed = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms}`;
            console.log(`      Final fix: ${match} → ${fixed}`);
            fixCount++;
            finalPassModified = true;
            return fixed;
          }
          
          return match;
        }
      );
      
      if (finalPassModified) {
        modified = true;
      }

    // NEW EXCEPTION: Backward Timeline Pattern (01:xx:xx --> 00:xx:xx)
    console.log('🔧 Checking for backward timeline exceptions...');
    const backwardTimelineRegex = /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/g;
    let backwardMatches;
    let backwardFixed = 0;
    
    content = content.replace(backwardTimelineRegex, (match, sh, sm, ss, sms, eh, em, es, ems) => {
      const startTotal = parseInt(sh) * 3600 + parseInt(sm) * 60 + parseInt(ss);
      const endTotal = parseInt(eh) * 3600 + parseInt(em) * 60 + parseInt(es);
      
      // Pattern 1: End time is before start time (backward timeline)
      if (endTotal < startTotal) {
        // Strategy: Use start time and add reasonable 5-second duration
        const newEndTotal = startTotal + 5;
        const newEh = Math.floor(newEndTotal / 3600).toString().padStart(2, '0');
        const newEm = Math.floor((newEndTotal % 3600) / 60).toString().padStart(2, '0');
        const newEs = (newEndTotal % 60).toString().padStart(2, '0');
        
        const fixed = `${sh}:${sm}:${ss},${sms} --> ${newEh}:${newEm}:${newEs},${ems}`;
        console.log(`   🔧 Fixed backward timeline: ${match} → ${fixed}`);
        backwardFixed++;
        modified = true;
        return fixed;
      }
      
      // Pattern 2: Hour mismatch (01:xx:xx --> 00:xx:xx) - Convert start hour to 00
      if (parseInt(sh) === 1 && parseInt(eh) === 0) {
        // Convert start hour from 01 to 00
        const newSh = '00';
        const newStartTotal = parseInt(sm) * 60 + parseInt(ss);
        
        // Ensure end time is after adjusted start time
        if (endTotal < newStartTotal) {
          const newEndTotal = newStartTotal + 5; // Add 5 seconds
          const newEh = Math.floor(newEndTotal / 3600).toString().padStart(2, '0');
          const newEm = Math.floor((newEndTotal % 3600) / 60).toString().padStart(2, '0'); 
          const newEs = (newEndTotal % 60).toString().padStart(2, '0');
          
          const fixed = `${newSh}:${sm}:${ss},${sms} --> ${newEh}:${newEm}:${newEs},${ems}`;
          console.log(`   🔧 Fixed hour mismatch: ${match} → ${fixed}`);
          backwardFixed++;
          modified = true;
          return fixed;
        } else {
          const fixed = `${newSh}:${sm}:${ss},${sms} --> ${eh}:${em}:${es},${ems}`;
          console.log(`   🔧 Fixed hour mismatch: ${match} → ${fixed}`);
          backwardFixed++;
          modified = true;
          return fixed;
        }
      }
      
      return match; // No changes needed
    });
    
    if (backwardFixed > 0) {
      console.log(`✅ Fixed ${backwardFixed} backward timeline exceptions`);
      fixCount += backwardFixed;
      modified = true; // Ensure modified flag is set
    }
      
      // Save to fixed file
      const outputPath = subtitlePath.replace('.srt', '_fixed_exceptions.srt');
      fs.writeFileSync(outputPath, content, 'utf8');
      
      console.log(`✅ Applied ${fixCount} exception fixes`);
      console.log(`📄 Fixed file saved to: ${outputPath}`);
      
      return {
        success: true,
        modified: true,
        fixCount: fixCount,
        outputPath: outputPath
      };
    } else {
      console.log('✅ No exceptions found - subtitle format is correct');
      return {
        success: true,
        modified: false,
        fixCount: 0,
        outputPath: subtitlePath
      };
    }

  } catch (error) {
    console.error('❌ Exception handling failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}