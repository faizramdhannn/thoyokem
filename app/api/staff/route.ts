import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { readSheet } from '@/lib/sheets';
import { StaffList } from '@/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await readSheet('staff_list');

    if (!rows || rows.length < 2) {
      return NextResponse.json([]);
    }

    const staff: StaffList[] = rows.slice(1).map((row) => ({
      id: row[0] || '',
      registration_id: row[1] || '',
      name: row[2] || '',
    }));

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff data' }, { status: 500 });
  }
}
