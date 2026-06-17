import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readSheet, clearAndWriteSheet } from '@/lib/sheets';
import { AttendanceImport } from '@/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow dashboard OR attendance permission to read attendance data
    if (!session.user.permissions.attendance && !session.user.permissions.dashboard) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      jam_set: row[4] || '',
      jam_absensi: row[5] || '',
      verifikasi: row[6] || '',
      tipe_absensi: row[7] || '',
      jabatan: row[8] || '',
      kantor: row[9] || '',
      keterangan: row[10] || '',
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

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Dates in the new import
    const incomingDates = new Set<string>(
      data.map((item: AttendanceImport) => item.tanggal_absensi).filter(Boolean)
    );

    // Read existing data
    const rows = await readSheet('attendance_import');
    const existingData: AttendanceImport[] = rows && rows.length > 1
      ? rows.slice(1).map((row) => ({
          cloud_id: row[0] || '',
          id: row[1] || '',
          nama: row[2] || '',
          tanggal_absensi: row[3] || '',
          jam_set: row[4] || '',
          jam_absensi: row[5] || '',
          verifikasi: row[6] || '',
          tipe_absensi: row[7] || '',
          jabatan: row[8] || '',
          kantor: row[9] || '',
          keterangan: row[10] || '',
        }))
      : [];

    // Keep existing rows whose dates are NOT in the incoming data
    const preserved = existingData.filter(
      (item) => !incomingDates.has(item.tanggal_absensi)
    );

    // Merge: preserved old data + new data
    const merged = [...preserved, ...data];

    // Sort by tanggal_absensi then nama for cleanliness
    merged.sort((a, b) => {
      const dateCmp = a.tanggal_absensi.localeCompare(b.tanggal_absensi);
      return dateCmp !== 0 ? dateCmp : a.nama.localeCompare(b.nama);
    });

    const values = merged.map((item: AttendanceImport) => [
      item.cloud_id,
      item.id,
      item.nama,
      item.tanggal_absensi,
      item.jam_set,
      item.jam_absensi,
      item.verifikasi,
      item.tipe_absensi,
      item.jabatan,
      item.kantor,
      item.keterangan || '',
    ]);

    await clearAndWriteSheet('attendance_import', values);

    return NextResponse.json({
      success: true,
      count: data.length,
      preserved: preserved.length,
      total: merged.length,
      dates_replaced: Array.from(incomingDates).sort(),
    });
  } catch (error) {
    console.error('Error importing attendance:', error);
    return NextResponse.json({ error: 'Failed to import attendance data' }, { status: 500 });
  }
}