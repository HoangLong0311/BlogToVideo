// Script monitor CPU usage khi ghép video
import { exec } from "child_process";
import path from "path";
import "../config/ffmpegConfig.js";
import { mergeVideosWithReencode } from "../modules/videoMerger.js";
import { findVideoFiles } from "../utils/fileUtils.js";

console.log("🖥️ MONITOR CPU USAGE KHI GHÉP VIDEO");
console.log("=====================================");

const testFolder = path.join(process.cwd(), "videos");
const videoPaths = findVideoFiles(testFolder);

if (videoPaths.length < 2) {
  console.log("❌ Cần ít nhất 2 video để test");
  process.exit(1);
}

console.log(`📹 Test với ${videoPaths.length} video`);

// Monitor CPU usage function
function monitorCPU() {
  const interval = setInterval(() => {
    exec('wmic process where name="ffmpeg.exe" get processid,percentprocessortime,workingsetsize /format:csv', (error, stdout, stderr) => {
      if (error) return;
      
      const processes = stdout.split('\n').filter(line => line.includes('ffmpeg.exe'));
      if (processes.length > 0) {
        console.log(`🖥️ FFmpeg processes running: ${processes.length}`);
        processes.forEach(proc => {
          const parts = proc.split(',');
          if (parts.length >= 3) {
            console.log(`   PID: ${parts[1]}, Memory: ${(parseInt(parts[2]) / 1024 / 1024).toFixed(2)}MB`);
          }
        });
      }
    });
    
    // Task Manager style CPU check
    exec('wmic process where name="ffmpeg.exe" get processid,PageFileUsage,WorkingSetSize /format:list', (error, stdout, stderr) => {
      if (!error && stdout.includes('ffmpeg.exe')) {
        console.log(`⚡ FFmpeg đang chạy - Memory usage được monitor...`);
      }
    });
  }, 2000); // Check every 2 seconds
  
  return interval;
}

async function testWithMonitoring() {
  const outputPath = path.join(testFolder, `monitor_test_${Date.now()}.mp4`);
  
  console.log("\n🔄 Bắt đầu test re-encode với monitoring...");
  const cpuMonitor = monitorCPU();
  
  const startTime = Date.now();
  let processCount = 0;
  
  // Count process starts
  const originalExec = require('child_process').exec;
  require('child_process').exec = function(...args) {
    if (args[0] && args[0].includes('ffmpeg')) {
      processCount++;
      console.log(`🚀 FFmpeg process #${processCount} started`);
    }
    return originalExec.apply(this, args);
  };
  
  try {
    await mergeVideosWithReencode(videoPaths, outputPath);
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Test hoàn thành trong: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Tổng số FFmpeg processes: ${processCount}`);
    
  } catch (error) {
    console.error(`\n❌ Test thất bại: ${error.message}`);
  } finally {
    clearInterval(cpuMonitor);
    console.log("\n🔚 Monitoring dừng");
  }
}

// Run test with timeout
const testTimeout = setTimeout(() => {
  console.log("\n⏰ MONITOR TEST TIMEOUT!");
  process.exit(1);
}, 10 * 60 * 1000); // 10 minutes

testWithMonitoring()
  .then(() => {
    clearTimeout(testTimeout);
    console.log("\n✅ Monitor test hoàn thành!");
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(testTimeout);
    console.error("\n💥 Monitor test thất bại:", error.message);
    process.exit(1);
  });