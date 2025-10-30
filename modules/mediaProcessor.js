const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
    
ffmpeg.setFfmpegPath(ffmpegStatic);
const videoInput = 'input_video.mp4';
const audioInput = 'input_audio.mp3';
const outputFileName = 'output_video_with_audio.mp4';

ffmpeg()
    .input(videoInput) // Specify the input video file
    .input(audioInput) // Specify the input audio file
    .outputOptions([
    '-c:v copy', // Copy the video stream without re-encoding
    '-c:a aac', // Encode the audio to AAC format
    '-map 0:v:0', // Map the first video stream from the first input (videoInput)
    '-map 1:a:0'  // Map the first audio stream from the second input (audioInput)
    ])
    .saveToFile(outputFileName) // Save the output to a new file
    .on('progress', (progress) => {
    if (progress.percent) {
        console.log(`Processing: ${Math.floor(progress.percent)}% done`);
    }
    })
    .on('end', () => {
    console.log('FFmpeg has finished binding audio to video.');
    })
    .on('error', (error) => {
    console.error('Error during FFmpeg process:', error);
    });