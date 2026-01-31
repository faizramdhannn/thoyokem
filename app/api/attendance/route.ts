import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readSheet, appendSheet } from '@/lib/sheets';
import { AttendanceImport } from '@/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.permissions.attendance) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await readSheet('attendance_import');

    if (!rows || rows.length < 2) {
      return NextResponse.json([]);
    }

    const attendance: AttendanceImport[] = rows.slice(1).map((row) => ({
      cloud_id: row[0] || '',
      id: row[1] || '',
      nama: row[2] || '',
      tanggal_absensi: row[3] || '',
      jam_absensi: row[4] || '',
      verifikasi: row[5] || '',
      tipe_absensi: row[6] || '',
      jabatan: row[7] || '',
      kantor: row[8] || '',
    }));

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.permissions.attendance) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Import data from CSV
    if (Array.isArray(data)) {
      const values = data.map((item: AttendanceImport) => [
        item.cloud_id,
        item.id,
        item.nama,
        item.tanggal_absensi,
        item.jam_absensi,
        item.verifikasi,
        item.tipe_absensi,
        item.jabatan,
        item.kantor,
      ]);

      await appendSheet('attendance_import', values);

      return NextResponse.json({ success: true, count: values.length });
    }

    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
  } catch (error) {
    console.error('Error importing attendance:', error);
    return NextResponse.json({ error: 'Failed to import attendance data' }, { status: 500 });
  }
}
