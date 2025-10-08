import fs from "fs";
import path from "path";
import { mergeVideos } from "./videoMerger.js";

// Hàm ghép video theo batch nếu có quá nhiều video
export async function mergeVideosInBatches(videoPaths, outputPath, batchSize = 5) {
  if (videoPaths.length <= batchSize) {
    // Nếu không quá nhiều video, ghép trực tiếp
    return await mergeVideos(videoPaths, outputPath);
  }
  
  console.log(`📦 Ghép theo batch: ${videoPaths.length} video, ${batchSize} video/batch`);
  
  const tempFolder = path.join(path.dirname(outputPath), 'temp_merge');
  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }
  
  const batchPaths = [];
  
  try {
    // Chia video thành các batch và ghép từng batch
    for (let i = 0; i < videoPaths.length; i += batchSize) {
      const batch = videoPaths.slice(i, i + batchSize);
      const batchOutputPath = path.join(tempFolder, `batch_${Math.floor(i/batchSize) + 1}.mp4`);
      
      console.log(`📦 Xử lý batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(videoPaths.length/batchSize)}: ${batch.length} video`);
      
      if (batch.length === 1) {
        // Nếu chỉ có 1 video trong batch, copy trực tiếp
        fs.copyFileSync(batch[0], batchOutputPath);
      } else {
        await mergeVideos(batch, batchOutputPath);
      }
      
      batchPaths.push(batchOutputPath);
    }
    
    // Ghép tất cả các batch lại với nhau
    console.log(`🔗 Ghép ${batchPaths.length} batch thành file cuối cùng...`);
    await mergeVideos(batchPaths, outputPath);
    
    // Cleanup temp files
    console.log("🗑️ Dọn dẹp file tạm...");
    for (const batchPath of batchPaths) {
      if (fs.existsSync(batchPath)) {
        fs.unlinkSync(batchPath);
      }
    }
    if (fs.existsSync(tempFolder)) {
      fs.rmdirSync(tempFolder);
    }
    
    return outputPath;
    
  } catch (error) {
    // Cleanup nếu có lỗi
    console.log("🗑️ Dọn dẹp file tạm do lỗi...");
    for (const batchPath of batchPaths) {
      if (fs.existsSync(batchPath)) {
        try { fs.unlinkSync(batchPath); } catch {}
      }
    }
    if (fs.existsSync(tempFolder)) {
      try { fs.rmdirSync(tempFolder); } catch {}
    }
    throw error;
  }
}