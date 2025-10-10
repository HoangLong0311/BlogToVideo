import fs from 'fs';
import {
  filterContentByKeyword,
  getAllContentBetweenDollars,
  getContentByIndex,
  getContentCount
} from '../summarizeContent.js';

/**
 * Demo: Xử lý nội dung từ file Gemini response
 */

// Giải lập response từ Gemini (có thể từ file hoặc API)
const geminiResponse = `
Số đoạn: 5

$modern office building with glass windows$
Tòa nhà văn phòng hiện đại với những cửa sổ kính lớn.
Ánh sáng tự nhiên chiếu vào tạo không gian làm việc thoáng đãng.

$people working on computers in office$
Nhân viên đang làm việc chăm chỉ tại văn phòng.
Màn hình máy tính phát sáng trong không gian hiện đại.

$city traffic and busy streets$
Giao thông thành phố nhộn nhịp vào giờ cao điểm.
Xe cộ di chuyển liên tục trên những con đường rộng.

$natural forest with tall trees$
Khu rừng tự nhiên với những cây cao vút lên trời.
Ánh sáng xuyên qua tán lá tạo hiệu ứng ánh sáng đẹp.

$sunset over ocean waves$
Hoàng hôn tuyệt đẹp trên mặt biển bao la.
Sóng biển nhẹ nhàng vỗ về bờ cát trắng.
`;

console.log('🎬 === DEMO: XỬ LÝ CONTENT TỪ GEMINI ===\n');

// Lấy tất cả nội dung tiếng Anh
const allContents = getAllContentBetweenDollars(geminiResponse);

console.log('📊 THỐNG KÊ:');
console.log(`   Tổng số đoạn: ${getContentCount(allContents)}`);
console.log(`   Nội dung đầu tiên: "${getContentByIndex(allContents, 0)}"`);
console.log(`   Nội dung cuối cùng: "${getContentByIndex(allContents, allContents.length - 1)}"`);

console.log('\n🎯 TẤT CẢ NỘI DUNG:');
allContents.forEach((content, index) => {
  console.log(`   ${index + 1}. ${content}`);
});

console.log('\n🔍 LỌC NỘI DUNG THEO CHỦ ĐỀ:');

// Lọc nội dung về office/work
const officeContents = filterContentByKeyword(allContents, 'office');
console.log(`🏢 Nội dung về office (${officeContents.length} đoạn):`);
officeContents.forEach((content, index) => {
  console.log(`   ${index + 1}. ${content}`);
});

// Lọc nội dung về nature
const natureContents = filterContentByKeyword(allContents, 'forest');
console.log(`🌲 Nội dung về forest (${natureContents.length} đoạn):`);
natureContents.forEach((content, index) => {
  console.log(`   ${index + 1}. ${content}`);
});

// Lọc nội dung về city
const cityContents = filterContentByKeyword(allContents, 'city');
console.log(`🏙️ Nội dung về city (${cityContents.length} đoạn):`);
cityContents.forEach((content, index) => {
  console.log(`   ${index + 1}. ${content}`);
});

console.log('\n💾 LUU TRỮ:');

// Lưu tất cả nội dung vào file
const outputFile = './extracted_contents.txt';
fs.writeFileSync(outputFile, allContents.join('\n'), 'utf8');
console.log(`✅ Đã lưu ${allContents.length} đoạn nội dung vào: ${outputFile}`);

// Lưu nội dung theo category
const categorized = {
  office: officeContents,
  nature: natureContents,
  city: cityContents,
  other: allContents.filter(content => 
    !officeContents.includes(content) && 
    !natureContents.includes(content) && 
    !cityContents.includes(content)
  )
};

console.log('📋 PHÂN LOẠI:');
Object.entries(categorized).forEach(([category, contents]) => {
  if (contents.length > 0) {
    console.log(`   ${category}: ${contents.length} đoạn`);
    const categoryFile = `./contents_${category}.txt`;
    fs.writeFileSync(categoryFile, contents.join('\n'), 'utf8');
    console.log(`   ✅ Đã lưu vào: ${categoryFile}`);
  }
});

console.log('\n🎉 HOÀN THÀNH!');