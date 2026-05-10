import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        "Create a new task. Use today's date as default for assigned_day if user mentions today/now/etc.",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          category: {
            type: 'string',
            enum: ['career', 'lms', 'freelance', 'learning', 'uber', 'faith'],
          },
          priority: { type: 'integer', enum: [1, 2, 3], description: '1=urgent, 2=this week, 3=backlog' },
          status: {
            type: 'string',
            enum: ['backlog', 'this_week', 'in_progress', 'done'],
          },
          assigned_day: { type: 'string', description: 'YYYY-MM-DD' },
          scheduled_time: { type: 'string', description: 'HH:MM (24h)' },
          duration_minutes: { type: 'integer', minimum: 1, maximum: 1440 },
          last_left_off: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['title'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description:
        'Update an existing task. Use only when user refers to a specific task by name or context.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task UUID' },
          title: { type: 'string' },
          category: {
            type: 'string',
            enum: ['career', 'lms', 'freelance', 'learning', 'uber', 'faith'],
          },
          priority: { type: 'integer', enum: [1, 2, 3] },
          status: {
            type: 'string',
            enum: ['backlog', 'this_week', 'in_progress', 'done'],
          },
          assigned_day: { type: 'string' },
          scheduled_time: { type: 'string' },
          duration_minutes: { type: 'integer', minimum: 1, maximum: 1440 },
          last_left_off: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task permanently.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task UUID' },
        },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: "Mark a task as done. Same as update_task with status='done' but more direct.",
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task UUID' },
        },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_time',
      description: 'Add to time_logged_minutes for a task.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Task UUID' },
          minutes: { type: 'integer', minimum: 1, description: 'Minutes to add' },
        },
        required: ['id', 'minutes'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description: 'Create a new habit.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Habit name' },
          section: { type: 'string', enum: ['faith', 'body', 'growth'] },
          time_of_day: { type: 'string', enum: ['morning', 'evening', 'anytime'] },
          days_of_week: {
            type: 'array',
            items: { type: 'integer', minimum: 0, maximum: 6 },
            description: '0=Sunday, 6=Saturday',
          },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_habit',
      description: 'Mark a habit as completed for a date.',
      parameters: {
        type: 'object',
        properties: {
          habit_id: { type: 'string', description: 'Habit UUID' },
          date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
        },
        required: ['habit_id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_day_rule',
      description: 'Set the focus area and hour cap for a day of the week.',
      parameters: {
        type: 'object',
        properties: {
          day_of_week: {
            type: 'integer',
            minimum: 0,
            maximum: 6,
            description: '0=Sunday, 6=Saturday',
          },
          focus_area: {
            type: 'string',
            enum: ['job_hunt', 'lms', 'freelance', 'learning', 'rest', 'flex'],
          },
          max_focus_hours: { type: 'integer', minimum: 0, maximum: 24 },
        },
        required: ['day_of_week', 'focus_area'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_recurring_task',
      description: 'Create a recurring task that repeats on specified days.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: {
            type: 'string',
            enum: ['career', 'lms', 'freelance', 'learning', 'uber', 'faith'],
          },
          priority: { type: 'integer', enum: [1, 2, 3] },
          duration_minutes: { type: 'integer', minimum: 1, maximum: 1440 },
          scheduled_time: { type: 'string', description: 'HH:MM (24h)' },
          days_of_week: {
            type: 'array',
            items: { type: 'integer', minimum: 0, maximum: 6 },
            description: '0=Sunday, 6=Saturday',
          },
          until_condition: { type: 'string' },
        },
        required: ['title', 'days_of_week'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_recurring',
      description: 'Delete a recurring task permanently. Use this for items that repeat on a schedule (not one-off tasks).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Recurring task UUID' },
        },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
];
