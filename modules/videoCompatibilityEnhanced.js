// Enhanced video compatibility checker with timing safety
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function checkVideoCompatibilityEnhanced(videoPaths) {
  console.log("🔍 Kiểm tra tương thích video (Enhanced)...");
  
  const ffprobePath = path.join(process.cwd(), "node_modules", "@ffprobe-installer", "win32-x64", "ffprobe.exe");
  
  if (!fs.existsSync(ffprobePath)) {
    console.log("⚠️ FFprobe không tìm thấy, sử dụng safe mode");
    return {
      needsReencode: true, // Safe default: ALWAYS re-encode
      hasFpsMismatch: true,
      hasResolutionMismatch: true,
      hasTimingIssues: true,
      infos: []
    };
  }
  
  const videoInfos = [];
  let needsReencode = false;
  let hasFpsMismatch = false;
  let hasResolutionMismatch = false;
  let hasTimingIssues = false;
  
  for (let i = 0; i < videoPaths.length; i++) {
    const videoPath = videoPaths[i];
    
    try {
      console.log(`   📹 Analyzing ${i + 1}/${videoPaths.length}: ${path.basename(videoPath)}`);
      
      const ffprobeCmd = `"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      const { stdout } = await execAsync(ffprobeCmd);
      const data = JSON.parse(stdout);
      
      const videoStream = data.streams.find(s => s.codec_type === 'video');
      const audioStream = data.streams.find(s => s.codec_type === 'audio');
      
      if (!videoStream) {
        console.log(`   ❌ Không tìm thấy video stream trong ${path.basename(videoPath)}`);
        needsReencode = true;
        continue;
      }
      
      const info = {
        path: videoPath,
        name: path.basename(videoPath),
        duration: parseFloat(data.format.duration || 0),
        size: fs.statSync(videoPath).size,
        
        // Video properties
        codec: videoStream.codec_name,
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate || '0/1'),
        avg_fps: eval(videoStream.avg_frame_rate || '0/1'),
        time_base: videoStream.time_base,
        start_time: parseFloat(videoStream.start_time || 0),
        pix_fmt: videoStream.pix_fmt,
        
        // Audio properties
        audioCodec: audioStream ? audioStream.codec_name : null,
        sampleRate: audioStream ? parseInt(audioStream.sample_rate) : null,
        channels: audioStream ? audioStream.channels : null,
        audioStartTime: audioStream ? parseFloat(audioStream.start_time || 0) : 0
      };
      
      // Check for timing issues
      if (info.start_time !== 0) {
        console.log(`   ⚠️  TIMING ISSUE: Video start time = ${info.start_time}s`);
        hasTimingIssues = true;
        needsReencode = true;
      }
      
      if (info.audioStartTime !== 0) {
        console.log(`   ⚠️  TIMING ISSUE: Audio start time = ${info.audioStartTime}s`);
        hasTimingIssues = true;
        needsReencode = true;
      }
      
      if (Math.abs(info.fps - info.avg_fps) > 0.1) {
        console.log(`   ⚠️  FPS INSTABILITY: ${info.fps} vs ${info.avg_fps}`);
        hasTimingIssues = true;
        needsReencode = true;
      }
      
      videoInfos.push(info);
      
    } catch (error) {
      console.log(`   ❌ Lỗi analyze ${path.basename(videoPath)}: ${error.message}`);
      needsReencode = true; // Safe default
    }
  }
  
  // Cross-video compatibility check
  if (videoInfos.length > 1) {
    // Check FPS consistency
    const fpsList = videoInfos.map(info => Math.round(info.fps));
    const uniqueFps = [...new Set(fpsList)];
    
    if (uniqueFps.length > 1) {
      console.log(`   🚨 CRITICAL: FPS mismatch detected: ${uniqueFps.join(', ')}`);
      console.log(`   💀 This WILL cause 4.5-hour timing bug!`);
      hasFpsMismatch = true;
      needsReencode = true;
    }
    
    // Check resolution consistency
    const resolutions = videoInfos.map(info => `${info.width}x${info.height}`);
    const uniqueResolutions = [...new Set(resolutions)];
    
    if (uniqueResolutions.length > 1) {
      console.log(`   ⚠️  Resolution mismatch: ${uniqueResolutions.join(', ')}`);
      hasResolutionMismatch = true;
      needsReencode = true;
    }
    
    // Check codec consistency
    const codecs = videoInfos.map(info => info.codec);
    const uniqueCodecs = [...new Set(codecs)];
    
    if (uniqueCodecs.length > 1) {
      console.log(`   ⚠️  Codec mismatch: ${uniqueCodecs.join(', ')}`);
      needsReencode = true;
    }
  }
  
  // Final recommendation
  console.log(`\n🎯 COMPATIBILITY RESULT:`);
  console.log(`   Need Re-encode: ${needsReencode ? '✅ YES (REQUIRED)' : '❌ No'}`);
  console.log(`   FPS Issues: ${hasFpsMismatch ? '🚨 CRITICAL' : '✅ OK'}`);
  console.log(`   Resolution Issues: ${hasResolutionMismatch ? '⚠️  YES' : '✅ OK'}`);
  console.log(`   Timing Issues: ${hasTimingIssues ? '⚠️  YES' : '✅ OK'}`);
  
  return {
    needsReencode,
    hasFpsMismatch,
    hasResolutionMismatch,
    hasTimingIssues,
    infos: videoInfos,
    
    // Safe defaults for compatibility
    codecs: { 
      video: [...new Set(videoInfos.map(i => i.codec))], 
      audio: [...new Set(videoInfos.map(i => i.audioCodec).filter(Boolean))] 
    },
    resolutions: [...new Set(videoInfos.map(i => `${i.width}x${i.height}`))]
  };
}