'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Loading from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import { AttendanceImport } from '@/types';
import { Search, Download } from 'lucide-react';

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
    const csv = [
      [
        'Cloud ID',
        'ID',
        'Nama',
        'Tanggal Absensi',
        'Jam Absensi',
        'Verifikasi',
        'Tipe Absensi',
        'Jabatan',
        'Kantor',
      ],
      ...filteredData.map((item) => [
        item.cloud_id,
        item.id,
        item.nama,
        item.tanggal_absensi,
        item.jam_absensi,
        item.verifikasi,
        item.tipe_absensi,
        item.jabatan,
        item.kantor,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { header: 'ID', accessor: 'id' as keyof AttendanceImport },
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
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by name or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field"
              />
            </div>
            <Button onClick={handleExport} variant="secondary">
              <Download size={18} className="mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
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
