import fs from 'fs';

console.log('🔧 Smart fix for SRT timeline issues...\n');

function smartFixSrt(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📋 Analyzing content for logical fixes...');
  
  // The actual issue: Cue 9 has wrong start time format
  // Original: 00:00:04,400 --> 01:00:10,900  
  // Should be: 01:00:04,400 --> 01:00:10,900 (just fix the start time)
  
  console.log('🎯 Target fix: Cue 9 start time 00:00:04,400 → 01:00:04,400');
  
  // Apply the specific fix
  const originalLine = '00:00:04,400 --> 01:00:10,900';
  const fixedLine = '01:00:04,400 --> 01:00:10,900';
  
  if (content.includes(originalLine)) {
    content = content.replace(originalLine, fixedLine);
    console.log('✅ Applied fix successfully');
    
    // Save the corrected file
    const outputPath = filePath.replace('.srt', '.smart_fixed.srt');
    fs.writeFileSync(outputPath, content, 'utf8');
    
    // Verify the fix
    console.log('\n🔍 Verification:');
    
    // Parse and check timeline
    const lines = content.split('\n');
    const timelines = lines.filter(line => line.includes('-->'));
    
    console.log(`   Total cues: ${timelines.length}`);
    
    // Check specific cues
    const cue8 = timelines[7]; // 0-indexed
    const cue9 = timelines[8];
    const cue10 = timelines[9];
    
    console.log(`   Cue 8:  ${cue8}`);
    console.log(`   Cue 9:  ${cue9}`);
    console.log(`   Cue 10: ${cue10}`);
    
    // Parse times to verify continuity
    function parseTime(timeStr) {
      const [time, ms] = timeStr.split(',');
      const [h, m, s] = time.split(':').map(Number);
      return h * 3600 + m * 60 + s + parseInt(ms) / 1000;
    }
    
    const cue8End = parseTime(cue8.split(' --> ')[1]);
    const cue9Start = parseTime(cue9.split(' --> ')[0]);
    const cue9End = parseTime(cue9.split(' --> ')[1]);
    const cue10Start = parseTime(cue10.split(' --> ')[0]);
    
    console.log('\n📊 Timeline validation:');
    console.log(`   Cue 8 ends:    ${cue8End.toFixed(1)}s`);
    console.log(`   Cue 9 starts:  ${cue9Start.toFixed(1)}s`);
    console.log(`   Gap 8-9:       ${(cue9Start - cue8End).toFixed(1)}s`);
    console.log(`   Cue 9 ends:    ${cue9End.toFixed(1)}s`);
    console.log(`   Cue 10 starts: ${cue10Start.toFixed(1)}s`);
    console.log(`   Gap 9-10:      ${(cue10Start - cue9End).toFixed(1)}s`);
    
    const isValid = (cue9Start > cue8End) && (cue10Start > cue9End);
    
    console.log(`\n✅ Timeline valid: ${isValid}`);
    
    return {
      success: true,
      outputPath,
      valid: isValid
    };
    
  } else {
    console.log('❌ Target line not found in file');
    return { success: false, reason: 'Target line not found' };
  }
}

// Apply smart fix
const result = smartFixSrt('./videos/subtitle.srt');
console.log('\n🏁 Result:', result);

if (result.success) {
  // Copy to subtitle_fixed.srt
  fs.copyFileSync(result.outputPath, './videos/subtitle_fixed.srt');
  console.log('✅ Copied corrected file to subtitle_fixed.srt');
  
  console.log('\n🎯 Ready for video merging with correct timeline!');
}