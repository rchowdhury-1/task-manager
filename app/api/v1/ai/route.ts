import { NextRequest } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { withAuth } from '@/lib/auth/handler';
import { db } from '@/lib/db';
import { aiCalls } from '@/lib/db/schema';
import { TOOLS } from '@/lib/ai/tools';
import { EXECUTORS } from '@/lib/ai/executors';
import { buildSystemPrompt } from '@/lib/ai/systemPrompt';
import { buildUserContext } from '@/lib/ai/context';

const MAX_ITERATIONS = 5;

const aiRequestSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'AI not configured. Set OPENAI_API_KEY.' },
      { status: 500 },
    );
  }

  const body = await req.json();
  const parsed = aiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  const start = Date.now();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    // Build context
    const now = new Date();
    const systemPrompt = buildSystemPrompt(now);
    const userContext = await buildUserContext(userId, db);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${userContext}\n\n---\n\nUser request: ${parsed.data.message}` },
    ];

    let operationsExecuted = 0;
    let tokensUsed = 0;
    let tokensIn = 0;
    let tokensOut = 0;
    const warnings: string[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      const usage = response.usage;
      if (usage) {
        tokensUsed += usage.total_tokens;
        tokensIn += usage.prompt_tokens;
        tokensOut += usage.completion_tokens;
      }

      // No tool calls — final response
      if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
        // Add assistant message for completeness
        const summary = choice.message.content ?? 'Done';

        // Log AI call
        const costUsd = (tokensIn * 0.15 + tokensOut * 0.60) / 1_000_000;
        await db.insert(aiCalls).values({
          userId,
          tokensIn,
          tokensOut,
          costUsd: String(costUsd),
        });

        return Response.json({
          summary,
          operations_executed: operationsExecuted,
          warnings,
          tokens_used: tokensUsed,
          duration_ms: Date.now() - start,
        });
      }

      // Process tool calls
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        // Only handle function tool calls
        if (toolCall.type !== 'function') {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ ok: false, error: 'Unsupported tool type' }),
          });
          continue;
        }

        const executor = EXECUTORS[toolCall.function.name];
        let result: string;

        if (!executor) {
          result = JSON.stringify({ ok: false, error: `Unknown tool: ${toolCall.function.name}` });
          warnings.push(`Unknown tool called: ${toolCall.function.name}`);
        } else {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const execResult = await executor(userId, args, db);
            result = JSON.stringify(execResult);
            if (execResult.ok) {
              operationsExecuted++;
            } else {
              warnings.push(`${toolCall.function.name}: ${execResult.error}`);
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Execution failed';
            result = JSON.stringify({ ok: false, error: msg });
            warnings.push(`${toolCall.function.name} failed: ${msg}`);
          }
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Check if we've hit max iterations on next loop
      if (i === MAX_ITERATIONS - 1) {
        warnings.push('Hit max iterations, some operations may not have completed');
      }
    }

    // If we exhausted iterations, get a final summary
    const costUsd = (tokensIn * 0.15 + tokensOut * 0.60) / 1_000_000;
    await db.insert(aiCalls).values({
      userId,
      tokensIn,
      tokensOut,
      costUsd: String(costUsd),
    });

    return Response.json({
      summary: 'Completed with maximum iterations reached.',
      operations_executed: operationsExecuted,
      warnings,
      tokens_used: tokensUsed,
      duration_ms: Date.now() - start,
    });
  } catch (err: unknown) {
    console.error('[AI Route]', err);

    // OpenAI rate limit
    if (err instanceof OpenAI.RateLimitError) {
      return Response.json(
        { error: 'AI rate limit reached. Please try again in a moment.' },
        { status: 429 },
      );
    }

    // OpenAI auth/quota
    if (err instanceof OpenAI.AuthenticationError) {
      return Response.json(
        { error: 'AI service unavailable. Check API key configuration.' },
        { status: 502 },
      );
    }

    // Generic OpenAI error
    if (err instanceof OpenAI.APIError) {
      return Response.json(
        { error: 'AI service encountered an error. Please try again.' },
        { status: 502 },
      );
    }

    return Response.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
});
