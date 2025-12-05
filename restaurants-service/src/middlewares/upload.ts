import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Absolute path to the 'uploads' folder (safely resolves relative to root)
const uploadDir = path.join(__dirname, '../../uploads');

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('📂 Uploading to:', uploadDir);
        cb(null, uploadDir); // Set upload folder
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = uniqueSuffix + path.extname(file.originalname);
        console.log('📸 Filename:', fileName); 
        cb(null, fileName);
    },
});

export const upload = multer({ storage });
