import { Router } from 'express';
import {
  createBoard, getBoards, getBoard, joinBoard, joinBoardByCode,
  deleteBoard, getActivities,
} from '../controllers/boardController';
import { addColumn, updateColumn, deleteColumn } from '../controllers/taskController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', createBoard);
router.get('/', getBoards);
router.get('/:id', getBoard);
router.post('/:id/join', joinBoard);
router.post('/join', joinBoardByCode);
router.delete('/:id', deleteBoard);
router.get('/:id/activities', getActivities);

// Columns
router.post('/:id/columns', addColumn);

export default router;
