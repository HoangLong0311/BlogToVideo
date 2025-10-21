import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import fs from "fs";
import returnVideo from "./findVideo.js";
import combineVideo from "./handleVideo.js";

// Khởi tạo Gemini client
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function subtitleWrite(subtitleText) {
    try {
        await fs.writeFileSync('./videos/subtitle.srt', subtitleText, 'utf8');
        console.log('Ghi file subtitle thành công');
    } catch (err) {
        console.error('Lỗi ghi file subtitle:', err);
    }
}

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

function getAllContentBetweenDollarsExec(text) {
    const regex = /\$(.*?)\$/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1]); // match[1] là nội dung trong nhóm
    }
    
    return matches;
}

function getAllContentBetweenSharp(text) {
    const regex = /#([^#]*)#/gs;
    const matches = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        // Lấy toàn bộ nội dung bao gồm cả dấu xuống dòng, loại bỏ dấu # ở đầu và cuối
        const content = match[1];
        matches.push(content);
    }
    
    return matches;
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

let temp = "";
// Hàm gọi model để tóm tắt văn bản, phần mẫu đầu ra không tab vào trong, nếu tab -> lỗi file srt
async function summarizeText(longText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Bạn hãy xác định các nội dung chính và tóm tắt nội dung sau thành kịch bản phụ đề chuẩn SRT với các yêu cầu:
    1. **QUY TẮC NỘI DUNG:**
- Mỗi cue có nội dung bằng tiếng Việt được chia thành tối đa 2 dòng, Mỗi dòng tối thiểu 40 ký tự (tính cả khoảng trắng)
- Tốc độ đọc: 150-180 từ/phút
- Thời gian hiển thị mỗi cue: 3-7 giây tùy độ dài
- Thêm nội dung mô tả video background hợp lí cho các cue và phải bằng English, cần chi tiết và sát cue nhất cùng với đó là độ dài video bằng với thời gian chạy của các cue tương ứng với video đó
và ngăn cách với mô tả bởi .
- Các cue đặt giữa 2 dấu #, các nội dung tiếng anh và độ dài đặt giữa 2 dấu $
- 1 dòng mô tả tiếng anh có thể có thông số độ dài bằng nhiều hơn 1 đoạn subtitle, có nghĩa là đoạn tiếng anh đó đưa ra video background
cho nhiều hơn 2 đoạn subtitle bên dưới, các độ dài tương ứng với đoạn mô tả tiếng anh không được quá 15s.
- dòng mô tả tiếng anh chỉ được sử dụng dấu . để ngăn cách với độ dài, không sử dụng dấu chấm trong câu mô tả.
- Không cơ cấu theo kiểu mỗi cue là 1 video, ví dụ 10 cue thì 10 video là sai yêu cầu.

2. **QUY TẮC THỜI GIAN:**
- Bắt đầu từ 00:00:09,000
- Tính toán thời gian hợp lý cho tốc độ đọc
- Khoảng cách giữa các cue: 0.2-0.5 giây
- Format thời gian: HH:MM:SS,mmm.
- Toàn bộ thời gian không vượt quá 2 phút 30s, tối thiểu 1 phút 50s
- thời gian các video background tối thiểu 5s đến 13s.

3. **NGUYÊN TẮC TÓM TẮT:**
- Ngôn ngữ tự nhiên, dễ hiểu, hấp dẫn
- Tập trung vào ý chính, luận điểm quan trọng
- Giữ các số liệu, ví dụ quan trọng
- Loại bỏ dẫn dắt, lặp lại không cần thiết
- Đảm bảo mạch văn logic giữa các cue, mỗi cue liên kết tự nhiên và phải các câu trong cue phải là câu hoàn chỉnh.

4. **QUY TẮC TUYỆT ĐỐI TRÁNH:**
- KHÔNG để trong 1 cue có nhiều hơn 2 dòng
- KHÔNG được cho mỗi cue là 1 video, ví dụ 10 cue thì 10 video là sai yêu cầu.

**VÍ DỤ ĐẦU RA MẪU:**

$Nội dung bằng tiếng anh.5$
#1
00:00:09,000 --> 00:MM:SS,mmm.
Nội dung subtitle tiếng việt ở đây
Nội dung subtitle tiếng việt ở đây
#

$Nội dung bằng tiếng anh.13$
#2
00:MM:SS,mmm --> 00:MM:SS,mmm
Nội dung subtitle tiếng việt ở đây.
Nội dung subtitle tiếng việt ở đây
#

#3
00:MM:SS,mmm --> 00:MM:SS,mmm
Nội dung subtitle tiếng việt ở đây
#

$Nội dung bằng tiếng anh.13$
#4
00:MM:SS,mmm --> 00:MM:SS,mmm
Nội dung subtitle tiếng việt ở đây
#

#5
00:MM:SS,mmm --> 00:MM:SS,mmm
Nội dung subtitle tiếng việt ở đây
Nội dung subtitle tiếng việt ở đây
#

#6
00:MM:SS,mmm --> 00:MM:SS,mmm
Nội dung subtitle tiếng việt ở đây
Nội dung subtitle tiếng việt ở đây
#

    Nội dung gốc:
    ${longText}
    `;

    let result = await model.generateContent(prompt);
    // if (result == null || result.response == undefined) {
    //     result = await callGROQ(prompt);
    // }
    const responseText = String(result.response.text());
    
    // Lấy tất cả nội dung giữa dấu $ thành mảng
    const allEngContent = getAllContentBetweenDollarsExec(responseText);
    
    // Ghi mảng nội dung vào file (mỗi phần trên một dòng)
    const engText = allEngContent.join('\n');
    await writeFile(engText);
    
    // In ra console để debug
    console.log('🎯 Tìm thấy', allEngContent.length, 'đoạn mô tả tiếng Anh:');
    allEngContent.forEach((content, index) => {
      console.log(`${index + 1}. ${content}`);
    });

    // log nội dung
    const text = getAllContentBetweenSharp(responseText).join('\n');
    const resultText = result.response.text();
    subtitleWrite(text);
    console.log(text, resultText);
    temp = prompt;
    // console.log(responseText);
    return String(responseText.charAt(0));

  } catch (error) {
    console.error("❌ Lỗi hàm:", error);
  }
}

// Đoạn văn bản ví dụ
const inputText = fs.readFileSync("./input.txt", "utf8"); // chứa bài blog dài ~7000 từ;
// Gọi hàm

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

// summarizeText(inputText);
// const res = await callGROQ(temp);
// console.log("GROQ Response:", res);
exportVideo();

// Export các hàm để sử dụng từ file khác
export {
    filterContentByKeyword, getAllContentBetweenDollars, getContentByIndex,
    getContentCount
};

