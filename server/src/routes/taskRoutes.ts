import { Router } from 'express';
import { createTask, updateTask, moveTask, deleteTask } from '../controllers/taskController';
import { updateColumn, deleteColumn } from '../controllers/taskController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', createTask);
router.patch('/:id', updateTask);
router.patch('/:id/move', moveTask);
router.delete('/:id', deleteTask);

export default router;
