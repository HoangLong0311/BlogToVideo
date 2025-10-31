import fs from 'fs';

console.log('🔍 Rà soát chi tiết 2 file SRT...\n');

// Đọc 2 file SRT
const originalFile = './videos/subtitle.srt';
const fixedFile = './videos/subtitle_fixed.srt';

function parseTimecode(timecode) {
  const [time, ms] = timecode.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + (parseInt(ms) / 1000);
}

function analyzeSrtFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const cues = [];
  let currentCue = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect cue number
    if (/^\d+$/.test(line)) {
      if (currentCue) cues.push(currentCue);
      currentCue = { id: parseInt(line), line: i + 1 };
    }
    
    // Detect timecode
    if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(line)) {
      const match = line.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (match && currentCue) {
        currentCue.start = match[1];
        currentCue.end = match[2];
        currentCue.startSeconds = parseTimecode(match[1]);
        currentCue.endSeconds = parseTimecode(match[2]);
        currentCue.duration = currentCue.endSeconds - currentCue.startSeconds;
        currentCue.timecodeLine = i + 1;
        currentCue.rawTimecode = line;
      }
    }
    
    // Detect text
    if (line && currentCue && currentCue.start && !currentCue.text) {
      currentCue.text = line;
    }
  }
  
  if (currentCue) cues.push(currentCue);
  return cues;
}

const originalCues = analyzeSrtFile(originalFile);
const fixedCues = analyzeSrtFile(fixedFile);

console.log(`📄 Original file: ${originalCues.length} cues`);
console.log(`📄 Fixed file: ${fixedCues.length} cues\n`);

// So sánh từng cue
console.log('🔍 Chi tiết so sánh:\n');

for (let i = 0; i < Math.max(originalCues.length, fixedCues.length); i++) {
  const orig = originalCues[i];
  const fixed = fixedCues[i];
  
  console.log(`=== CUE ${i + 1} ===`);
  
  if (orig && fixed) {
    console.log(`Original: ${orig.start} --> ${orig.end} (${orig.duration.toFixed(3)}s)`);
    console.log(`Fixed:    ${fixed.start} --> ${fixed.end} (${fixed.duration.toFixed(3)}s)`);
    
    // Check for issues
    const issues = [];
    
    // Timeline issues
    if (Math.abs(orig.startSeconds - fixed.startSeconds) > 0.1) {
      issues.push(`❌ Start time changed: ${orig.startSeconds}s → ${fixed.startSeconds}s`);
    }
    
    if (Math.abs(orig.endSeconds - fixed.endSeconds) > 0.1) {
      issues.push(`❌ End time changed: ${orig.endSeconds}s → ${fixed.endSeconds}s`);
    }
    
    if (fixed.duration < 0.1) {
      issues.push(`❌ Duration too short: ${fixed.duration.toFixed(3)}s`);
    }
    
    if (fixed.duration > 10) {
      issues.push(`⚠️ Duration very long: ${fixed.duration.toFixed(3)}s`);
    }
    
    // Check for timeline overlaps with next cue
    if (fixedCues[i + 1]) {
      const nextCue = fixedCues[i + 1];
      if (fixed.endSeconds > nextCue.startSeconds) {
        issues.push(`❌ Overlaps with next cue: ends at ${fixed.endSeconds}s, next starts at ${nextCue.startSeconds}s`);
      }
    }
    
    // Check for format issues
    if (!/^\d{2}:\d{2}:\d{2},\d{3}$/.test(fixed.start)) {
      issues.push(`❌ Invalid start format: ${fixed.start}`);
    }
    
    if (!/^\d{2}:\d{2}:\d{2},\d{3}$/.test(fixed.end)) {
      issues.push(`❌ Invalid end format: ${fixed.end}`);
    }
    
    if (issues.length > 0) {
      console.log(`🚨 ISSUES FOUND:`);
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log(`✅ OK`);
    }
    
  } else if (orig && !fixed) {
    console.log(`❌ CUE MISSING in fixed file: ${orig.start} --> ${orig.end}`);
  } else if (!orig && fixed) {
    console.log(`➕ NEW CUE in fixed file: ${fixed.start} --> ${fixed.end}`);
  }
  
  console.log('');
}

// Timeline continuity check
console.log('\n📊 TIMELINE CONTINUITY CHECK:\n');

for (let i = 0; i < fixedCues.length - 1; i++) {
  const current = fixedCues[i];
  const next = fixedCues[i + 1];
  
  const gap = next.startSeconds - current.endSeconds;
  
  if (gap < 0) {
    console.log(`❌ CUE ${i + 1}-${i + 2}: OVERLAP of ${Math.abs(gap).toFixed(3)}s`);
    console.log(`   Current ends: ${current.end} (${current.endSeconds}s)`);
    console.log(`   Next starts:  ${next.start} (${next.startSeconds}s)`);
  } else if (gap > 5) {
    console.log(`⚠️ CUE ${i + 1}-${i + 2}: Large gap of ${gap.toFixed(3)}s`);
  }
}

// Check for problematic timestamps
console.log('\n🕒 PROBLEMATIC TIMESTAMPS:\n');

fixedCues.forEach((cue, index) => {
  // Check for impossible times
  const [startHour, startMin, startSec] = cue.start.split(/[:,]/).map(Number);
  const [endHour, endMin, endSec] = cue.end.split(/[:,]/).map(Number);
  
  if (startMin >= 60 || startSec >= 60) {
    console.log(`❌ CUE ${index + 1}: Invalid start time - ${cue.start}`);
  }
  
  if (endMin >= 60 || endSec >= 60) {
    console.log(`❌ CUE ${index + 1}: Invalid end time - ${cue.end}`);
  }
  
  // Check for timeline jumps
  if (index > 0 && cue.startSeconds < fixedCues[index - 1].endSeconds) {
    console.log(`❌ CUE ${index + 1}: Goes backward in time`);
  }
});