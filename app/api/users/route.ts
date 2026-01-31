import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { readSheet, writeSheet } from '@/lib/sheets';

interface UserPermission {
  id: string;
  name: string;
  username: string;
  role: string;
  dashboard: boolean;
  attendance: boolean;
  registration_request: boolean;
  setting: boolean;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.permissions.setting) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await readSheet('users');

    if (!rows || rows.length < 2) {
      return NextResponse.json([]);
    }

    const usersData: UserPermission[] = rows.slice(1).map((row) => ({
      id: row[0] || '',
      name: row[1] || '',
      username: row[2] || '',
      role: row[4] || '',
      dashboard: row[5] === 'TRUE' || row[5] === true,
      attendance: row[6] === 'TRUE' || row[6] === true,
      registration_request: row[7] === 'TRUE' || row[7] === true,
      setting: row[8] === 'TRUE' || row[8] === true,
    }));

    return NextResponse.json(usersData);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.permissions.setting) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { users } = await request.json();
    const rows = await readSheet('users');

    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 });
    }

    // Update each user row
    for (let i = 1; i < rows.length; i++) {
      const userId = rows[i][0];
      const user = users.find((u: UserPermission) => u.id === userId);

      if (user) {
        rows[i][5] = user.dashboard ? 'TRUE' : 'FALSE';
        rows[i][6] = user.attendance ? 'TRUE' : 'FALSE';
        rows[i][7] = user.registration_request ? 'TRUE' : 'FALSE';
        rows[i][8] = user.setting ? 'TRUE' : 'FALSE';
      }
    }

    // Write back to sheet
    await writeSheet('users', `A2:I${rows.length}`, rows.slice(1));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating users:', error);
    return NextResponse.json({ error: 'Failed to update users' }, { status: 500 });
  }
}