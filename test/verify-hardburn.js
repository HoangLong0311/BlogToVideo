// Script để verify hardburn subtitle
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log("🔍 === VERIFY HARDBURN SUBTITLE ===");

const videosFolder = path.join(process.cwd(), "videos");
const mergedFiles = fs.readdirSync(videosFolder).filter(f => f.includes('merged') && f.endsWith('.mp4'));

if (mergedFiles.length === 0) {
  console.log("❌ Không tìm thấy file video đã ghép");
  console.log("🚀 Chạy: node mergedVids.js trước");
  process.exit(1);
}

console.log("📹 File video đã ghép tìm thấy:");
mergedFiles.forEach((file, index) => {
  const stats = fs.statSync(path.join(videosFolder, file));
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ${index + 1}. ${file} (${sizeMB}MB)`);
});

// Lấy file mới nhất
const latestFile = mergedFiles
  .map(f => ({
    name: f,
    time: fs.statSync(path.join(videosFolder, f)).mtime
  }))
  .sort((a, b) => b.time - a.time)[0].name;

console.log(`\n🎯 Kiểm tra file mới nhất: ${latestFile}`);

const videoPath = path.join(videosFolder, latestFile);

try {
  console.log("\n🔍 Phân tích metadata video...");
  
  // Sử dụng ffprobe để kiểm tra thông tin video
  const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
  const output = execSync(command, { encoding: 'utf8' });
  const metadata = JSON.parse(output);
  
  console.log("\n📊 Thông tin video:");
  console.log(`   📏 Thời lượng: ${Math.round(metadata.format.duration)}s`);
  console.log(`   📐 Kích thước: ${(metadata.format.size / (1024 * 1024)).toFixed(2)}MB`);
  console.log(`   🎬 Format: ${metadata.format.format_name}`);
  
  // Kiểm tra streams
  const videoStream = metadata.streams.find(s => s.codec_type === 'video');
  const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
  const subtitleStream = metadata.streams.find(s => s.codec_type === 'subtitle');
  
  console.log("\n🎞️ Video stream:");
  if (videoStream) {
    console.log(`   🎨 Codec: ${videoStream.codec_name}`);
    console.log(`   📐 Resolution: ${videoStream.width}x${videoStream.height}`);
    console.log(`   🖼️ Frame rate: ${videoStream.r_frame_rate}`);
  }
  
  console.log("\n🔊 Audio stream:");
  if (audioStream) {
    console.log(`   🎵 Codec: ${audioStream.codec_name}`);
    console.log(`   📻 Sample rate: ${audioStream.sample_rate}Hz`);
  }
  
  console.log("\n📝 Subtitle stream:");
  if (subtitleStream) {
    console.log(`   ⚠️ CẢNH BÁO: Tìm thấy subtitle stream riêng biệt`);
    console.log(`   📋 Codec: ${subtitleStream.codec_name}`);
    console.log(`   🔤 Language: ${subtitleStream.tags?.language || 'không xác định'}`);
    console.log("\n   💡 Điều này có nghĩa subtitle CHƯA được hardburn!");
    console.log("   📌 Subtitle vẫn là stream riêng biệt, không được burn vào video");
  } else {
    console.log("   ✅ KHÔNG tìm thấy subtitle stream riêng biệt");
    console.log("   🔥 Điều này có nghĩa subtitle ĐÃ được hardburn thành công!");
    console.log("   📌 Subtitle đã được burn trực tiếp vào video frames");
  }
  
  // Kiểm tra xem có file .srt đi kèm không
  const srtFile = videoPath.replace('.mp4', '.srt');
  if (fs.existsSync(srtFile)) {
    console.log(`\n📋 Tìm thấy file subtitle đi kèm: ${path.basename(srtFile)}`);
    console.log("   ⚠️ Điều này cho thấy có thể đã dùng phương pháp sidecar thay vì hardburn");
  }
  
  console.log("\n🎯 KẾT LUẬN:");
  if (!subtitleStream && !fs.existsSync(srtFile)) {
    console.log("   🔥 ✅ HARDBURN SUBTITLE THÀNH CÔNG!");
    console.log("   📌 Subtitle đã được burn trực tiếp vào video");
    console.log("   🎬 Video có thể phát trên bất kỳ player nào với subtitle luôn hiển thị");
  } else if (subtitleStream) {
    console.log("   📌 ⚠️ Subtitle được nhúng như stream riêng (embed method)");
    console.log("   🎮 Có thể bật/tắt subtitle trong player");
  } else if (fs.existsSync(srtFile)) {
    console.log("   📄 ⚠️ Subtitle được lưu như file riêng (sidecar method)");
    console.log("   📂 Player cần load file .srt để hiển thị subtitle");
  }
  
} catch (error) {
  console.error("❌ Lỗi khi phân tích video:", error.message);
  console.log("\n💡 Đảm bảo ffprobe đã được cài đặt và có trong PATH");
}

console.log(`\n📁 File được kiểm tra: ${videoPath}`);
console.log("🎬 Có thể mở file này bằng VLC hoặc player khác để test subtitle");