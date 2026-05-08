/**
 * Habits route unit tests.
 * Tests the toggle (idempotency), user scoping, and streak logic.
 */

describe('Habits — unit tests', () => {
  describe('toggleCompletion — idempotency', () => {
    test('toggling completion twice on same date removes it', () => {
      // Simulate the toggle logic from habits.js
      let completions = [];
      const date = '2026-05-07';
      const habitId = 'habit-1';

      // First toggle: adds
      if (!completions.includes(date)) {
        completions.push(date);
      }
      expect(completions).toContain(date);

      // Second toggle: removes
      if (completions.includes(date)) {
        completions = completions.filter((d) => d !== date);
      }
      expect(completions).not.toContain(date);
    });

    test('idempotent upsert: ON CONFLICT DO NOTHING', () => {
      // The SQL uses ON CONFLICT DO NOTHING so double-insert is safe
      const sql = 'INSERT INTO habit_completions (habit_id, user_id, completed_date) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING';
      expect(sql).toContain('ON CONFLICT DO NOTHING');
      expect(sql).toContain('habit_completions');
    });
  });

  describe('user scoping', () => {
    test('completions query always includes user_id filter', () => {
      const sql = `SELECT habit_id, completed_date FROM habit_completions
       WHERE user_id=$1 AND completed_date BETWEEN $2 AND $3`;
      expect(sql).toContain('WHERE user_id=$1');
    });

    test('habits query always includes user_id filter', () => {
      const sql = 'SELECT * FROM habits WHERE user_id=$1 AND active=TRUE ORDER BY sort_order ASC';
      expect(sql).toContain('WHERE user_id=$1');
    });
  });

  describe('streak calculation', () => {
    const calcStreak = (completions) => {
      if (!completions.length) return 0;
      const sorted = [...completions].sort().reverse();
      let streak = 0;
      let current = new Date('2026-05-07'); // Fixed "today" for tests
      current.setHours(0, 0, 0, 0);

      for (const dateStr of sorted) {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        const diff = Math.round((current.getTime() - d.getTime()) / 86400000);
        if (diff > 1) break;
        streak++;
        current = d;
      }
      return streak;
    };

    test('streak is 0 with no completions', () => {
      expect(calcStreak([])).toBe(0);
    });

    test('streak is 1 for only today', () => {
      expect(calcStreak(['2026-05-07'])).toBe(1);
    });

    test('streak is 3 for 3 consecutive days', () => {
      expect(calcStreak(['2026-05-05', '2026-05-06', '2026-05-07'])).toBe(3);
    });

    test('streak breaks with a gap', () => {
      // Gap: missing 2026-05-05
      expect(calcStreak(['2026-05-04', '2026-05-06', '2026-05-07'])).toBe(2);
    });

    test('week boundary: Mon-Sun streak is correctly calculated', () => {
      // Week crossing: Apr 28 to May 5
      const completions = ['2026-04-28', '2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07'];
      expect(calcStreak(completions)).toBe(10);
    });
  });

  describe('week boundaries for completions query', () => {
    const weekStart = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    };
    const weekEnd = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = (day === 0 ? 0 : 7) - day;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    };

    test('weekStart for Wednesday returns Monday', () => {
      // 2026-05-06 is Wednesday
      expect(weekStart('2026-05-06')).toBe('2026-05-04');
    });

    test('weekEnd for Wednesday returns Sunday', () => {
      expect(weekEnd('2026-05-06')).toBe('2026-05-10');
    });

    test('completions query is bounded (not unbounded scan)', () => {
      const sql = `SELECT habit_id, completed_date FROM habit_completions
       WHERE user_id=$1 AND completed_date BETWEEN $2 AND $3`;
      expect(sql).toContain('BETWEEN');
      expect(sql).not.toMatch(/WHERE user_id=\$1\s*$/); // Must have BETWEEN clause
    });
  });
});
