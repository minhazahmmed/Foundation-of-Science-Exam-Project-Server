import { Router } from 'express';
import { getPracticeResult, getProgress, startPractice, submitPractice } from '../controllers/practice.controller.js';
import { allowRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect, allowRoles('student'));

router.get('/start/:attemptId', startPractice);
router.post('/:attemptId/submit', submitPractice);
router.get('/result/:practiceId', getPracticeResult);
router.get('/progress/:attemptId', getProgress);

export default router;
