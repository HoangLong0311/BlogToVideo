import textToSpeech from "@google-cloud/text-to-speech";
import dotenv from 'dotenv';
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
import util from "util";

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config dotenv với path đến file .env ở thư mục gốc
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const client = new textToSpeech.TextToSpeechClient();

async function synthesizeText() {
  const text = `
    Xin chào, đây là ví dụ minh họa cho khả năng chuyển văn bản tiếng Việt thành giọng nói tự nhiên
    bằng công nghệ Text-to-Speech của Google.
  `;

  const request = {
    input: { text },
    voice: { languageCode: "vi-VN", name: "vi-VN-Wavenet-A" },
    audioConfig: { audioEncoding: "mp3" },
  };

  const [response] = await client.synthesizeSpeech(request);
  const writeFile = util.promisify(fs.writeFile);
  await writeFile("output.mp3", response.audioContent, "binary");
  console.log("✅ File audio đã lưu: output.mp3");
}

synthesizeText();
