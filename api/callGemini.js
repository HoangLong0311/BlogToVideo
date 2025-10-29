import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllContentBetweenDollarsExec, getAllContentBetweenSharp, subtitleWrite, writeFile } from "../utils/inputPreprocessor.js";

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config dotenv với path đến file .env ở thư mục gốc
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODELS = {
    GEMINI_2_0_FLASH: 'gemini-2.0-flash',
    GEMINI_1_5: 'gemini-1.5',
    GEMINI_2_5_FLASH: 'gemini-2.5-flash'
};

async function callGemini(command, inputText) {
    try {
        const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_2_0_FLASH });
        const prompt =  `${command} \n ${inputText}`;

        let result = await model.generateContent(prompt);
        const responseText = String(result.response.text());
        
        // Lấy tất cả nội dung giữa dấu $ thành mảng
        const allEngContent = getAllContentBetweenDollarsExec(responseText);
        
        // Ghi mảng nội dung vào file (mỗi phần trên một dòng)
        const engText = allEngContent.join('\n');
        await writeFile(engText);

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

const a = await callGemini("Write a detailed summary of the following text:", "This is a sample text to be summarized.");

export default callGemini;