import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { readSheet, appendSheet } from '@/lib/sheets';
import { LeaveAttendance } from '@/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await readSheet('leave_attendance');

    if (!rows || rows.length < 2) {
      return NextResponse.json([]);
    }

    const leaves: LeaveAttendance[] = rows.slice(1).map((row) => ({
      id: row[0] || '',
      registration_id: row[1] || '',
      name: row[2] || '',
      date_from: row[3] || '',
      date_end: row[4] || '',
      category: row[5] || '',
      link_url: row[6] || '',
      created_at: row[7] || '',
      update_at: row[8] || '',
    }));

    return NextResponse.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json({ error: 'Failed to fetch leave data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Get existing data to generate new ID
    const rows = await readSheet('leave_attendance');
    const newId = rows.length > 1 ? String(rows.length) : '1';

    const now = new Date().toISOString();

    const newLeave = [
      newId,
      data.registration_id || '',
      data.name || '',
      data.date_from || '',
      data.date_end || '',
      data.category || '',
      data.link_url || '',
      now,
      now,
    ];

    await appendSheet('leave_attendance', [newLeave]);

    return NextResponse.json({ success: true, id: newId });
  } catch (error) {
    console.error('Error creating leave:', error);
    return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 });
  }
}
