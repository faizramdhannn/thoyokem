'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { AttendanceImport } from '@/types';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 20;

export default function DataTab() {
  const [data, setData] = useState<AttendanceImport[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
    setPage(1);
  }, [searchTerm, selectedDate, data]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/attendance');
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setFilteredData(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...data];
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedDate) {
      filtered = filtered.filter((item) => item.tanggal_absensi === selectedDate);
    }
    setFilteredData(filtered);
  };

  const handleExport = () => {
    const exportData = filteredData.map((item) => ({
      'Cloud ID': item.cloud_id,
      'ID': item.id,
      'Nama': item.nama,
      'Tanggal Absensi': item.tanggal_absensi,
      'Jam Set': item.jam_set,
      'Jam Absensi': item.jam_absensi,
      'Verifikasi': item.verifikasi,
      'Tipe Absensi': item.tipe_absensi,
      'Jabatan': item.jabatan,
      'Kantor': item.kantor,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Data');
    XLSX.writeFile(workbook, `attendance_data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const paginatedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const columns = [
    { key: 'nama', header: 'Nama' },
    { key: 'tanggal_absensi', header: 'Tanggal' },
    { key: 'jam_absensi', header: 'Jam' },
    { key: 'tipe_absensi', header: 'Tipe' },
    { key: 'jabatan', header: 'Jabatan' },
    { key: 'verifikasi', header: 'Verifikasi' },
  ] as const;

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <div className="w-full md:w-40">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field"
              />
            </div>
            <Button onClick={handleExport} variant="secondary">
              <Download size={14} className="mr-1.5" />
              Export
            </Button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Showing {filteredData.length} of {data.length} records
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-6 text-center text-sm text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                        {row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredData.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredData.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}