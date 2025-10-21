import 'dotenv/config';
import fs from "fs";
import callGemini from './api/callGemini.js';
// import callGROQ from './api/callGROQ.js';
import returnVideo from "./findVideo.js";
import combineVideo from "./handleVideo.js";

// Đoạn văn bản ví dụ
const inputText = fs.readFileSync("./input.txt", "utf8"); // chứa bài blog dài ~7000 từ;
const command = fs.readFileSync("./command.txt", "utf8");

// Hàm gọi model để tóm tắt văn bản, phần mẫu đầu ra không tab vào trong, nếu tab -> lỗi file srt

async function exportVideo() {
    try {
        await summarizeText(inputText);
        await returnVideo();
        await combineVideo();
        console.log("🎉 Done!");
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    }
}

const res = await callGemini(command, inputText);
// const res1 = await callGROQ(command, inputText);
console.log("GROQ Response:", res);
// exportVideo();


