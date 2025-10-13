import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import fs from "fs";
import returnVideo from "./findVideo.js";

// Khởi tạo Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Ghi ra eng.txt để đưa qua pexel
async function writeFile(text) {
    try {
        await fs.writeFileSync('./eng.txt', text, 'utf8');
        console.log('Ghi file thành công');
    } catch (err) {
        console.error('Lỗi ghi file:', err);
    }
}

// Lấy text tiếng anh (chỉ lấy cái đầu tiên)
function getContentBetweenDollars(text) {
    const match = text.match(/\$(.*?)\$/);
    return match ? match[1] : null;
}

// Lấy tất cả nội dung giữa các dấu $ thành mảng
function getAllContentBetweenDollars(text) {
    const matches = text.match(/\$(.*?)\$/g);
    if (!matches) return [];
    
    // Loại bỏ dấu $ và trả về mảng nội dung
    return matches.map(match => match.slice(1, -1));
}

// Utility: Lọc nội dung theo từ khóa
function filterContentByKeyword(contentArray, keyword) {
    return contentArray.filter(content => 
        content.toLowerCase().includes(keyword.toLowerCase())
    );
}

// Utility: Lấy nội dung theo index
function getContentByIndex(contentArray, index) {
    return contentArray[index] || null;
}

// Utility: Đếm số lượng nội dung
function getContentCount(contentArray) {
    return contentArray.length;
}

// Hàm gọi model để tóm tắt văn bản
async function summarizeText(longText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Hãy tóm tắt đoạn văn bản sau thành nội dung ngắn gọn, rõ ràng, đủ để làm kịch bản video dài khoảng
    1 phút 45 giây, ngôn ngữ hấp dẫn, tự nhiên, không cần chú thích hay giới thiệu. Mỗi đoạn hãy mô tả 
    bẳng tiếng anh đủ để tìm 1 video background phù hợp và đặt chúng giữa 2 dấu $. Dòng đầu tiên hãy đưa ra
    các nội dung: Số đoạn sử dụng tiếng anh mô tả. Từ dòng thứ 2, các đoạn của bài tóm tắt có cấu trúc như sau: 
    đoạn mô tả tiếng anh ở dòng đầu, tiếp dưới là kịch bản subtitle theo định dạng srt, mỗi câu cách nhau bởi dấu xuống dòng.

    Nội dung gốc:
    ${longText}
    `;

    const result = await model.generateContent(prompt);
    const responseText = String(result.response.text());
    
    // Lấy tất cả nội dung giữa dấu $ thành mảng
    const allEngContent = getAllContentBetweenDollars(responseText);
    
    // Ghi mảng nội dung vào file (mỗi phần trên một dòng)
    const engText = allEngContent.join('\n');
    await writeFile(engText);
    
    // In ra console để debug
    console.log('🎯 Tìm thấy', allEngContent.length, 'đoạn mô tả tiếng Anh:');
    allEngContent.forEach((content, index) => {
      console.log(`${index + 1}. ${content}`);
    });
    
    // console.log(responseText);
    return String(responseText).charAt(0);

  } catch (error) {
    console.error("❌ Lỗi hàm:", error);
  }
}

// Đoạn văn bản ví dụ
const inputText = fs.readFileSync("./input.txt", "utf8"); // chứa bài blog dài ~7000 từ;
// Gọi hàm
async function exportVideo() {
    try {
        // const parts = await summarizeText(inputText);
        await summarizeText(inputText);
        await returnVideo();
        console.log("🎉 Done!");
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    }
}

exportVideo();

// Export các hàm để sử dụng từ file khác
export {
    filterContentByKeyword, getAllContentBetweenDollars, getContentByIndex,
    getContentCount
};

