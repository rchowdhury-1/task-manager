const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const [workspaces, boards, cards, overdue] = await Promise.all([
      query(`SELECT COUNT(*) FROM workspace_members WHERE user_id=$1`, [userId]),
      query(`
        SELECT COUNT(*) FROM boards b
        JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
      `, [userId]),
      query(`
        SELECT COUNT(*) FROM cards c
        JOIN columns col ON col.id = c.column_id
        JOIN boards b ON b.id = col.board_id
        JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
        WHERE c.assigned_to = $1
      `, [userId]),
      query(`
        SELECT COUNT(*) FROM cards c
        JOIN columns col ON col.id = c.column_id
        JOIN boards b ON b.id = col.board_id
        JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
        WHERE c.assigned_to = $1 AND c.due_date < NOW()
      `, [userId]),
    ]);

    const recentBoards = await query(`
      SELECT b.*, w.name as workspace_name,
        (SELECT COUNT(*) FROM columns col WHERE col.board_id = b.id) as column_count,
        (SELECT COUNT(*) FROM cards c JOIN columns col ON col.id = c.column_id WHERE col.board_id = b.id) as card_count
      FROM boards b
      JOIN workspaces w ON w.id = b.workspace_id
      JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
      ORDER BY b.created_at DESC LIMIT 6
    `, [userId]);

    res.json({
      stats: {
        workspaces: parseInt(workspaces.rows[0].count),
        boards: parseInt(boards.rows[0].count),
        assignedCards: parseInt(cards.rows[0].count),
        overdueCards: parseInt(overdue.rows[0].count),
      },
      recentBoards: recentBoards.rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
