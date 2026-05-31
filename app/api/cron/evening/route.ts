import { NextRequest, NextResponse } from 'next/server';
import { sendToAllEnabledUsers } from '@/lib/notifications/sender';
import { quoteFor } from '@/lib/notifications/quotes';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const quote = quoteFor(new Date(), 'evening');
  const body = quote.author
    ? `"${quote.text}"\n\u2014 ${quote.author}`
    : `"${quote.text}"`;

  const result = await sendToAllEnabledUsers(() => ({
    title: 'Personal OS',
    body,
    tag: 'evening-quote',
  }));

  return NextResponse.json(result);
}
