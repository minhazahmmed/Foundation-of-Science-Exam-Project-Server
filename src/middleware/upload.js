import multer from 'multer';
import ApiError from '../utils/ApiError.js';

// ছবি ডিস্কে সেভ হয় না, মেমরিতে থেকে সরাসরি Gemini-কে যায়
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
    cb(ok ? null : new ApiError(400, 'শুধু JPG, PNG বা WEBP ছবি দেওয়া যাবে'), ok);
  },
});

export const uploadImages = upload.array('images', 5);
