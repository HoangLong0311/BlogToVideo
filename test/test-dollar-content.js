import {
  filterContentByKeyword,
  getAllContentBetweenDollars,
  getContentByIndex,
  getContentCount
} from '../summarizeContent.js';

// Test hàm getAllContentBetweenDollars
const testText = `
Số đoạn: 3

$beautiful cityscape at night with lights$
Thành phố về đêm thật lung linh và huyền ảo.
Ánh đèn từ các tòa nhà cao tầng tạo nên một bức tranh sống động.

$people walking in busy street during day$
Cuộc sống hàng ngày của con người rất nhộn nhịp.
Mọi người đi lại tấp nập trên những con phố đông đúc.

$nature landscape with mountains and trees$
Thiên nhiên mang đến cho chúng ta những cảnh quan tuyệt đẹp.
Núi non và cây cối tạo nên một khung cảnh thơ mộng.
`;

console.log('🧪 Test hàm getAllContentBetweenDollars:');
console.log('📝 Text input:');
console.log(testText);
console.log('\n🎯 Kết quả:');

const result = getAllContentBetweenDollars(testText);
console.log('Số đoạn tìm thấy:', result.length);
console.log('Nội dung:');
result.forEach((content, index) => {
  console.log(`${index + 1}. ${content}`);
});

console.log('\n📄 Nội dung ghép thành string:');
console.log(result.join('\n'));

console.log('\n🔧 Test các utility functions:');

// Test getContentCount
console.log(`📊 Tổng số nội dung: ${getContentCount(result)}`);

// Test getContentByIndex
console.log(`🎯 Nội dung đầu tiên: ${getContentByIndex(result, 0)}`);
console.log(`🎯 Nội dung thứ 2: ${getContentByIndex(result, 1)}`);
console.log(`🎯 Nội dung không tồn tại (index 5): ${getContentByIndex(result, 5)}`);

// Test filterContentByKeyword
const cityContent = filterContentByKeyword(result, 'city');
console.log(`🏙️ Nội dung có từ "city": ${cityContent.length} đoạn`);
cityContent.forEach((content, index) => {
  console.log(`   ${index + 1}. ${content}`);
});

const natureContent = filterContentByKeyword(result, 'nature');
console.log(`🌿 Nội dung có từ "nature": ${natureContent.length} đoạn`);
natureContent.forEach((content, index) => {
  console.log(`   ${index + 1}. ${content}`);
});