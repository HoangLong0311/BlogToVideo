// Hàm xử lý và hiển thị lỗi chi tiết
export function handleVideoError(err) {
  console.error("❌ Lỗi khi ghép video:", err.message);
  
  // Gợi ý một số lỗi thường gặp
  if (err.message.includes('No such file')) {
    console.log("💡 Gợi ý: Kiểm tra lại đường dẫn file video");
  } else if (err.message.includes('codec') || err.message.includes('Decoder')) {
    console.log("💡 Gợi ý: Video có codec không tương thích");
    console.log("   - Thử convert video về MP4/H.264 trước khi ghép");
    console.log("   - Hoặc dùng tham số --subtitle=embed thay vì hardburn");
  } else if (err.message.includes('Permission denied')) {
    console.log("💡 Gợi ý: Kiểm tra quyền truy cập thư mục");
  } else if (err.message.includes('ffprobe') || err.message.includes('FFprobe')) {
    console.log("💡 Gợi ý: FFprobe không tìm thấy hoặc không hoạt động");
    console.log("   - Cài đặt: npm install @ffprobe-installer/ffprobe");
    console.log("   - Hoặc tải FFmpeg full từ: https://ffmpeg.org/download.html");
    console.log("   - Script vẫn có thể chạy nhưng không kiểm tra được tương thích video");
    console.log("   - Thử chạy: node check-ffmpeg-setup.js để kiểm tra setup");
  } else if (err.message.includes('timeout') || err.message.includes('Timeout')) {
    console.log("💡 Gợi ý: Quá trình ghép video quá lâu");
    console.log("   - Video có thể quá lớn hoặc có vấn đề");
    console.log("   - Thử chia nhỏ thành các batch nhỏ hơn");
    console.log("   - Kiểm tra dung lượng ổ cứng còn trống");
  } else if (err.message.includes('format') || err.message.includes('Invalid')) {
    console.log("💡 Gợi ý: Định dạng video không hợp lệ");
    console.log("   - Kiểm tra tất cả file có phải video hợp lệ không");
    console.log("   - Thử với video định dạng khác (.mp4, .avi, .mov)");
  } else if (err.message.includes('memory') || err.message.includes('Memory')) {
    console.log("💡 Gợi ý: Hết bộ nhớ");
    console.log("   - Đóng các ứng dụng khác để giải phóng RAM");
    console.log("   - Thử ghép ít video hơr trong một lần");
  } else if (err.message.includes('frame') || err.message.includes('timestamp') || 
             err.message.includes('timing') || err.message.includes('sync')) {
    console.log("💡 Gợi ý: Vấn đề về timing/đồng bộ video");
    console.log("   - Thử: node handleVideo.js --normalize");
    console.log("   - Hoặc: node handleVideo.js --fix-timing");
    console.log("   - Chuẩn hóa framerate và timestamp cho tất cả video");
  } else {
    console.log("💡 Gợi ý chung:");
    console.log("   - Kiểm tra tất cả video có mở được không");
    console.log("   - Thử ghép từng cặp video để tìm video lỗi");
    console.log("   - Đảm bảo đủ dung lượng ổ cứng trống");
    console.log("   - Nếu video bị tua nhanh/đứng hình: thử --normalize");
    console.log("   - Khởi động lại máy nếu cần thiết");
  }
}

// Hàm hiển thị help
export function showHelp() {
  console.log("🎬 === CÔNG CỤ GHÉP VIDEO & GẮN SUBTITLE - HƯỚNG DẪN ===");
  console.log("Cách sử dụng:");
  console.log("  node handleVideo.js                         # Ghép video và burn subtitle (mặc định)");
  console.log("  node handleVideo.js --folder=path           # Chỉ định thư mục khác");
  console.log("  node handleVideo.js --subtitle=hardburn     # Burn subtitle vào video (mặc định)");
  console.log("  node handleVideo.js --subtitle=embed        # Nhúng subtitle vào video (có thể bật/tắt)");
  console.log("  node handleVideo.js --subtitle=sidecar      # Tạo file subtitle riêng");
  console.log("  node handleVideo.js --normalize             # Force chuẩn hóa format (khắc phục timing)");
  console.log("  node handleVideo.js --fix-timing            # Alias cho --normalize");
  console.log("  node handleVideo.js --cleanup=yes           # Tự động xóa file gốc sau khi ghép");
  console.log("  node handleVideo.js --cleanup=source        # Chỉ xóa file gốc, giữ file trung gian");
  console.log("  node handleVideo.js --cleanup=no            # Giữ lại tất cả file");
  console.log("  node handleVideo.js --help                  # Hiển thị hướng dẫn này");
  console.log("\nĐịnh dạng video hỗ trợ:");
  console.log("  .mp4, .avi, .mov, .mkv, .flv, .wmv, .webm");
  console.log("\nĐịnh dạng subtitle hỗ trợ:");
  console.log("  .srt, .ass, .ssa, .vtt");
  console.log("\nPhương pháp gắn subtitle:");
  console.log("  📌 embed     - Nhúng vào video (có thể bật/tắt trong player)");
  console.log("  🔥 hardburn  - Burn vào video (luôn hiển thị, không thể tắt)");
  console.log("  📄 sidecar   - File subtitle riêng (cùng tên với video)");
  console.log("\nTùy chọn khắc phục lỗi:");
  console.log("  🔧 --normalize   - Chuẩn hóa format, framerate, timestamp");
  console.log("                     Khắc phục: video tua nhanh, đứng hình, không đồng bộ");
  console.log("                     Chậm hơn nhưng ổn định với video có vấn đề");
  console.log("\nChức năng:");
  console.log("  ✅ Ghép nhiều video thành 1 file");
  console.log("  ✅ 3 phương pháp gắn subtitle khác nhau");
  console.log("  ✅ Tự động fallback nếu một phương pháp thất bại");
  console.log("  ✅ Smart timing fix cho video có vấn đề");
  console.log("  ✅ Hiển thị progress bar trong quá trình xử lý");
  console.log("  ✅ Tạo tên file output tự động theo timestamp");
  console.log("  ✅ Tự động dọn dẹp file gốc sau khi ghép (tùy chọn)");
  console.log("\nTùy chọn dọn dẹp:");
  console.log("  🗑️ --cleanup=yes     - Xóa tất cả file gốc và file trung gian");
  console.log("  🗑️ --cleanup=source  - Chỉ xóa file gốc, giữ file không có subtitle");
  console.log("  🗑️ --cleanup=no      - Giữ lại tất cả file (mặc định)");
  console.log("=============================================================");
}