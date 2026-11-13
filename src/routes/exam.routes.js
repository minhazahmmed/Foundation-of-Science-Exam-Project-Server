import { Router } from 'express';
import {
  createExam,
  deleteExam,
  getExam,
  getExamAnalysis,
  getExamAttempts,
  getPublicInfo,
  listExams,
  regradeExam,
  updateExam,
} from '../controllers/exam.controller.js';
import { allowRoles, protect } from '../middleware/auth.js';

const router = Router();

// লগইন ছাড়া: লিংক খুললে পরীক্ষার নাম, সময় ইত্যাদি দেখাবে
router.get('/public/:code', getPublicInfo);

// নিচের সবকিছু শুধু টিচারের
router.use(protect, allowRoles('teacher'));

router.get('/', listExams);
router.post('/', createExam);
router.get('/:id', getExam);
router.patch('/:id', updateExam);
router.delete('/:id', deleteExam);
router.get('/:id/attempts', getExamAttempts);
router.get('/:id/analysis', getExamAnalysis);
router.post('/:id/regrade', regradeExam);

export default router;
