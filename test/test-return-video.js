import returnVideo from '../findVideo.js';

console.log('🧪 Test hàm returnVideo mới');
console.log('==============================');

// Test với 4 parts (sẽ tải 4 video tương ứng với 4 dòng trong eng.txt)
try {
    await returnVideo(4);
    console.log('\n✅ Test hoàn thành!');
} catch (error) {
    console.error('\n❌ Lỗi trong test:', error.message);
}