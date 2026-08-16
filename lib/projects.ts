// Shared project definitions used by validation, AI tools/executors, and the
// UI. Nothing outside this file should hardcode a project type/status value
// or the slug regex — that duplication is exactly what the Clean Code audit
// flagged repeatedly in the existing task/category enums.

export const PROJECT_TYPES = ['client', 'personal'] as const;
export const PROJECT_STATUSES = ['active', 'paused', 'done', 'archived'] as const;
export const PROJECT_SLUG_REGEX = /^[a-z0-9_-]+$/;
