import { AttendanceImport, AttendanceRecord, AttendanceRecap } from '@/types';
import { format, parse } from 'date-fns';

interface ProcessedDay {
  masuk?: string;
  pulang?: string;
}

export function processAttendanceData(rawData: AttendanceImport[]): AttendanceRecord[] {
  // Group by employee and date
  const grouped = new Map<string, Map<string, ProcessedDay>>();

  rawData.forEach((record) => {
    const key = `${record.id}-${record.nama}`;
    if (!grouped.has(key)) {
      grouped.set(key, new Map());
    }

    const dateMap = grouped.get(key)!;
    if (!dateMap.has(record.tanggal_absensi)) {
      dateMap.set(record.tanggal_absensi, {});
    }

    const dayRecord = dateMap.get(record.tanggal_absensi)!;
    
    if (record.tipe_absensi === 'Absensi Masuk') {
      dayRecord.masuk = record.jam_absensi;
    } else if (record.tipe_absensi === 'Absensi Pulang') {
      dayRecord.pulang = record.jam_absensi;
    }
  });

  // Create attendance records
  const records: AttendanceRecord[] = [];

  rawData.forEach((record) => {
    const key = `${record.id}-${record.nama}`;
    const dateMap = grouped.get(key);
    if (!dateMap) return;

    const dayRecord = dateMap.get(record.tanggal_absensi);
    if (!dayRecord) return;

    // Check if we already processed this day
    const existingRecord = records.find(
      (r) => r.id === record.id && r.tanggal_absensi === record.tanggal_absensi
    );

    if (existingRecord) return;

    const jamMasukTarget = '08:00';
    const jamPulangTarget = '17:00';

    let jamMasukActual = '';
    let keterlambatanMenit = 0;
    let keteranganMasuk = '';

    let jamPulangActual = '';
    let overtimeMenit = 0;
    let keteranganPulang = '';

    // Process masuk
    if (dayRecord.masuk) {
      jamMasukActual = dayRecord.masuk;
      const targetMinutes = timeToMinutes(jamMasukTarget);
      const actualMinutes = timeToMinutes(jamMasukActual);
      
      if (actualMinutes > targetMinutes) {
        keterlambatanMenit = actualMinutes - targetMinutes;
        keteranganMasuk = 'Terlambat';
      } else {
        keteranganMasuk = 'Tepat Waktu';
      }
    }

    // Process pulang
    if (dayRecord.pulang) {
      jamPulangActual = dayRecord.pulang;
      const targetMinutes = timeToMinutes(jamPulangTarget);
      const actualMinutes = timeToMinutes(jamPulangActual);
      
      if (actualMinutes > targetMinutes) {
        overtimeMenit = actualMinutes - targetMinutes;
        keteranganPulang = 'Overtime';
      } else {
        keteranganPulang = 'Tepat Waktu';
      }
    } else {
      keteranganPulang = 'Tepat Waktu';
    }

    records.push({
      id: record.id,
      nama: record.nama,
      jabatan: record.jabatan,
      tanggal_absensi: record.tanggal_absensi,
      jam_masuk_target: jamMasukTarget,
      jam_masuk_actual: jamMasukActual,
      keterlambatan_menit: keterlambatanMenit,
      keterangan_masuk: keteranganMasuk,
      jam_pulang_target: jamPulangTarget,
      jam_pulang_actual: jamPulangActual,
      overtime_menit: overtimeMenit,
      keterangan_pulang: keteranganPulang,
    });
  });

  return records.sort((a, b) => {
    if (a.nama !== b.nama) return a.nama.localeCompare(b.nama);
    return a.tanggal_absensi.localeCompare(b.tanggal_absensi);
  });
}

export function calculateRecap(records: AttendanceRecord[]): AttendanceRecap[] {
  const employeeMap = new Map<string, {
    keterlambatan: number[];
    overtime: number[];
  }>();

  records.forEach((record) => {
    if (!employeeMap.has(record.nama)) {
      employeeMap.set(record.nama, {
        keterlambatan: [],
        overtime: [],
      });
    }

    const empData = employeeMap.get(record.nama)!;
    
    if (record.keterlambatan_menit > 0) {
      empData.keterlambatan.push(record.keterlambatan_menit);
    }
    
    if (record.overtime_menit > 0) {
      empData.overtime.push(record.overtime_menit);
    }
  });

  const recap: AttendanceRecap[] = [];

  employeeMap.forEach((data, nama) => {
    const totalKeterlambatan = data.keterlambatan.reduce((sum, val) => sum + val, 0);
    const totalOvertime = data.overtime.reduce((sum, val) => sum + val, 0);

    recap.push({
      nama_karyawan: nama,
      jumlah_keterlambatan: data.keterlambatan.length,
      total_keterlambatan_menit: totalKeterlambatan,
      average_keterlambatan: data.keterlambatan.length > 0 
        ? Math.round(totalKeterlambatan / data.keterlambatan.length)
        : 0,
      jumlah_overtime: data.overtime.length,
      total_overtime_menit: totalOvertime,
      average_overtime: data.overtime.length > 0
        ? Math.round(totalOvertime / data.overtime.length)
        : 0,
    });
  });

  return recap.sort((a, b) => a.nama_karyawan.localeCompare(b.nama_karyawan));
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function exportToCSV(records: AttendanceRecord[]): string {
  const headers = [
    'ID',
    'Nama',
    'Jabatan',
    'Tanggal Absensi',
    'Jam Masuk',
    'Jam Absensi',
    'Keterlambatan (menit)',
    'Keterangan',
    'Jam Pulang',
    'Jam Absensi',
    'Overtime (menit)',
    'Keterangan',
  ];

  const rows = records.map((r) => [
    r.id,
    r.nama,
    r.jabatan,
    r.tanggal_absensi,
    r.jam_masuk_target,
    r.jam_masuk_actual,
    r.keterlambatan_menit,
    r.keterangan_masuk,
    r.jam_pulang_target,
    r.jam_pulang_actual,
    r.overtime_menit,
    r.keterangan_pulang,
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  return csv;
}

export function exportRecapToCSV(recap: AttendanceRecap[]): string {
  const headers = [
    'Nama Karyawan',
    'Jumlah Keterlambatan',
    'Total (Menit)',
    'Average',
    '',
    'Jumlah Overtime',
    'Total (Menit)',
    'Average',
  ];

  const rows = recap.map((r) => [
    r.nama_karyawan,
    r.jumlah_keterlambatan,
    r.total_keterlambatan_menit,
    r.average_keterlambatan,
    '',
    r.jumlah_overtime,
    r.total_overtime_menit,
    r.average_overtime,
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  return csv;
}
