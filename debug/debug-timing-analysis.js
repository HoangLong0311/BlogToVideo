// Tool debug để phân tích video properties và timing issues
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import "../config/ffmpegConfig.js";

const execAsync = promisify(exec);

console.log("🔍 VIDEO TIMING ANALYSIS TOOL");
console.log("==============================");

async function analyzeVideo(videoPath) {
  console.log(`\n📹 Phân tích: ${path.basename(videoPath)}`);
  
  if (!fs.existsSync(videoPath)) {
    console.log("❌ File không tồn tại!");
    return null;
  }
  
  try {
    // Lấy thông tin chi tiết với ffprobe từ installed path
    const ffprobePath = path.join(process.cwd(), "node_modules", "@ffprobe-installer", "win32-x64", "ffprobe.exe");
    const ffprobeCmd = `"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    const { stdout } = await execAsync(ffprobeCmd);
    const data = JSON.parse(stdout);
    
    const videoStream = data.streams.find(s => s.codec_type === 'video');
    const audioStream = data.streams.find(s => s.codec_type === 'audio');
    
    const analysis = {
      file: path.basename(videoPath),
      size: (fs.statSync(videoPath).size / 1024 / 1024).toFixed(2) + 'MB',
      duration: parseFloat(data.format.duration || 0),
      bitrate: parseInt(data.format.bit_rate || 0),
      
      // Video info
      video: videoStream ? {
        codec: videoStream.codec_name,
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate || '0/1'), // Evaluate fraction
        avg_fps: eval(videoStream.avg_frame_rate || '0/1'),
        time_base: videoStream.time_base,
        start_time: parseFloat(videoStream.start_time || 0),
        nb_frames: parseInt(videoStream.nb_frames || 0),
        pix_fmt: videoStream.pix_fmt
      } : null,
      
      // Audio info
      audio: audioStream ? {
        codec: audioStream.codec_name,
        sample_rate: parseInt(audioStream.sample_rate || 0),
        channels: audioStream.channels,
        duration: parseFloat(audioStream.duration || 0),
        start_time: parseFloat(audioStream.start_time || 0)
      } : null
    };
    
    // Display analysis
    console.log(`   📏 Duration: ${analysis.duration.toFixed(2)}s`);
    console.log(`   💾 Size: ${analysis.size}`);
    console.log(`   🎬 Bitrate: ${(analysis.bitrate / 1000).toFixed(0)} kbps`);
    
    if (analysis.video) {
      console.log(`   🖼️  Video: ${analysis.video.codec} ${analysis.video.width}x${analysis.video.height}`);
      console.log(`   🎞️  FPS: ${analysis.video.fps.toFixed(2)} (avg: ${analysis.video.avg_fps.toFixed(2)})`);
      console.log(`   ⏰ Video Start: ${analysis.video.start_time}s`);
      console.log(`   🎯 Frames: ${analysis.video.nb_frames}`);
      console.log(`   📐 Time Base: ${analysis.video.time_base}`);
      console.log(`   🎨 Pixel Format: ${analysis.video.pix_fmt}`);
    }
    
    if (analysis.audio) {
      console.log(`   🔊 Audio: ${analysis.audio.codec} ${analysis.audio.sample_rate}Hz ${analysis.audio.channels}ch`);
      console.log(`   ⏰ Audio Start: ${analysis.audio.start_time}s`);
      console.log(`   ⏱️  Audio Duration: ${analysis.audio.duration.toFixed(2)}s`);
    }
    
    // Warning checks
    if (Math.abs(analysis.video.fps - analysis.video.avg_fps) > 0.1) {
      console.log(`   ⚠️  CẢNH BÁO: FPS không ổn định! (${analysis.video.fps} vs ${analysis.video.avg_fps})`);
    }
    
    if (analysis.video.start_time !== 0) {
      console.log(`   ⚠️  CẢNH BÁO: Video không bắt đầu từ 0s!`);
    }
    
    if (analysis.audio && analysis.audio.start_time !== 0) {
      console.log(`   ⚠️  CẢNH BÁO: Audio không bắt đầu từ 0s!`);
    }
    
    if (analysis.audio && Math.abs(analysis.audio.duration - analysis.duration) > 0.1) {
      console.log(`   ⚠️  CẢNH BÁO: Audio/Video duration mismatch!`);
    }
    
    return analysis;
    
  } catch (error) {
    console.log(`   ❌ Lỗi phân tích: ${error.message}`);
    return null;
  }
}

async function predictMergedDuration(analyses) {
  const totalDuration = analyses.reduce((sum, analysis) => {
    return sum + (analysis ? analysis.duration : 0);
  }, 0);
  
  console.log(`\n📊 DỰ ĐOÁN KẾT QUẢ GHÉP:`);
  console.log(`   ⏱️  Tổng duration dự kiến: ${totalDuration.toFixed(2)}s`);
  console.log(`   🎯 Tổng thời gian hiển thị: ${Math.floor(totalDuration / 60)}:${(totalDuration % 60).toFixed(0).padStart(2, '0')}`);
  
  // Check for potential issues
  const fpsList = analyses.filter(a => a && a.video).map(a => a.video.fps);
  const uniqueFps = [...new Set(fpsList.map(fps => Math.round(fps)))];
  
  if (uniqueFps.length > 1) {
    console.log(`   ⚠️  CẢNH BÁO: Multiple FPS detected: ${uniqueFps.join(', ')}`);
    console.log(`   💡 Khuyến nghị: Sử dụng re-encode với fixed FPS`);
  }
  
  const codecsList = analyses.filter(a => a && a.video).map(a => a.video.codec);
  const uniqueCodecs = [...new Set(codecsList)];
  
  if (uniqueCodecs.length > 1) {
    console.log(`   ⚠️  CẢNH BÁO: Multiple codecs: ${uniqueCodecs.join(', ')}`);
    console.log(`   💡 Khuyến nghị: Sử dụng re-encode`);
  }
  
  return totalDuration;
}

async function analyzeTestVideos() {
  const testFolder = path.join(process.cwd(), "videos");
  const videoPaths = [
    path.join(testFolder, "part3.mp4"),
    path.join(testFolder, "part4.mp4")
  ];
  
  console.log("🎯 Phân tích video test cases...");
  
  const analyses = [];
  for (const videoPath of videoPaths) {
    const analysis = await analyzeVideo(videoPath);
    analyses.push(analysis);
  }
  
  if (analyses.every(a => a !== null)) {
    await predictMergedDuration(analyses.filter(a => a !== null));
  }
  
  // Check for the problematic merged video
  const mergedPath = path.join(testFolder, "merged_video_2025-10-10_03-42-57-589Z.mp4");
  if (fs.existsSync(mergedPath)) {
    console.log("\n🔍 PHÂN TÍCH VIDEO ĐÃ GHÉP (có vấn đề):");
    await analyzeVideo(mergedPath);
  }
}

// Chạy analysis
analyzeTestVideos()
  .then(() => {
    console.log("\n✅ Phân tích hoàn thành!");
  })
  .catch(error => {
    console.error("\n💥 Lỗi phân tích:", error.message);
  });