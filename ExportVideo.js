import 'dotenv/config';
import fs from "fs";
import callGemini from './api/callGemini.js';
import returnVideo from "./findVideo.js";
import combineVideo from "./handleVideo.js";
import audioBinder from './modules/bindAudio.js';
import cleanupFileContents from './utils/fileUtils.js';

// Đoạn văn bản ví dụ
const inputText = fs.readFileSync("./input.txt", "utf8");
const command = fs.readFileSync("./command.txt", "utf8"); // Lệnh sinh subtitle;

// danh sách file được dọn sau khi xuất video
const filesToCleanup = [
  './reading.txt',
  './eng.txt',
  './videos/subtitle.srt',
];

// Hàm gọi model để tóm tắt văn bản.
export async function exportVideo() {
    try {
        // const inputText = fs.writeFileSync("./input.txt", input, "utf8"); // Nội dung blog;
        await callGemini(command, inputText);
        await returnVideo();
        await combineVideo();
        // Ghép audio với yêu cầu mặc định: độ dài video final = video gốc
        await audioBinder.bindAudioToVideo('./videos/final_video_with_subtitle.mp4', {
            outputPath: './videos/final_video_with_audio.mp4',
            audioDelay: 9  // Audio bắt đầu từ giây thứ 9
        });
        await cleanupFileContents(filesToCleanup);
        console.log("🎉 Done!");
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    }
}

// const res = await callGemini(command, inputText);
// const res1 = await callGROQ(command, inputText);
// console.log("GROQ Response:", res);
// exportVideo();


