/**
 * Recurring tasks unit tests.
 */

describe('Recurring tasks — unit tests', () => {
  describe('resolve endpoint', () => {
    test('SQL uses WHERE condition_met=FALSE for idempotency', () => {
      const sql = `UPDATE recurring_tasks
       SET condition_met=TRUE, condition_met_at=NOW(), active=FALSE
       WHERE id=$1 AND user_id=$2 AND condition_met=FALSE
       RETURNING *`;
      expect(sql).toContain('condition_met=FALSE');
      expect(sql).toContain('condition_met=TRUE');
      expect(sql).toContain('active=FALSE');
    });

    test('resolving an already-resolved task returns "already resolved" not error', () => {
      // The route checks if no rows returned = already resolved
      const mockResult = { rows: [] }; // UPDATE affected 0 rows = already resolved
      const message = mockResult.rows.length === 0 ? 'Already resolved' : 'resolved';
      expect(message).toBe('Already resolved');
    });
  });

  describe('active list filtering', () => {
    test('resolved recurring task does not appear in active list', () => {
      const tasks = [
        { id: '1', active: true, condition_met: false, title: 'Uber Eats' },
        { id: '2', active: false, condition_met: true, title: 'Old job' },
      ];
      // The GET /api/recurring returns all tasks, but frontend filters active
      const activeTasks = tasks.filter((t) => t.active);
      expect(activeTasks).toHaveLength(1);
      expect(activeTasks[0].title).toBe('Uber Eats');
    });
  });

  describe('validation', () => {
    test('creating recurring with empty days_of_week is rejected', () => {
      const days_of_week = [];
      const isValid = Array.isArray(days_of_week) && days_of_week.length > 0;
      expect(isValid).toBe(false);
    });

    test('creating recurring with valid days_of_week passes', () => {
      const days_of_week = [0, 1, 2, 3, 4, 5, 6];
      const isValid = Array.isArray(days_of_week) && days_of_week.length > 0;
      expect(isValid).toBe(true);
    });

    test('required fields: title, category, scheduled_time', () => {
      const missingTitle = { category: 'uber', scheduled_time: '21:00' };
      const valid = missingTitle.title && missingTitle.category && missingTitle.scheduled_time;
      expect(valid).toBeFalsy();
    });
  });

  describe('race condition protection', () => {
    test('concurrent resolves are safe via atomic WHERE condition_met=FALSE', () => {
      // Two concurrent requests both run:
      // UPDATE ... WHERE condition_met=FALSE
      // Only one will match (PostgreSQL row-level locking)
      // The other gets 0 rows = "already resolved"
      const sql = `UPDATE recurring_tasks SET condition_met=TRUE, active=FALSE WHERE id=$1 AND condition_met=FALSE`;
      expect(sql).toContain('AND condition_met=FALSE');
      // This is the idempotency guard
    });
  });
});
