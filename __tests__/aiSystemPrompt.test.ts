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

  // Date table tests — Saturday May 9, 2026
  it('date table maps Thursday to 2026-05-14', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    const prompt = buildSystemPrompt(now);
    expect(prompt).toContain('2026-05-14 (Thursday)');
    expect(prompt).toMatch(/2026-05-14 \(Thursday\).*next Thursday/);
  });

  it('date table maps Friday to 2026-05-15', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    const prompt = buildSystemPrompt(now);
    expect(prompt).toContain('2026-05-15 (Friday)');
    expect(prompt).toMatch(/2026-05-15 \(Friday\).*next Friday/);
  });

  it('date table marks tomorrow as 2026-05-10', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    const prompt = buildSystemPrompt(now);
    expect(prompt).toMatch(/2026-05-10 \(Sunday\).*tomorrow/);
  });

  it('date table includes ISO date guidance', () => {
    const now = new Date('2026-05-09T10:00:00Z');
    const prompt = buildSystemPrompt(now);
    expect(prompt).toContain('Never compute dates yourself');
    expect(prompt).toContain('always include the explicit ISO date');
  });
});
