import { Router } from 'express';
import { updateColumn, deleteColumn } from '../controllers/taskController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.patch('/:id', updateColumn);
router.delete('/:id', deleteColumn);

export default router;
