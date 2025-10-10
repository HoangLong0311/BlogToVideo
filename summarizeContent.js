import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import fs from "fs";
// import returnVideo from "./findVideo.js";

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

// Lấy text tiếng anh
function getContentBetweenDollars(text) {
    const match = text.match(/\$(.*?)\$/);
    return match ? match[1] : null;
}


// Hãy tóm tắt đoạn văn bản sau thành nội dung ngắn gọn, rõ ràng, đủ để làm kịch bản video dài khoảng
// 1 phút 20 giây (tương đương khoảng 180-200 từ),
// ngôn ngữ hấp dẫn, tự nhiên, không cần chú thích hay giới thiệu. Mỗi đoạn hãy mô tả 
// bẳng tiếng anh đủ để tìm 1 video background phù hợp. các phần có dấu hiệu của việc nêu định nghĩa thì thêm
// mark đánh dấu bằng $định nghĩa$

// Hàm gọi model để tóm tắt văn bản
async function summarizeText(longText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Tóm tắt nhanh nội dung sau thành khoảng 30 từ, dịch tiếng anh mô tả hình ảnh hoặc video background hợp để
    làm video, đặt chúng giữa 2 dấu $

    Nội dung gốc:
    ${longText}
    `;

    const result = await model.generateContent(prompt);
    const eng = getContentBetweenDollars(String(result.response.text()));
    writeFile(eng);

    console.log(eng);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

// Đoạn văn bản ví dụ
const inputText = fs.readFileSync("./input.txt", "utf8"); // chứa bài blog dài ~7000 từ;
// Gọi hàm
summarizeText(inputText);
// returnVideo();

