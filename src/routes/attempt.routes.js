import { Router } from 'express';
import {
  answerQuestion,
  getResult,
  myAttempts,
  startAttempt,
  submitExam,
} from '../controllers/attempt.controller.js';
import { allowRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

// স্টুডেন্টের কাজ
router.post('/start/:code', allowRoles('student'), startAttempt);
router.get('/mine', allowRoles('student'), myAttempts);
router.patch('/:id/answer', allowRoles('student'), answerQuestion);
router.post('/:id/submit', allowRoles('student'), submitExam);

// ফলাফল: স্টুডেন্ট (নিজেরটা) ও টিচার (নিজের পরীক্ষার), দুজনেই। অনুমতি কন্ট্রোলারে দেখা হয়।
router.get('/:id/result', getResult);

export default router;
