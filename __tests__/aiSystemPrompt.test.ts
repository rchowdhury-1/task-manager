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

  it("includes the user's own topics", () => {
    const prompt = buildSystemPrompt(new Date(), 'UTC', [
      { slug: 'learning', label: 'Learning' },
      { slug: 'home-garden', label: 'Home Garden' },
    ]);
    expect(prompt).toContain('learning ("Learning")');
    expect(prompt).toContain('home-garden ("Home Garden")');
    expect(prompt).toContain('default to the user\'s first topic ("learning")');
  });

  it('handles a user with no topics', () => {
    const prompt = buildSystemPrompt(new Date());
    expect(prompt).toContain('no topics yet');
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

  it('instructs the model to auto-create projects without asking for confirmation', () => {
    // This is the whole point of log_project_update — a future prompt edit
    // that silently drops this instruction would regress the feature back
    // to asking for confirmation on every new project, defeating the
    // single-prompt-capture design.
    const prompt = buildSystemPrompt(new Date());
    expect(prompt).toContain('log_project_update');
    expect(prompt).toMatch(/auto-creates the project.*no existing project closely matches/);
    expect(prompt).toContain('Do NOT ask the user to confirm');
  });

  it('instructs the model NOT to auto-create on update_project_status', () => {
    const prompt = buildSystemPrompt(new Date());
    expect(prompt).toMatch(/update_project_status.*does NOT auto-create/);
  });

  it('mentions list_projects for disambiguation', () => {
    const prompt = buildSystemPrompt(new Date());
    expect(prompt).toContain('list_projects');
  });
});
