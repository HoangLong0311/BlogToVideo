import axios from 'axios';
import dotenv from 'dotenv';
// import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config dotenv với path đến file .env ở thư mục gốc
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const voices = {
    QuynhAnh: "hn-quynhanh",
    DiemMy: "hcm-diemmy",
    Maingoc: "hue-maingoc",
    ThanhTung: "hn-thanhtung",
    BaoQuoc: "hue-baoquoc",
    MinhQuan: "hcm-minhquan"
};

export async function callViettelTTS(text, filename) {
    try {
        const apiKey = process.env.VIETTEL_TTS_API_KEY;
        const url = 'https://viettelai.vn/tts/speech_synthesis';

        if (!apiKey) {
            throw new Error("API key for Viettel TTS is not set in environment variables.");
        }

        const response = await axios.post(url, {
            speed: 1.0,
            voice: voices.QuynhAnh,
            token: apiKey,
            tts_return_option: 3,
            without_filter: false,
            text: text
        }, {
            headers: {
                'Content-Type': 'application/json',
                'accept': '*/*',
            },
            responseType: 'arraybuffer' // Nhận binary data cho audio file
        });

        // Kiểm tra response có hợp lệ không
        if (response.headers['content-type'] !== 'audio/mpeg') {
            throw new Error(`Unexpected content type: ${response.headers['content-type']}`);
        }
        
        // Lưu audio buffer thành file MP3
        const audioBuffer = Buffer.from(response.data);
        fs.writeFileSync(filename, audioBuffer);
        const time = Math.ceil((response.data.length * 8) / (128 * 1024));
        // console.log(`✅ Đã lưu file âm thanh: ${filename} (${audioBuffer.length} bytes)`);
        return time;
    } catch (error) {
        console.error("❌ Lỗi khi gọi API Viettel TTS:", error);
        throw error;
    }
}

await callViettelTTS("Có thể nói, việc trao quyền chính là quá trình cho nhân viên thấy được ý nghĩa trong công việc của họ cũng như là quá trình giúp các doanh nghiệp tin tưởng hơn vào năng lực của nhân viên của mình. Đây cũng là một sự điều chỉnh mang tính cách mạng đồng thời giúp cho cả nhân viên và doanh nghiệp đều có được những lợi ích cần thiết của mình.Trên đây là những thông tin chi tiết về Empowerment. Mong rằng, qua bài viết này, các bạn đã hiểu được Empowerment.", "output.mp3");