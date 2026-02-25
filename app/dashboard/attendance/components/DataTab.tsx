'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Loading from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import { AttendanceImport } from '@/types';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DataTab() {
  const [data, setData] = useState<AttendanceImport[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
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

  const columns = [
    { header: 'Nama', accessor: 'nama' as keyof AttendanceImport },
    { header: 'Tanggal', accessor: 'tanggal_absensi' as keyof AttendanceImport },
    { header: 'Jam', accessor: 'jam_absensi' as keyof AttendanceImport },
    { header: 'Tipe', accessor: 'tipe_absensi' as keyof AttendanceImport },
    { header: 'Jabatan', accessor: 'jabatan' as keyof AttendanceImport },
    { header: 'Verifikasi', accessor: 'verifikasi' as keyof AttendanceImport },
  ];

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-3">
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
        <Table data={filteredData} columns={columns} />
      </Card>
    </div>
  );
}