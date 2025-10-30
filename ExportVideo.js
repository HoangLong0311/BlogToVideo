import 'dotenv/config';
import fs from "fs";
import callGemini from './api/callGemini.js';
import returnVideo from "./findVideo.js";
import combineVideo from "./handleVideo.js";
// import cleanupFileContents from './utils/fileUtils.js';

// Đoạn văn bản ví dụ
const inputText = fs.readFileSync("./input.txt", "utf8"); // Nội dung blog;
const command = fs.readFileSync("./command.txt", "utf8"); // Lệnh sinh subtitle;

// danh sách file được dọn sau khi xuất video
const filesToCleanup = [
  './reading.txt',
  './eng.txt',
  './videos/subtitles.srt',
];

// Hàm gọi model để tóm tắt văn bản.
async function exportVideo() {
    try {
        await callGemini(command, inputText);
        // await summarizeText(inputText);
        await returnVideo();
        await combineVideo();
        // await cleanupFileContents(filesToCleanup);
        console.log("🎉 Done!");
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    }
}

// const res = await callGemini(command, inputText);
// const res1 = await callGROQ(command, inputText);
// console.log("GROQ Response:", res);
exportVideo();


