import { Router } from 'express';
import { listDemos, startDemo, submitDemo } from '../controllers/demo.controller.js';
import { allowRoles, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect, allowRoles('student'));

router.get('/', listDemos);
router.get('/:id/start', startDemo);
router.post('/:id/submit', submitDemo);

export default router;
