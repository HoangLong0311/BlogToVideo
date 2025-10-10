import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("🧪 TEST: Các phương pháp concat khác nhau");

const videosDir = path.join(process.cwd(), 'videos');
const videoFiles = ['part1.mp4', 'part2.mp4', 'part3.mp4'];
const fileListPath = path.join(process.cwd(), 'test_different_methods.txt');

// Tạo file list
const fileContent = videoFiles.map((file) => {
  const fullPath = path.join(videosDir, file);
  let processedPath = path.resolve(fullPath).replace(/\\/g, '/').replace(/'/g, "\\'");
  return `file '${processedPath}'`;
}).join("\n");

fs.writeFileSync(fileListPath, fileContent, 'utf8');

console.log("📝 File list content:");
console.log(fileContent);
console.log("");

// TEST METHOD 1: Concat filter với scale (force same resolution)
console.log("🧪 METHOD 1: Concat filter với scale");
const output1 = path.join(videosDir, 'test_method1_filter.mp4');

try {
  const cmd1 = `"${process.cwd()}\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe" -i "${path.join(videosDir, 'part1.mp4')}" -i "${path.join(videosDir, 'part2.mp4')}" -i "${path.join(videosDir, 'part3.mp4')}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30[v0];[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30[v1];[2:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30[v2];[v0][v1][v2]concat=n=3:v=1:a=0[outv]" -map "[outv]" -c:v libx264 -crf 23 -preset fast "${output1}"`;
  
  console.log("Executing filter method...");
  const { stdout, stderr } = await execAsync(cmd1);
  
  // Kiểm tra kết quả
  if (fs.existsSync(output1)) {
    const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format "${output1}"`;
    const { stdout: probeOut } = await execAsync(ffprobeCmd);
    const info = JSON.parse(probeOut);
    
    console.log(`✅ METHOD 1 SUCCESS:`);
    console.log(`   Duration: ${parseFloat(info.format.duration).toFixed(2)}s`);
    console.log(`   Size: ${(info.format.size / (1024 * 1024)).toFixed(2)}MB`);
  }
} catch (error) {
  console.log("❌ METHOD 1 FAILED:", error.message.substring(0, 200));
}

console.log("");

// TEST METHOD 2: Chuyển đổi từng video trước, rồi concat
console.log("🧪 METHOD 2: Convert videos first, then concat");

try {
  // Step 1: Convert each video to same format
  const convertedVideos = [];
  
  for (let i = 0; i < videoFiles.length; i++) {
    const inputFile = path.join(videosDir, videoFiles[i]);
    const convertedFile = path.join(videosDir, `temp_converted_${i + 1}.mp4`);
    
    const convertCmd = `"${process.cwd()}\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe" -i "${inputFile}" -c:v libx264 -c:a aac -r 30 -s 1280x720 -crf 23 -preset fast -movflags +faststart "${convertedFile}"`;
    
    await execAsync(convertCmd);
    convertedVideos.push(convertedFile);
    console.log(`   Converted ${i + 1}/${videoFiles.length}: ${videoFiles[i]}`);
  }
  
  // Step 2: Create new file list with converted videos
  const convertedListPath = path.join(process.cwd(), 'converted_list.txt');
  const convertedContent = convertedVideos.map((file) => {
    let processedPath = path.resolve(file).replace(/\\/g, '/').replace(/'/g, "\\'");
    return `file '${processedPath}'`;
  }).join("\n");
  
  fs.writeFileSync(convertedListPath, convertedContent, 'utf8');
  
  // Step 3: Concat converted videos
  const output2 = path.join(videosDir, 'test_method2_convert_then_concat.mp4');
  const concatCmd = `"${process.cwd()}\\node_modules\\@ffmpeg-installer\\win32-x64\\ffmpeg.exe" -f concat -safe 0 -i "${convertedListPath}" -c copy "${output2}"`;
  
  await execAsync(concatCmd);
  
  // Kiểm tra kết quả
  if (fs.existsSync(output2)) {
    const ffprobeCmd = `"${process.cwd()}\\node_modules\\@ffprobe-installer\\win32-x64\\ffprobe.exe" -v quiet -print_format json -show_format "${output2}"`;
    const { stdout: probeOut } = await execAsync(ffprobeCmd);
    const info = JSON.parse(probeOut);
    
    console.log(`✅ METHOD 2 SUCCESS:`);
    console.log(`   Duration: ${parseFloat(info.format.duration).toFixed(2)}s`);
    console.log(`   Size: ${(info.format.size / (1024 * 1024)).toFixed(2)}MB`);
  }
  
  // Cleanup converted files
  for (const file of convertedVideos) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
  if (fs.existsSync(convertedListPath)) {
    fs.unlinkSync(convertedListPath);
  }
  
} catch (error) {
  console.log("❌ METHOD 2 FAILED:", error.message.substring(0, 200));
}

// Cleanup
if (fs.existsSync(fileListPath)) {
  fs.unlinkSync(fileListPath);
}

console.log("\n🎯 EXPECTED: 31.45s total duration");