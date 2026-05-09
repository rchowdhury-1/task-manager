import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '@/lib/ai/systemPrompt';

describe('buildSystemPrompt', () => {
  it('includes today\'s date', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    const prompt = buildSystemPrompt(now);
    expect(prompt).toContain('2026-05-09');
  });

  it('includes day of week', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    const prompt = buildSystemPrompt(now);
    expect(prompt).toContain('Saturday');
  });

  it('includes category list', () => {
    const prompt = buildSystemPrompt(new Date());
    expect(prompt).toContain('career, lms, freelance, learning, uber, faith');
  });

  it('includes priority definitions', () => {
    const prompt = buildSystemPrompt(new Date());
    expect(prompt).toContain('1 = urgent');
    expect(prompt).toContain('2 = this week');
    expect(prompt).toContain('3 = backlog');
  });

  it('includes behaviour guidelines', () => {
    const prompt = buildSystemPrompt(new Date());
    expect(prompt).toContain('tool calls');
    expect(prompt).toContain('Do not explain');
  });
});
