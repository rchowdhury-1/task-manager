import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/handler';
import { generateICS } from '@/lib/calendar/ics';

export const GET = withAuth(async (_req: NextRequest, { userId, params }) => {
  const taskId = params?.id;
  if (!taskId) {
    return Response.json({ error: 'Task ID required' }, { status: 400 });
  }

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  if (!task) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  if (!task.assignedDay || !task.scheduledTime) {
    return Response.json(
      { error: 'Task has no scheduled date/time' },
      { status: 422 }
    );
  }

  // Construct start datetime from assignedDay (YYYY-MM-DD) + scheduledTime (HH:MM:SS or HH:MM)
  const dtStart = new Date(`${task.assignedDay}T${task.scheduledTime}`);
  if (isNaN(dtStart.getTime())) {
    return Response.json({ error: 'Invalid date/time' }, { status: 422 });
  }

  const durationMs = (task.durationMinutes ?? 60) * 60 * 1000;
  const dtEnd = new Date(dtStart.getTime() + durationMs);

  const ics = generateICS({
    uid: `${task.id}@personalos.app`,
    summary: task.title,
    description: task.description ?? undefined,
    dtStart,
    dtEnd,
    createdAt: task.createdAt ?? undefined,
  });

  const filename = `${task.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-').slice(0, 50)}.ics`;

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
