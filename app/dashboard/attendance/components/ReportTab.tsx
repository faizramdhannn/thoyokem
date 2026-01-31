'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Loading from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import { AttendanceImport, AttendanceRecord } from '@/types';
import { processAttendanceData, exportToXLSX } from '@/utils/attendance';
import { Search, Download, Calendar } from 'lucide-react';

export default function ReportTab() {
  const [rawData, setRawData] = useState<AttendanceImport[]>([]);
  const [reportData, setReportData] = useState<AttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (rawData.length > 0) {
      const processed = processAttendanceData(rawData);
      setReportData(processed);
      setFilteredData(processed);
    }
  }, [rawData]);

  useEffect(() => {
    filterData();
  }, [searchTerm, dateFrom, dateTo, reportData]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/attendance');
      if (response.ok) {
        const result = await response.json();
        setRawData(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...reportData];

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFrom) {
      filtered = filtered.filter((item) => item.tanggal_absensi >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((item) => item.tanggal_absensi <= dateTo);
    }

    setFilteredData(filtered);
  };

  const handleExport = () => {
    exportToXLSX(filteredData);
  };

  const columns = [
    { header: 'Nama', accessor: 'nama' as keyof AttendanceRecord },
    { header: 'Jabatan', accessor: 'jabatan' as keyof AttendanceRecord },
    { header: 'Tanggal', accessor: 'tanggal_absensi' as keyof AttendanceRecord },
    {
      header: 'Jam Masuk',
      accessor: (row: AttendanceRecord) => (
        <div className="text-center">
          <div className="text-xs text-gray-500">Target: {row.jam_masuk_target}</div>
          <div className={row.keterlambatan_menit > 0 ? 'text-red-600 font-medium text-xs' : 'text-xs'}>
            Actual: {row.jam_masuk_actual || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Keterlambatan',
      accessor: (row: AttendanceRecord) => (
        <div className="text-center">
          <div className="font-medium text-xs">{row.keterlambatan_menit} min</div>
          <div
            className={`text-xs ${
              row.keterangan_masuk === 'Terlambat'
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {row.keterangan_masuk}
          </div>
        </div>
      ),
    },
    {
      header: 'Jam Pulang',
      accessor: (row: AttendanceRecord) => (
        <div className="text-center">
          <div className="text-xs text-gray-500">Target: {row.jam_pulang_target}</div>
          <div className={row.overtime_menit > 0 ? 'text-blue-600 font-medium text-xs' : 'text-xs'}>
            Actual: {row.jam_pulang_actual || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Overtime',
      accessor: (row: AttendanceRecord) => (
        <div className="text-center">
          <div className="font-medium text-xs">{row.overtime_menit} min</div>
          <div
            className={`text-xs ${
              row.keterangan_pulang === 'Overtime'
                ? 'text-blue-600'
                : 'text-green-600'
            }`}
          >
            {row.keterangan_pulang}
          </div>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Search by name or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-9"
                />
              </div>
              <Button onClick={handleExport} variant="secondary">
                <Download size={14} className="mr-1.5" />
                Export
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Calendar
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input-field pl-9"
                  placeholder="From Date"
                />
              </div>
              <div className="flex-1 relative">
                <Calendar
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input-field pl-9"
                  placeholder="To Date"
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400">
            Showing {filteredData.length} of {reportData.length} records
          </div>
        </div>
      </Card>

      <Card>
        <Table data={filteredData} columns={columns} />
      </Card>
    </div>
  );
}