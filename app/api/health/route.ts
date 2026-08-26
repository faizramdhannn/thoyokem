import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Trivial DB ping — deliberately no auth, no sensitive data (just {ok: true/false}).
// Two callers depend on that: the sidebar's status dot, and the "Keep Supabase Alive"
// GitHub Action, which pings this unauthenticated on a daily cron — adding a session
// requirement here breaks that workflow (it has no cookie to send), so don't.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
