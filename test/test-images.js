// Script demo để test chức năng tải ảnh
import { downloadImages, downloadMultipleImages, findImageFromText } from '../findVideo.js';

console.log("🖼️ === DEMO TẢI ÁNH TỪ PEXELS ===");

// Test tải một ảnh đơn lẻ
async function testSingleImage() {
    console.log("\n1️⃣ Test tải một ảnh đơn lẻ:");
    
    try {
        const imageData = await findImageFromText("beautiful landscape");
        
        if (imageData?.url) {
            const filename = `test_single_${Date.now()}.jpg`;
            await downloadImages(imageData.url, filename);
            
            console.log("✅ Tải ảnh đơn lẻ thành công!");
        } else {
            console.log("❌ Không tìm thấy ảnh");
        }
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    }
}

// Test tải nhiều ảnh với nhiều từ khóa
async function testMultipleImages() {
    console.log("\n2️⃣ Test tải nhiều ảnh với nhiều từ khóa:");
    
    const keywords = [
        "food and diet",
        "healthy eating", 
        "cooking"
    ];
    
    try {
        await downloadMultipleImages(keywords, 2); // Tải 2 ảnh cho mỗi từ khóa
        console.log("✅ Tải nhiều ảnh thành công!");
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    }
}

// Chạy demo
async function runDemo() {
    try {
        await testSingleImage();
        await testMultipleImages();
        
        console.log("\n🎉 Demo hoàn thành!");
        console.log("📁 Kiểm tra thư mục 'images' để xem ảnh đã tải");
        
    } catch (error) {
        console.error("💥 Lỗi trong demo:", error.message);
    }
}

// Chạy demo nếu file được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
    runDemo();
}

export { testMultipleImages, testSingleImage };
