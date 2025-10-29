import fs from 'fs';

async function subtitleWrite(subtitleText) {
    try {
        await fs.writeFileSync('./videos/subtitle.srt', subtitleText, 'utf8');
        console.log('Ghi file subtitle thành công');
    } catch (err) {
        console.error('Lỗi ghi file subtitle:', err);
    }
}

// Ghi ra eng.txt để đưa qua pexel
async function writeFile(text, filepath) {
    try {
        await fs.writeFileSync(filepath, text, 'utf8');
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

function getAllContentBetweenWarning(text) {
    const regex = /!!([^!!]*)!!/gs;
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

export {
    filterContentByKeyword, getAllContentBetweenDollars,
    getAllContentBetweenDollarsExec,
    getAllContentBetweenSharp, getAllContentBetweenWarning, getContentBetweenDollars, getContentByIndex,
    getContentCount, subtitleWrite, writeFile
};

