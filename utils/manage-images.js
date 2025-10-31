// Script quản lý ảnh trong thư mục images
import fs from 'fs';
import path from 'path';

const imagesFolder = path.join(process.cwd(), "images");

// Hàm liệt kê tất cả ảnh
function listImages() {
    if (!fs.existsSync(imagesFolder)) {
        console.log("📁 Thư mục 'images' chưa tồn tại");
        return [];
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const files = fs.readdirSync(imagesFolder);
    
    const imageFiles = files.filter(file => 
        imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );

    return imageFiles.map(file => {
        const filePath = path.join(imagesFolder, file);
        const stats = fs.statSync(filePath);
        return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
            modified: stats.mtime
        };
    });
}

// Hàm hiển thị thông tin ảnh
function showImagesInfo() {
    console.log("🖼️ === THÔNG TIN ẢNH TRONG THƯ MỤC ===");
    
    const images = listImages();
    
    if (images.length === 0) {
        console.log("📭 Không có ảnh nào trong thư mục 'images'");
        console.log("💡 Chạy 'node findVideo.js' hoặc 'node test-images.js' để tải ảnh");
        return;
    }

    console.log(`📊 Tổng số ảnh: ${images.length}`);
    
    const totalSizeMB = images.reduce((sum, img) => sum + parseFloat(img.sizeMB), 0);
    console.log(`💾 Tổng dung lượng: ${totalSizeMB.toFixed(2)}MB`);
    
    console.log("\n📋 Danh sách ảnh:");
    images
        .sort((a, b) => b.modified - a.modified) // Sắp xếp theo thời gian mới nhất
        .forEach((img, index) => {
            const modifiedDate = img.modified.toLocaleString();
            console.log(`   ${index + 1}. ${img.name} (${img.sizeMB}MB) - ${modifiedDate}`);
        });
}

// Hàm xóa ảnh cũ
function cleanupOldImages(daysOld = 7) {
    console.log(`🧹 Xóa ảnh cũ hơn ${daysOld} ngày...`);
    
    const images = listImages();
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    
    const oldImages = images.filter(img => img.modified < cutoffDate);
    
    if (oldImages.length === 0) {
        console.log("✅ Không có ảnh cũ nào cần xóa");
        return;
    }

    console.log(`🗑️ Sẽ xóa ${oldImages.length} ảnh cũ:`);
    oldImages.forEach(img => {
        console.log(`   - ${img.name} (${img.sizeMB}MB)`);
    });

    // Xác nhận trước khi xóa
    const args = process.argv.slice(2);
    const confirmed = args.includes('--confirm');
    
    if (!confirmed) {
        console.log("\n⚠️ Để xác nhận xóa, thêm --confirm vào cuối command");
        console.log("🔧 Ví dụ: node manage-images.js cleanup --confirm");
        return;
    }

    // Thực hiện xóa
    let deletedCount = 0;
    oldImages.forEach(img => {
        try {
            fs.unlinkSync(img.path);
            console.log(`✅ Đã xóa: ${img.name}`);
            deletedCount++;
        } catch (error) {
            console.error(`❌ Lỗi khi xóa ${img.name}:`, error.message);
        }
    });

    console.log(`\n🎉 Đã xóa ${deletedCount}/${oldImages.length} ảnh cũ`);
}

// Hàm sao chép ảnh sang thư mục khác
function copyImagesTo(destinationFolder) {
    console.log(`📂 Sao chép ảnh sang: ${destinationFolder}`);
    
    const images = listImages();
    
    if (images.length === 0) {
        console.log("❌ Không có ảnh nào để sao chép");
        return;
    }

    // Tạo thư mục đích nếu chưa có
    if (!fs.existsSync(destinationFolder)) {
        fs.mkdirSync(destinationFolder, { recursive: true });
        console.log(`📁 Đã tạo thư mục: ${destinationFolder}`);
    }

    let copiedCount = 0;
    images.forEach(img => {
        try {
            const destPath = path.join(destinationFolder, img.name);
            fs.copyFileSync(img.path, destPath);
            console.log(`✅ Đã sao chép: ${img.name}`);
            copiedCount++;
        } catch (error) {
            console.error(`❌ Lỗi khi sao chép ${img.name}:`, error.message);
        }
    });

    console.log(`\n🎉 Đã sao chép ${copiedCount}/${images.length} ảnh`);
}

// Xử lý command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'list':
    case 'info':
        showImagesInfo();
        break;
        
    case 'cleanup':
        const days = parseInt(args[1]) || 7;
        cleanupOldImages(days);
        break;
        
    case 'copy':
        const destination = args[1];
        if (!destination) {
            console.log("❌ Cần chỉ định thư mục đích");
            console.log("🔧 Ví dụ: node manage-images.js copy /path/to/destination");
        } else {
            copyImagesTo(destination);
        }
        break;
        
    case 'help':
    default:
        console.log("🖼️ === QUẢN LÝ ẢNH - HƯỚNG DẪN ===");
        console.log("Cách sử dụng:");
        console.log("  node manage-images.js info              # Hiển thị thông tin ảnh");
        console.log("  node manage-images.js list              # Liệt kê tất cả ảnh");
        console.log("  node manage-images.js cleanup [days]    # Xóa ảnh cũ (mặc định 7 ngày)");
        console.log("  node manage-images.js copy [path]       # Sao chép ảnh sang thư mục khác");
        console.log("  node manage-images.js help              # Hiển thị hướng dẫn này");
        console.log("\nVí dụ:");
        console.log("  node manage-images.js cleanup 3 --confirm    # Xóa ảnh cũ hơn 3 ngày");
        console.log("  node manage-images.js copy ../backup         # Sao chép sang thư mục backup");
        break;
}

export { cleanupOldImages, copyImagesTo, listImages, showImagesInfo };
