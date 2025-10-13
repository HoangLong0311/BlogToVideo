import axios from "axios";
import 'dotenv/config';
import fs from 'fs';
import path from 'path';


async function findVideoFromText(text, minSec = 10, maxSec = 20) {
  const res = await axios.get("https://api.pexels.com/videos/search", {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      params: { query: text, per_page: 20 }
  });

  const videos = res.data.videos.filter((v) => {
    return v.duration >= minSec && v.duration <= maxSec &&
    v.video_files.some(f => f.width == 1920 && f.height == 1080)
  });

  // console.log(videos);

  if (!videos.length) return null;

  return videos[Math.floor(Math.random() * videos.length)].video_files.find((f) => f.quality === "hd")?.link;
}

async function findImageFromText(text) {
  const res = await axios.get("https://api.pexels.com/v1/search", {
    headers: { Authorization: process.env.PEXELS_API_KEY },
    params: {
      query: text,
      per_page: 1,
      orientation: "landscape",  // có thể là “portrait”, “square” tùy bạn
      size: "large"              // kích thước ảnh mong muốn
    }
  });

  const photos = res.data.photos;
  if (!photos || photos.length === 0) return null;

  // Nhiều size src có trong src object
  const photo = photos[0];
  // Ví dụ lấy ảnh lớn (largest) hoặc thích hợp
  const src = photo.src.large2x || photo.src.large || photo.src.original;
  return {
    url: src,
    photographer: photo.photographer,
    width: photo.width,
    height: photo.height
  };
}

async function downloadVideo(url, filename) {
    const folder = path.join(process.cwd(), "videos");
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    const filePath = path.join(folder, filename);
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", () => {
        console.log("✅ Video saved:", filePath);
        resolve(filePath);
        });
        writer.on("error", reject);
    });
}

async function downloadImages(url, filename) {
    const folder = path.join(process.cwd(), "images");
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log("📁 Created images folder:", folder);
    }

    const filePath = path.join(folder, filename);
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", () => {
            console.log("✅ Image saved:", filePath);
            resolve(filePath);
        });
        writer.on("error", (error) => {
            console.error("❌ Error saving image:", error.message);
            reject(error);
        });
    });
}

// Hàm tải nhiều ảnh với các từ khóa khác nhau
async function downloadMultipleImages(keywords, count = 1) {
    console.log(`🖼️ Tải ${count} ảnh cho mỗi từ khóa: ${keywords.join(', ')}`);
    
    for (const keyword of keywords) {
        console.log(`\n🔍 Tìm ảnh cho từ khóa: "${keyword}"`);
        
        for (let i = 0; i < count; i++) {
            try {
                const imageData = await findImageFromText(keyword);
                
                if (imageData?.url) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
                    const extension = imageData.url.split('.').pop()?.split('?')[0] || 'jpg';
                    const cleanKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    const filename = `${cleanKeyword}_${timestamp}_${i + 1}.${extension}`;
                    
                    await downloadImages(imageData.url, filename);
                    
                    console.log(`📊 Thông tin ảnh ${i + 1}:`);
                    console.log(`   📐 Kích thước: ${imageData.width}x${imageData.height}`);
                    console.log(`   📷 Photographer: ${imageData.photographer}`);
                } else {
                    console.log(`⚠️ Không tìm thấy ảnh cho "${keyword}" (lần ${i + 1})`);
                }
                
                // Tạm dừng 1 giây giữa các request để tránh rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Lỗi khi tải ảnh cho "${keyword}":`, error.message);
            }
        }
    }
}

async function returnVideo() {
  // const NumberOfParts = Number(parts);
  // console.log(`🔍 Tìm kiếm ${NumberOfParts} video từ file eng.txt...`);
  
  // Đọc file eng.txt và chia thành các dòng
  const engContent = fs.readFileSync("./eng.txt", "utf8");
  const lines = engContent.split('\n').filter(line => line.trim() !== ''); // Loại bỏ dòng trống
  
  console.log(`📝 Tìm thấy ${lines.length} dòng nội dung trong eng.txt`);
  // console.log(`🎯 Sẽ tải ${Math.min(NumberOfParts, lines.length)} video đầu tiên`);
  
  // Lặp qua từng dòng (hoặc đến NumberOfParts)
  // const actualParts = Math.min(NumberOfParts, lines.length);
  const actualParts = lines.length;
  
  for (let index = 1; index <= actualParts; index++) {
    const currentLine = lines[index - 1].trim();
    console.log(`\n� Xử lý phần ${index}/${actualParts}:`);
    console.log(`   Nội dung: "${currentLine}"`);
    
    try {
      // Lưu dòng hiện tại vào temp.txt
      fs.writeFileSync('./temp.txt', currentLine, 'utf8');
      console.log(`   ✅ Đã lưu vào temp.txt`);
      
      // Tìm video dựa trên nội dung temp.txt
      const videoUrl = await findVideoFromText(currentLine, 10, 16);
      
      if (videoUrl) {
        console.log(`   🎬 Tìm thấy video: ${videoUrl.substring(0, 50)}...`);
        
        // Download video với tên part{index}.mp4
        const filename = `part${index}.mp4`;
        await downloadVideo(videoUrl, filename);
        console.log(`   ✅ Đã tải video: ${filename}`);
      } else {
        console.log(`   ⚠️ Không tìm thấy video phù hợp cho phần ${index}`);
      }
      
      // Tạm dừng 2 giây giữa các request để tránh rate limit
      if (index < actualParts) {
        console.log(`   ⏳ Chờ 2 giây trước khi xử lý phần tiếp theo...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`   ❌ Lỗi khi xử lý phần ${index}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Hoàn thành! Đã tải ${actualParts} video.`);
};

// returnVideo();
// findVideoFromText("beach");
// Xuất các hàm để sử dụng ở nơi khác
export default returnVideo;
export { downloadImages, downloadMultipleImages, findImageFromText, findVideoFromText };
