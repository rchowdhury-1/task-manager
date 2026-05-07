const { query } = require('../config/db');

const DEFAULT_DAY_RULES = [
  { day_of_week: 0, focus_area: 'rest',      max_focus_hours: 4,  cal_color: 'purple' },
  { day_of_week: 1, focus_area: 'job_hunt',  max_focus_hours: 8,  cal_color: 'blue'   },
  { day_of_week: 2, focus_area: 'lms',       max_focus_hours: 8,  cal_color: 'green'  },
  { day_of_week: 3, focus_area: 'freelance', max_focus_hours: 6,  cal_color: 'orange' },
  { day_of_week: 4, focus_area: 'lms',       max_focus_hours: 8,  cal_color: 'green'  },
  { day_of_week: 5, focus_area: 'learning',  max_focus_hours: 8,  cal_color: 'indigo' },
  { day_of_week: 6, focus_area: 'flex',      max_focus_hours: 6,  cal_color: 'teal'   },
];

const DEFAULT_HABITS = [
  // Faith
  { name: 'Fajr',                 category: 'faith',  time_of_day: 'morning',  duration_minutes: 15, sort_order: 0 },
  { name: '5 Daily Prayers',      category: 'faith',  time_of_day: 'anytime',  duration_minutes: 30, sort_order: 1 },
  { name: 'Jamaa (where possible)',category: 'faith', time_of_day: 'anytime',  duration_minutes: 15, sort_order: 2 },
  { name: 'Adkar (morning)',       category: 'faith',  time_of_day: 'morning',  duration_minutes: 10, sort_order: 3 },
  { name: 'Adkar (evening)',       category: 'faith',  time_of_day: 'evening',  duration_minutes: 10, sort_order: 4 },
  { name: 'Salawat',               category: 'faith',  time_of_day: 'anytime',  duration_minutes: 5,  sort_order: 5 },
  { name: 'Quran Hifz (20min)',    category: 'faith',  time_of_day: 'anytime',  duration_minutes: 20, sort_order: 6 },
  // Body
  { name: 'Gym (Mon/Wed/Fri)',     category: 'body',   time_of_day: 'anytime',  duration_minutes: 60, sort_order: 7 },
  // Growth
  { name: 'Coding Learning (20min)',category: 'growth',time_of_day: 'anytime',  duration_minutes: 20, sort_order: 8 },
];

const DEFAULT_RECURRING = {
  title: 'Uber Eats',
  category: 'uber',
  priority: 2,
  duration_minutes: 120,
  scheduled_time: '21:00',
  days_of_week: [0,1,2,3,4,5,6],
  until_condition: 'mercor_or_outlier_or_fulltime',
};

const seedUserDefaults = async (userId) => {
  try {
    // Day rules — only seed if none exist for this user
    const drCheck = await query('SELECT COUNT(*) FROM day_rules WHERE user_id=$1', [userId]);
    if (parseInt(drCheck.rows[0].count) === 0) {
      for (const rule of DEFAULT_DAY_RULES) {
        await query(
          'INSERT INTO day_rules (user_id, day_of_week, focus_area, max_focus_hours, cal_color) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
          [userId, rule.day_of_week, rule.focus_area, rule.max_focus_hours, rule.cal_color]
        );
      }
    }

    // Habits — only seed if none exist for this user
    const habCheck = await query('SELECT COUNT(*) FROM habits WHERE user_id=$1', [userId]);
    if (parseInt(habCheck.rows[0].count) === 0) {
      for (const habit of DEFAULT_HABITS) {
        await query(
          'INSERT INTO habits (user_id, name, category, time_of_day, duration_minutes, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
          [userId, habit.name, habit.category, habit.time_of_day, habit.duration_minutes, habit.sort_order]
        );
      }
    }

    // Recurring tasks — only seed if none exist for this user
    const recCheck = await query('SELECT COUNT(*) FROM recurring_tasks WHERE user_id=$1', [userId]);
    if (parseInt(recCheck.rows[0].count) === 0) {
      await query(
        `INSERT INTO recurring_tasks (user_id, title, category, priority, duration_minutes, scheduled_time, days_of_week, until_condition)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          userId,
          DEFAULT_RECURRING.title,
          DEFAULT_RECURRING.category,
          DEFAULT_RECURRING.priority,
          DEFAULT_RECURRING.duration_minutes,
          DEFAULT_RECURRING.scheduled_time,
          DEFAULT_RECURRING.days_of_week,
          DEFAULT_RECURRING.until_condition,
        ]
      );
    }
  } catch (err) {
    console.error('seedUserDefaults error:', err.message);
  }
};

module.exports = { seedUserDefaults };
