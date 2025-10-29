import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllContentBetweenDollarsExec, getAllContentBetweenSharp, subtitleWrite, writeFile } from "../utils/inputPreprocessor.js";
import { callViettelTTS } from "./callViettelTTS.js";

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config dotenv với path đến file .env ở thư mục gốc
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const genAI = new GoogleGenerativeAI("AIzaSyAVHAzjUYgA5IhhRK97oUxQo1Qrbz9H6Kk");

const MODELS = {
    GEMINI_2_0_FLASH: 'gemini-2.0-flash',
    GEMINI_1_5: 'gemini-1.5',
    GEMINI_2_5_FLASH: 'gemini-2.5-flash',
    GEMINI_2_5_PRO: 'gemini-2.5-pro'
};

async function exportReadingText(time, inputText) {
    try {
        const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_2_5_FLASH });
        // const prompt = `Hãy tóm tắt đoạn văn bản chuyển thành kịch bản đọc với tốc độ trung bình khoảng 120-140 từ / phút, và có thời lượng tương ứng với thời gian ${time} giây, chỉ cần đưa nội dung đã xử lí xong
        // không cần giải thích, nội dung: ${inputText}`;

        const prompt = `BẠN HÃY ĐÓNG VAI MỘT CHUYÊN GIA BIÊN TẬP KỊCH BẢN THUYẾT MINH CHUYÊN NGHIỆP.

        **YÊU CẦU:**
        - Tôi sẽ cung cấp một đoạn văn bản dài
        - Bạn hãy biến nó thành một kịch bản thuyết minh hoàn chỉnh
        - Thời lượng: ${time} giây (tốc độ đọc 140 từ/phút)
        - Giọng văn: (trang trọng, thân thiện, truyền cảm, etc.)
        - Đối tượng: người xem video

        **NỘI DUNG GỐC:**
        ${inputText}

        CHỈ CẦN TRẢ VỀ NỘI DUNG ĐÃ XỬ LÍ NGHĨA LÀ NHỮNG GÌ CẦN ĐỌC LÊN THÀNH TIẾNG KHÔNG CẦN CHÚ THÍCH HOẶC THÊM GÌ.
        `

        let result = await model.generateContent(prompt);
        await writeFile(String(result.response.text()), './reading.txt');

        return String(result.response.text());
    } catch(error) {
        console.error('Lỗi ghi file:', error);
    }
}

async function callGemini(command, inputText) {
    try {
        // Lấy Kịch bản đọc
        const textToRead = await exportReadingText("150", inputText);
        await callViettelTTS(textToRead, './output.mp3');

        // Tạo subtitle
        const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_2_0_FLASH });
        const prompt =  `${command} \n ${textToRead}`;

        let result = await model.generateContent(prompt);
        const responseText = String(result.response.text());

        // Lấy tất cả nội dung giữa dấu $ thành mảng
        const allEngContent = getAllContentBetweenDollarsExec(responseText);
        
        // Ghi mảng nội dung vào file (mỗi phần trên một dòng)
        const engText = allEngContent.join('\n');
        await writeFile(engText, './eng.txt');

        // Ghi subtitle
        const text = getAllContentBetweenSharp(responseText).join('\n');
        const resultText = result.response.text();
        subtitleWrite(text);

        // In ra console để debug
        console.log('🎯 Tìm thấy', allEngContent.length, 'đoạn mô tả tiếng Anh:');
        allEngContent.forEach((content, index) => {
            console.log(`${index + 1}. ${content}`);
        });
        console.log(text, resultText);
        // console.log(responseText);
        return true;

    } catch (error) {
        console.error("❌ Lỗi hàm:", error);
        return false;
    }
}

// const a = await callGemini("Write a detailed summary of the following text:", "This is a sample text to be summarized.");
// const inputText = fs.readFileSync("../input.txt", "utf8"); // chứa bài blog dài ~7000 từ;
// exportReadingText("150", inputText);

export default callGemini;