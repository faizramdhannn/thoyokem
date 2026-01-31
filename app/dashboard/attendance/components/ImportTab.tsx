'use client';

import { useState, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        setFile(selectedFile);
        setUploadStatus({ type: null, message: '' });
      } else {
        setUploadStatus({ type: 'error', message: 'Please select a valid CSV or Excel file' });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const data = await parseFile(file);

      if (!data || data.length === 0) {
        setUploadStatus({
          type: 'error',
          message: 'No data found in file',
        });
        setIsUploading(false);
        return;
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to import data');
      }

      const result = await response.json();
      setUploadStatus({
        type: 'success',
        message: `Successfully imported ${result.count} attendance records`,
      });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Failed to import data. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const mappedData = jsonData.map((row: any) => ({
            cloud_id: row['Cloud ID'] || '',
            id: row['ID'] || '',
            nama: row['Nama'] || '',
            tanggal_absensi: row['Tanggal Absensi'] || '',
            jam_absensi: row['Jam Absensi'] || '',
            verifikasi: row['Verifikasi'] || '',
            tipe_absensi: row['Tipe Absensi'] || '',
            jabatan: row['Jabatan'] || '',
            kantor: row['Kantor'] || '',
          }));

          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  return (
    <div className="space-y-4">
      <Card title="Import Attendance Data">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto text-gray-400 mb-3" size={40} />
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
                Upload File
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Select a CSV or Excel file with attendance data
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="inline-flex items-center justify-center px-3 py-1.5 text-xs rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-400">
                  <FileText size={14} className="mr-2" />
                  Choose File
                </span>
              </label>
            </div>
          </div>

          {file && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="text-primary" size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleUpload}
                  variant="primary"
                  isLoading={isUploading}
                >
                  Import
                </Button>
              </div>
            </div>
          )}

          {uploadStatus.type && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                uploadStatus.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
              ) : (
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
              )}
              <p
                className={`text-xs ${
                  uploadStatus.type === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {uploadStatus.message}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}