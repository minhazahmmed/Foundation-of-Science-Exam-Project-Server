import { Router } from 'express';
import { approveTeacher, listTeachers, rejectTeacher, removeTeacher } from '../controllers/teacher.controller.js';
import { protect, requireOwner } from '../middleware/auth.js';

const router = Router();

// এখানকার সব কাজ শুধু মূল শিক্ষকের
router.use(protect, requireOwner);

router.get('/', listTeachers);
router.post('/:id/approve', approveTeacher);
router.post('/:id/reject', rejectTeacher);
router.post('/:id/remove', removeTeacher);

export default router;
