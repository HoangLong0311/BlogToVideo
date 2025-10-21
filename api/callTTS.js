import textToSpeech from "@google-cloud/text-to-speech";
import "dotenv/config";
import fs from "fs";
import util from "util";

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
