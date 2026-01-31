'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Loading from '@/components/ui/Loading';
import Button from '@/components/ui/Button';
import { AttendanceImport, AttendanceRecap } from '@/types';
import { processAttendanceData, calculateRecap, exportRecapToCSV } from '@/utils/attendance';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';

export default function RecapTab() {
  const [rawData, setRawData] = useState<AttendanceImport[]>([]);
  const [recapData, setRecapData] = useState<AttendanceRecap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (rawData.length > 0) {
      const processed = processAttendanceData(rawData);
      const recap = calculateRecap(processed);
      setRecapData(recap);
    }
  }, [rawData]);

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

  const handleExport = () => {
    const csv = exportRecapToCSV(recapData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_recap_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalLate = recapData.reduce((sum, r) => sum + r.jumlah_keterlambatan, 0);
  const totalOvertime = recapData.reduce((sum, r) => sum + r.jumlah_overtime, 0);
  const avgLateness = recapData.length > 0
    ? Math.round(
        recapData.reduce((sum, r) => sum + r.average_keterlambatan, 0) / recapData.length
      )
    : 0;
  const avgOvertime = recapData.length > 0
    ? Math.round(
        recapData.reduce((sum, r) => sum + r.average_overtime, 0) / recapData.length
      )
    : 0;

  const columns = [
    { header: 'Nama Karyawan', accessor: 'nama_karyawan' as keyof AttendanceRecap },
    {
      header: 'Keterlambatan',
      accessor: (row: AttendanceRecap) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-red-500" size={16} />
            <span className="font-medium">{row.jumlah_keterlambatan}x</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {row.total_keterlambatan_menit} min
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Avg: {row.average_keterlambatan} min
          </div>
        </div>
      ),
    },
    {
      header: 'Overtime',
      accessor: (row: AttendanceRecap) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-500" size={16} />
            <span className="font-medium">{row.jumlah_overtime}x</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {row.total_overtime_menit} min
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Avg: {row.average_overtime} min
          </div>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Late
              </p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {totalLate}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <TrendingDown className="text-red-500" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Lateness
              </p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {avgLateness} min
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <TrendingDown className="text-orange-500" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Overtime
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {totalOvertime}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <TrendingUp className="text-blue-500" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Overtime
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {avgOvertime} min
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Employee Summary
          </h3>
          <Button onClick={handleExport} variant="secondary">
            <Download size={18} className="mr-2" />
            Export Recap
          </Button>
        </div>
        <Table data={recapData} columns={columns} />
      </Card>
    </div>
  );
}
