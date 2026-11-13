import { Router } from 'express';
import {
  createManyQuestions,
  createQuestion,
  deleteQuestion,
  getQuestion,
  listChapters,
  listQuestions,
  updateQuestion,
} from '../controllers/question.controller.js';
import { allowRoles, protect } from '../middleware/auth.js';

const router = Router();

// প্রশ্ন ব্যাংক শুধু টিচারের
router.use(protect, allowRoles('teacher'));

router.get('/', listQuestions);
router.post('/', createQuestion);
router.post('/bulk', createManyQuestions);
router.get('/chapters', listChapters); // /:id এর আগে রাখতে হবে
router.get('/:id', getQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

export default router;
