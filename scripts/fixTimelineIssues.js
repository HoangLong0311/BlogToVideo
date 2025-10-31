import fs from 'fs';

console.log('🔧 Fixing ACTUAL timeline issues in SRT file...\n');

function fixActualTimelineIssues(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  console.log('📋 Analyzing timeline logic...');
  
  // Parse all timecodes
  const lines = content.split('\n');
  const cues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/);
    
    if (timeMatch) {
      const [_, startTime, startMs, endTime, endMs] = timeMatch;
      const cueId = cues.length + 1;
      
      // Convert to seconds
      const [sH, sM, sS] = startTime.split(':').map(Number);
      const [eH, eM, eS] = endTime.split(':').map(Number);
      
      const startSeconds = sH * 3600 + sM * 60 + sS + parseInt(startMs) / 1000;
      const endSeconds = eH * 3600 + eM * 60 + eS + parseInt(endMs) / 1000;
      
      cues.push({
        id: cueId,
        lineIndex: i,
        originalLine: line,
        startTime,
        endTime,
        startMs,
        endMs,
        startSeconds,
        endSeconds,
        duration: endSeconds - startSeconds
      });
    }
  }
  
  console.log(`   Found ${cues.length} cues`);
  
  // Check for timeline issues and fix them
  const fixes = [];
  
  for (let i = 0; i < cues.length - 1; i++) {
    const current = cues[i];
    const next = cues[i + 1];
    
    // Issue 1: Next cue starts before current ends (timeline overlap/regression)
    if (next.startSeconds < current.endSeconds) {
      console.log(`❌ Timeline issue found:`);
      console.log(`   Cue ${current.id} ends at: ${current.endSeconds}s (${current.endTime})`);
      console.log(`   Cue ${next.id} starts at: ${next.startSeconds}s (${next.startTime})`);
      
      // Calculate what the next start time should be
      const shouldStartAt = current.endSeconds + 0.3; // Add 300ms gap
      
      // Convert back to timestamp format
      const newStartHours = Math.floor(shouldStartAt / 3600);
      const newStartMinutes = Math.floor((shouldStartAt % 3600) / 60);
      const newStartSeconds = Math.floor(shouldStartAt % 60);
      const newStartMs = Math.round((shouldStartAt % 1) * 1000);
      
      const newStartTime = `${newStartHours.toString().padStart(2, '0')}:${newStartMinutes.toString().padStart(2, '0')}:${newStartSeconds.toString().padStart(2, '0')}`;
      
      // Calculate new end time (preserve original duration if reasonable)
      const originalDuration = next.endSeconds - next.startSeconds;
      const newEndSeconds = shouldStartAt + originalDuration;
      
      const newEndHours = Math.floor(newEndSeconds / 3600);
      const newEndMinutes = Math.floor((newEndSeconds % 3600) / 60);
      const newEndSec = Math.floor(newEndSeconds % 60);
      const newEndMs = Math.round((newEndSeconds % 1) * 1000);
      
      const newEndTime = `${newEndHours.toString().padStart(2, '0')}:${newEndMinutes.toString().padStart(2, '0')}:${newEndSec.toString().padStart(2, '0')}`;
      
      const newTimecode = `${newStartTime},${newStartMs.toString().padStart(3, '0')} --> ${newEndTime},${newEndMs.toString().padStart(3, '0')}`;
      
      fixes.push({
        cueId: next.id,
        lineIndex: next.lineIndex,
        oldLine: next.originalLine,
        newLine: newTimecode,
        reason: `Fixed timeline regression: moved start from ${next.startSeconds}s to ${shouldStartAt}s`
      });
      
      console.log(`   🔧 Fix: ${next.originalLine} → ${newTimecode}`);
    }
  }
  
  // Apply fixes
  if (fixes.length > 0) {
    console.log(`\n🔨 Applying ${fixes.length} fixes...`);
    
    let fixedContent = content;
    
    // Apply fixes in reverse order to preserve line indices
    fixes.reverse().forEach(fix => {
      const lines = fixedContent.split('\n');
      lines[fix.lineIndex] = fix.newLine;
      fixedContent = lines.join('\n');
      console.log(`   ✅ ${fix.reason}`);
      modified = true;
    });
    
    // Save fixed version
    const outputPath = filePath.replace('.srt', '.timeline_fixed.srt');
    fs.writeFileSync(outputPath, fixedContent, 'utf8');
    
    console.log(`\n✅ Timeline fixed and saved to: ${outputPath}`);
    return {
      success: true,
      modified: true,
      fixesApplied: fixes.length,
      outputPath
    };
  } else {
    console.log('\n✅ No timeline issues found - file is correct');
    return {
      success: true,
      modified: false,
      reason: 'Timeline already correct'
    };
  }
}

// Fix the original file
const result = fixActualTimelineIssues('./videos/subtitle.srt');
console.log('\n🏁 Result:', result);

if (result.success && result.modified) {
  console.log('\n🎯 Next steps:');
  console.log('1. Use the timeline_fixed.srt file for video merging');
  console.log('2. Test the corrected subtitle timeline');
}