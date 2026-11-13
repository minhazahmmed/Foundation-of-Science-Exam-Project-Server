import { Router } from 'express';
import { extractFromImages } from '../controllers/import.controller.js';
import { allowRoles, protect } from '../middleware/auth.js';
import { uploadImages } from '../middleware/upload.js';

const router = Router();

// লগইন আর টিচারের অনুমতি আগে দেখা হয়, তারপর ছবি নেওয়া হয়
router.post('/from-images', protect, allowRoles('teacher'), uploadImages, extractFromImages);

export default router;
