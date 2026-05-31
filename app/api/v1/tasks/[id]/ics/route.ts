import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks, users } from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/handler';
import { generateICS } from '@/lib/calendar/ics';
import { localToUTC } from '@/lib/utils/timezone';

export const GET = withAuth(async (_req: NextRequest, { userId, params }) => {
  const taskId = params?.id;
  if (!taskId) {
    return Response.json({ error: 'Task ID required' }, { status: 400 });
  }

  const [[task], [user]] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))),
    db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).limit(1),
  ]);

  if (!task) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  if (!task.assignedDay || !task.scheduledTime) {
    return Response.json(
      { error: 'Task has no scheduled date/time' },
      { status: 422 }
    );
  }

  const userTz = user?.timezone ?? 'UTC';
  const timeHHMM = task.scheduledTime.slice(0, 5); // Ensure HH:MM format

  // Construct proper UTC start from user's local wall-clock time
  const dtStart = localToUTC(task.assignedDay, timeHHMM, userTz);
  if (isNaN(dtStart.getTime())) {
    return Response.json({ error: 'Invalid date/time' }, { status: 422 });
  }

  const durationMs = (task.durationMinutes ?? 60) * 60 * 1000;
  const dtEnd = new Date(dtStart.getTime() + durationMs);

  // Compute local end time parts for TZID output
  const [startH, startM] = timeHHMM.split(':').map(Number);
  const endTotalMin = startH * 60 + startM + (task.durationMinutes ?? 60);
  const [startY, startMo, startD] = task.assignedDay.split('-').map(Number);

  const localStart = { year: startY, month: startMo, day: startD, hour: startH, minute: startM };
  // Simple end time (may overflow past midnight but acceptable for typical durations)
  const localEnd = {
    year: startY,
    month: startMo,
    day: startD + Math.floor(endTotalMin / 1440),
    hour: Math.floor((endTotalMin % 1440) / 60),
    minute: endTotalMin % 60,
  };

  const ics = generateICS({
    uid: `${task.id}@personalos.app`,
    summary: task.title,
    description: task.description ?? undefined,
    dtStart,
    dtEnd,
    createdAt: task.createdAt ?? undefined,
    timezone: userTz,
    localStart,
    localEnd,
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
