import { AttendanceImport, AttendanceRecord, AttendanceRecap } from '@/types';
import * as XLSX from 'xlsx';

interface ProcessedDay {
  masuk?: string;
  pulang?: string;
}

export function processAttendanceData(rawData: AttendanceImport[]): AttendanceRecord[] {
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

  const records: AttendanceRecord[] = [];

  rawData.forEach((record) => {
    const key = `${record.id}-${record.nama}`;
    const dateMap = grouped.get(key);
    if (!dateMap) return;

    const dayRecord = dateMap.get(record.tanggal_absensi);
    if (!dayRecord) return;

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
    uniqueDates: Set<string>;
    keterlambatan: number[];
    overtime: number[];
  }>();

  records.forEach((record) => {
    if (!employeeMap.has(record.nama)) {
      employeeMap.set(record.nama, {
        uniqueDates: new Set(),
        keterlambatan: [],
        overtime: [],
      });
    }

    const empData = employeeMap.get(record.nama)!;
    
    // Count unique attendance dates
    empData.uniqueDates.add(record.tanggal_absensi);
    
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
      jumlah_hadir: data.uniqueDates.size,
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

/**
 * Convert time string to minutes
 * Supports multiple formats:
 * - Standard: "17:00" or "17.00" → 1020 minutes
 * - Excel decimal: "0.7083333333" → 1020 minutes (17:00)
 * - Excel decimal: "0.3409722222" → 490 minutes (08:10)
 */
function timeToMinutes(time: string): number {
  if (!time || time.trim() === '') return 0;
  
  const trimmedTime = time.trim();
  
  // Check if it's Excel decimal format (starts with 0. and less than 1)
  if (trimmedTime.startsWith('0.')) {
    const decimalValue = parseFloat(trimmedTime);
    if (!isNaN(decimalValue) && decimalValue < 1) {
      // Convert decimal to total minutes (1 day = 1440 minutes)
      return Math.round(decimalValue * 1440);
    }
  }
  
  // Handle standard format with ':' or '.'
  // First, normalize the separator: replace first '.' with ':'
  let normalizedTime = trimmedTime;
  const dotIndex = trimmedTime.indexOf('.');
  if (dotIndex > 0 && dotIndex < 3) { // Only replace if it's a time separator (e.g., "17.00")
    normalizedTime = trimmedTime.substring(0, dotIndex) + ':' + trimmedTime.substring(dotIndex + 1);
  }
  
  const parts = normalizedTime.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }
  
  return 0;
}

export function exportToXLSX(records: AttendanceRecord[]): void {
  const exportData = records.map((r) => ({
    'ID': r.id,
    'Nama': r.nama,
    'Jabatan': r.jabatan,
    'Tanggal Absensi': r.tanggal_absensi,
    'Jam Masuk (Target)': r.jam_masuk_target,
    'Jam Masuk (Actual)': r.jam_masuk_actual,
    'Keterlambatan (menit)': r.keterlambatan_menit,
    'Keterangan Masuk': r.keterangan_masuk,
    'Jam Pulang (Target)': r.jam_pulang_target,
    'Jam Pulang (Actual)': r.jam_pulang_actual,
    'Overtime (menit)': r.overtime_menit,
    'Keterangan Pulang': r.keterangan_pulang,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
  
  XLSX.writeFile(workbook, `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportRecapToXLSX(recap: AttendanceRecap[]): void {
  const exportData = recap.map((r) => ({
    'Nama Karyawan': r.nama_karyawan,
    'Jumlah Hadir': r.jumlah_hadir,
    'Jumlah Keterlambatan': r.jumlah_keterlambatan,
    'Total Keterlambatan (Menit)': r.total_keterlambatan_menit,
    'Rata-rata Keterlambatan': r.average_keterlambatan,
    'Jumlah Overtime': r.jumlah_overtime,
    'Total Overtime (Menit)': r.total_overtime_menit,
    'Rata-rata Overtime': r.average_overtime,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Recap');
  
  XLSX.writeFile(workbook, `attendance_recap_${new Date().toISOString().split('T')[0]}.xlsx`);
}