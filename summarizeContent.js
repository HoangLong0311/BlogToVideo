import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
// import returnVideo from "./findVideo.js";

// Khởi tạo Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Hàm gọi model để tóm tắt văn bản
async function summarizeText(longText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    Hãy tóm tắt đoạn văn bản sau thành nội dung ngắn gọn, rõ ràng, đủ để làm kịch bản video dài khoảng
    1 phút 20 giây (tương đương khoảng 180-200 từ),
    ngôn ngữ hấp dẫn, tự nhiên, không cần chú thích hay giới thiệu. Mỗi đoạn hãy mô tả 
    bẳng tiếng anh đủ để tìm 1 video background phù hợp. các phần có dấu hiệu của việc nêu định nghĩa thì thêm
    mark đánh dấu bằng $định nghĩa$

    Nội dung gốc:
    ${longText}
    `;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    console.log(summary);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

// Đoạn văn bản ví dụ
const fs = await import("fs");
const inputText = fs.readFileSync("./input.txt", "utf8"); // chứa bài blog dài ~7000 từ;

// Gọi hàm
summarizeText(inputText);
// returnVideo();

