import { describe, it, expect } from 'vitest';
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import { buildTools } from '@/lib/ai/tools';
import { EXECUTORS } from '@/lib/ai/executors';

// buildTools' declared return type (ChatCompletionTool) is a union that also
// includes newer non-function "custom" tool variants; every entry it actually
// builds is a function tool, so narrow once here rather than asserting at
// every call site.
function asFunctionTools(tools: ReturnType<typeof buildTools>): ChatCompletionFunctionTool[] {
  return tools.filter((t): t is ChatCompletionFunctionTool => t.type === 'function');
}

describe('buildTools', () => {
  it('declares exactly one tool per entry in EXECUTORS — no drift between the two', () => {
    const toolNames = asFunctionTools(buildTools(['learning', 'fitness'])).map((t) => t.function.name).sort();
    const executorNames = Object.keys(EXECUTORS).sort();
    expect(toolNames).toEqual(executorNames);
  });

  it('includes the four project tools with required-field schemas', () => {
    const tools = asFunctionTools(buildTools([]));
    const byName = Object.fromEntries(tools.map((t) => [t.function.name, t]));

    expect(byName.create_project.function.parameters?.required).toEqual(['name']);
    expect(byName.log_project_update.function.parameters?.required).toEqual(['project', 'update']);
    expect(byName.update_project_status.function.parameters?.required).toEqual(['project', 'status']);
    expect(byName.list_projects.function.parameters?.required).toBeUndefined();
  });

  it('constrains project type/status to the same enums as PROJECT_TYPES/PROJECT_STATUSES', () => {
    const tools = asFunctionTools(buildTools([]));
    const createProject = tools.find((t) => t.function.name === 'create_project')!;
    const props = createProject.function.parameters?.properties as Record<string, { enum?: string[] }>;

    expect(props.type.enum).toEqual(['client', 'personal']);
    expect(props.status.enum).toEqual(['active', 'paused', 'done', 'archived']);
  });

  it('falls back to a plain string category prop when the user has no topics', () => {
    const tools = asFunctionTools(buildTools([]));
    const createTask = tools.find((t) => t.function.name === 'create_task')!;
    const props = createTask.function.parameters?.properties as Record<string, { enum?: string[] }>;
    expect(props.category.enum).toBeUndefined();
  });

  it('uses the given topic slugs as the category enum when present', () => {
    const tools = asFunctionTools(buildTools(['learning', 'fitness']));
    const createTask = tools.find((t) => t.function.name === 'create_task')!;
    const props = createTask.function.parameters?.properties as Record<string, { enum?: string[] }>;
    expect(props.category.enum).toEqual(['learning', 'fitness']);
  });
});
