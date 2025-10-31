import fs from 'fs';

/**
 * Fix SRT file with CORRECT logic - không làm hỏng timeline của video dài
 */
export function fixSrtCorrectly(subtitlePath) {
  console.log('🔧 Fixing SRT file with correct logic...');
  
  try {
    let content = fs.readFileSync(subtitlePath, 'utf8');
    let modified = false;
    
    console.log('📄 Original content analysis:');
    const lines = content.split('\n');
    const timeLines = lines.filter(line => line.includes('-->'));
    console.log(`   Found ${timeLines.length} timeline entries`);
    
    // Kiểm tra xem có timeline > 1 giờ không
    const hasHourTimestamps = timeLines.some(line => 
      line.includes('01:') || line.includes('02:') || line.includes('03:')
    );
    console.log(`   Has timestamps >1 hour: ${hasHourTimestamps}`);
    
    if (hasHourTimestamps) {
      console.log('⚠️  Video appears to be >1 hour long - preserving hour timestamps');
    }

    // 1. SAFE FIX: Chỉ fix missing milliseconds (KHÔNG đụng đến hour timestamps)
    const beforeMsFix = content;
    content = content.replace(
      /(\d{2}:\d{2}:\d{2})\s*(-->)\s*(\d{2}:\d{2}:\d{2})(?![,\d])/g,
      (match, start, arrow, end) => {
        const fixed = `${start},000 ${arrow} ${end},000`;
        if (fixed !== match) {
          console.log(`   ✅ Added missing milliseconds: ${match} → ${fixed}`);
          modified = true;
        }
        return fixed;
      }
    );

    // 2. SAFE FIX: Chỉ fix format mm:ss → 00:mm:ss (KHÔNG đụng đến 01:XX:XX)
    content = content.replace(
      /(?:^|\n)(\d{1}):(\d{2}),(\d{3})\s*(-->)\s*(\d{1}):(\d{2}),(\d{3})(?=\s*$)/gm,
      (match, start_min, start_sec, start_ms, arrow, end_min, end_sec, end_ms) => {
        // Chỉ fix nếu minute < 10 (tức là thực sự thiếu giờ, không phải 01:XX:XX)
        if (parseInt(start_min) < 10 && parseInt(end_min) < 10) {
          const fixed = `00:0${start_min}:${start_sec},${start_ms} ${arrow} 00:0${end_min}:${end_sec},${end_ms}`;
          if (fixed !== match.trim()) {
            console.log(`   ✅ Added missing hours: ${match.trim()} → ${fixed}`);
            modified = true;
          }
          return match.startsWith('\n') ? '\n' + fixed : fixed;
        }
        return match;
      }
    );

    // 3. SAFE FIX: Chỉ fix giây không hợp lệ (>59)  
    content = content.replace(
      /(\d{2}:\d{2}:)(\d{2}),(\d{3})/g,
      (match, prefix, seconds, ms) => {
        const secInt = parseInt(seconds);
        if (secInt > 59) {
          const extraMin = Math.floor(secInt / 60);
          const realSec = secInt % 60;
          const [hour, minute] = prefix.split(':');
          const newMinute = (parseInt(minute) + extraMin).toString().padStart(2, '0');
          const fixed = `${hour}:${newMinute}:${realSec.toString().padStart(2, '0')},${ms}`;
          console.log(`   ✅ Fixed invalid seconds: ${match} → ${fixed}`);
          modified = true;
          return fixed;
        }
        return match;
      }
    );

    // 4. SAFE FIX: Đảm bảo milliseconds có 3 chữ số
    content = content.replace(
      /(\d{2}:\d{2}:\d{2}),(\d{1,2})(\s|$|-->)/g,
      (match, time, ms, suffix) => {
        const paddedMs = ms.padEnd(3, '0');
        if (paddedMs !== ms) {
          console.log(`   ✅ Fixed milliseconds: ${time},${ms} → ${time},${paddedMs}`);
          modified = true;
        }
        return `${time},${paddedMs}${suffix}`;
      }
    );

    // 5. VALIDATION: Kiểm tra kết quả
    const finalLines = content.split('\n');
    const finalTimeLines = finalLines.filter(line => line.includes('-->'));
    
    console.log('\n📊 Validation results:');
    let issuesFound = 0;
    
    finalTimeLines.forEach((line, index) => {
      const match = line.match(/(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/);
      if (!match) {
        console.log(`   ❌ Invalid format on line: ${line}`);
        issuesFound++;
        return;
      }
      
      const [_, startTime, startMs, endTime, endMs] = match;
      
      // Parse times to check duration
      const [sH, sM, sS] = startTime.split(':').map(Number);
      const [eH, eM, eS] = endTime.split(':').map(Number);
      
      const startSeconds = sH * 3600 + sM * 60 + sS + parseInt(startMs) / 1000;
      const endSeconds = eH * 3600 + eM * 60 + eS + parseInt(endMs) / 1000;
      const duration = endSeconds - startSeconds;
      
      if (duration <= 0) {
        console.log(`   ❌ Negative/zero duration: ${line} (${duration.toFixed(3)}s)`);
        issuesFound++;
      }
      
      if (sM >= 60 || sS >= 60 || eM >= 60 || eS >= 60) {
        console.log(`   ❌ Invalid minutes/seconds: ${line}`);
        issuesFound++;
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Timeline entries processed: ${finalTimeLines.length}`);
    console.log(`   Issues found: ${issuesFound}`);
    console.log(`   File modified: ${modified}`);
    
    if (modified && issuesFound === 0) {
      // Backup original
      const backupPath = subtitlePath.replace('.srt', '.backup.srt');
      fs.copyFileSync(subtitlePath, backupPath);
      console.log(`   📦 Backup created: ${backupPath}`);
      
      // Write corrected version
      const correctedPath = subtitlePath.replace('.srt', '.corrected.srt');
      fs.writeFileSync(correctedPath, content, 'utf8');
      console.log(`   ✅ Corrected file saved: ${correctedPath}`);
      
      return {
        success: true,
        modified: true,
        issuesFixed: modified,
        outputPath: correctedPath,
        backupPath: backupPath
      };
    } else if (issuesFound > 0) {
      console.log(`   ❌ Cannot save: ${issuesFound} critical issues remain`);
      return {
        success: false,
        modified: modified,
        issues: issuesFound,
        reason: 'Critical timeline issues detected'
      };
    } else {
      console.log(`   ℹ️  No changes needed - file already correct`);
      return {
        success: true,
        modified: false,
        reason: 'File already in correct format'
      };
    }
    
  } catch (error) {
    console.error('❌ Error processing SRT file:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test với file hiện tại
const isMainModule = process.argv[1] && process.argv[1].includes('fixSrtCorrectly.js');

if (isMainModule) {
  const result = fixSrtCorrectly('./videos/subtitle.srt');
  console.log('\n🏁 Final result:', result);
}