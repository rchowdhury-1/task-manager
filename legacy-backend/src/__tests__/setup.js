// Jest setup: ensure env vars are set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32chars-minimum!!';
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || 'test-refresh-secret-32chars-min!';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-test-mock';

// Never hit real CalDAV in tests
process.env.CALDAV_URL = '';
process.env.CALDAV_USERNAME = '';
process.env.CALDAV_PASSWORD = '';
process.env.CALDAV_CALENDAR_PATH = '';
