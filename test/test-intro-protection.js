import combineVideo from '../handleVideo.js';

console.log('🧪 Demo bảo vệ intro.mp4 khi cleanup...');
console.log('==========================================');

try {
    await combineVideo(null, 'hardburn', false);
    console.log('\n✅ Test hoàn thành!');
    
    // Kiểm tra file còn lại
    console.log('\n📋 Kiểm tra file còn lại sau cleanup:');
    const fs = await import('fs');
    const path = await import('path');
    
    const videosDir = path.join(process.cwd(), 'videos');
    const remainingFiles = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));
    
    remainingFiles.forEach((file, index) => {
        const filePath = path.join(videosDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        const isIntro = file.toLowerCase() === 'intro.mp4' ? '🔒 (Được bảo vệ)' : '';
        console.log(`   ${index + 1}. ${file} (${sizeMB}MB) ${isIntro}`);
    });
    
} catch (error) {
    console.error('\n❌ Lỗi trong test:', error.message);
}