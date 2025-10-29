import dotenv from 'dotenv';
import Groq from "groq-sdk";
import path from 'path';
import { fileURLToPath } from 'url';

// Lấy đường dẫn thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config dotenv với path đến file .env ở thư mục gốc
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('API Key loaded:', process.env.GROQ_API_KEY ? 'Yes ✓' : 'No ✗');
console.log('API Key value:', process.env.GROQ_API_KEY);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Danh sách model available
const MODELS = {
    // Llama 3.1 Series (Mới nhất)
    LLAMA_3_1_70B: 'llama-3.1-70b-versatile',
    LLAMA_3_1_8B: 'llama-3.1-8b-instant',// có sup
    
    // Llama 3 Series
    LLAMA_3_70B: 'llama3-70b-8192',
    LLAMA_3_8B: 'llama3-8b-8192',
    
    // Mixtral Series
    MIXTRAL_8X7B: 'mixtral-8x7b-32768',
    
    // Gemma Series (Google)
    GEMMA_7B: 'gemma-7b-it',
    GEMMA_2_9B: 'gemma2-9b-it',
    
    // Code Generation
    CODE_LLAMA_70B: 'codellama-70b-instruct'
};

async function callGROQ(command, input, model = MODELS.LLAMA_3_1_8B) {
    try {
        const prompt =  `${command} \n ${input}`;
        const response = await groq.chat.completions.create({
            model: model,
            messages: [
                { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error calling GROQ API:', error);
        throw error;
    }
}

// Test function
const result = await callGROQ("Hello, GROQ! Can you summarize the benefits of using GROQ SDK?");
console.log("GROQ Response:", result, typeof result);

export { callGROQ, MODELS };
export default callGROQ;