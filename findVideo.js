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

  // console.log(videos)

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

const inputText = fs.readFileSync("./eng.txt", "utf8");

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

const returnVideo = async () => {
  console.log("🔍 Tìm kiếm video và ảnh phù hợp...");
  
  const videoUrl = await findVideoFromText(inputText, 10, 16);
  const imageData = await findImageFromText(inputText);
  
  console.log("🎬 Video phù hợp:", videoUrl);
  console.log("🖼️ Ảnh phù hợp:", imageData?.url);
  
  if (imageData) {
    console.log("📊 Thông tin ảnh:");
    console.log(`   📐 Kích thước: ${imageData.width}x${imageData.height}`);
    console.log(`   📷 Photographer: ${imageData.photographer}`);
  }

  // Download video nếu tìm thấy
  if (videoUrl) {
    await downloadVideo(videoUrl, 'part4.mp4');
  } else {
    console.log("⚠️ Không tìm thấy video phù hợp");
  }

  // Download ảnh nếu tìm thấy
  if (imageData?.url) {
    // Tạo tên file với timestamp để tránh trùng
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const extension = imageData.url.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `image_${timestamp}_${Date.now()}.${extension}`;
    
    await downloadImages(imageData.url, filename);
  } else {
    console.log("⚠️ Không tìm thấy ảnh phù hợp");
  }
};

returnVideo();
// findVideoFromText("beach");
// Xuất các hàm để sử dụng ở nơi khác
export default returnVideo;
export { downloadImages, downloadMultipleImages, findImageFromText, findVideoFromText };
