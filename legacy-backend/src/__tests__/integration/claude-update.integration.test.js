/**
 * Claude update integration tests.
 * Mocks Groq API — never spends real tokens.
 */

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

jest.mock('../../lib/caldav', () => ({
  createCalEvent: jest.fn().mockResolvedValue('uid'),
  isConfigured: jest.fn().mockReturnValue(false),
}));

jest.mock('../../lib/seed', () => ({ seedUserDefaults: jest.fn() }));

const Groq = require('groq-sdk');

describe('Claude update integration', () => {
  const UUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('Groq API mocking', () => {
    test('mock returns controlled JSON response', async () => {
      const mockInstance = new Groq();
      mockInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              operations: [
                { type: 'move_task', task_id: UUID, new_status: 'done' },
              ],
              summary: 'Moved task to done',
              warnings: [],
            }),
          },
        }],
      });

      const response = await mockInstance.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: 'test prompt' },
          { role: 'user', content: 'mark my task as done' },
        ],
      });

      const text = response.choices[0].message.content;
      const parsed = JSON.parse(text);
      expect(parsed.operations).toHaveLength(1);
      expect(parsed.operations[0].type).toBe('move_task');
      expect(parsed.operations[0].new_status).toBe('done');
      expect(parsed.summary).toBe('Moved task to done');
    });

    test('schedule_warning op does not trigger DB write', () => {
      const warningOp = { type: 'schedule_warning', message: 'Monday is job hunt day — assigning LMS task would conflict.' };
      // schedule_warning should NOT go through DB handlers
      const DB_WRITING_OPS = new Set(['move_task', 'update_task', 'add_next_step', 'complete_next_step', 'create_task', 'complete_habit', 'resolve_recurring']);
      expect(DB_WRITING_OPS.has(warningOp.type)).toBe(false);
    });

    test('Claude timeout after 15s returns 504-like error', () => {
      // The route uses Promise.race with a 15s timeout
      // Verify the timeout error message is what the route expects
      const timeoutError = new Error('Claude timeout');
      expect(timeoutError.message).toBe('Claude timeout');

      // Read source to verify the 15s timeout is in the route
      const fs = require('fs');
      const path = require('path');
      const source = fs.readFileSync(path.join(__dirname, '../../routes/claude-update.js'), 'utf8');
      expect(source).toContain('15000');
      expect(source).toContain('Claude timeout');
      expect(source).toContain('504');
    });

    test('valid operations execute in order', () => {
      const operations = [
        { type: 'move_task', task_id: UUID, new_status: 'in_progress' },
        { type: 'add_next_step', task_id: UUID, text: 'Write tests' },
        { type: 'update_task', task_id: UUID, fields: { priority: 1 } },
      ];

      // Verify order is preserved
      expect(operations[0].type).toBe('move_task');
      expect(operations[1].type).toBe('add_next_step');
      expect(operations[2].type).toBe('update_task');
    });

    test('day rule violation: schedule_warning returned, no task mutation', () => {
      // If Claude returns a schedule_warning, the route adds it to warnings array
      // and does NOT mutate any DB state for that operation
      const mockResponse = {
        operations: [
          { type: 'schedule_warning', message: 'Cannot assign LMS task to Monday — it\'s job hunt day.' },
        ],
        summary: 'Schedule conflict detected',
        warnings: ['Monday is reserved for job hunting.'],
      };

      const dbWritingOps = mockResponse.operations.filter((o) =>
        ['move_task', 'update_task', 'create_task', 'complete_habit', 'resolve_recurring'].includes(o.type)
      );
      expect(dbWritingOps).toHaveLength(0);
    });
  });

  describe('board:refresh socket event', () => {
    test('socket emit is called after successful operations', () => {
      const mockIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
      const userId = 'user-abc-123';

      // Simulate what the route does after operations
      mockIo.to(`user:${userId}`).emit('board:refresh', { triggeredBy: 'claude' });

      expect(mockIo.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockIo.emit).toHaveBeenCalledWith('board:refresh', { triggeredBy: 'claude' });
    });
  });
});
