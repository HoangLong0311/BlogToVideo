import express from 'express';
import { exportVideo } from './ExportVideo.js';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
// app.use(cors({
//     origin: [
//         'http://localhost:3000',        // Development
//         'http://127.0.0.1:3000',        // Alternative localhost
//         'https://yourdomain.com',       // Production domain
//         'https://www.yourdomain.com'    // WWW production domain
//     ],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//     credentials: true,
//     optionsSuccessStatus: 200
// }));

app.use(express.json());

// Routes
app.get('/api/posts', (req, res) => {
    try {
        res.json({
            success: true,
            data: posts,
            message: "Lấy danh sách bài đăng thành công"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách bài đăng"
        });
    }
});

app.post('/api/generateVideo', async (req, res) => {
    try {
        // const newPost = req.body;
        const vid = await exportVideo();

        res.status(201).json({
            success: true,
            data: "urlVideo",
            message: "Tạo bài đăng thành công"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi server khi tạo bài đăng"
        });
    }
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});