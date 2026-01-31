'use client';

import { useState, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

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
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setUploadStatus({ type: null, message: '' });
    } else {
      setUploadStatus({ type: 'error', message: 'Please select a valid CSV file' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const data = results.data.map((row: any) => ({
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
        },
        error: (error) => {
          setUploadStatus({
            type: 'error',
            message: `Failed to parse CSV: ${error.message}`,
          });
          setIsUploading(false);
        },
      });
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Failed to read file. Please try again.',
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Import Attendance Data">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
            <div className="text-center">
              <Upload className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Upload CSV File
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Select a CSV file with attendance data to import
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="inline-flex items-center justify-center px-4 py-2 text-base rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-400">
                  <FileText size={18} className="mr-2" />
                  Choose File
                </span>
              </label>
            </div>
          </div>

          {file && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="text-primary" size={24} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
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
              className={`flex items-center gap-3 p-4 rounded-lg ${
                uploadStatus.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
              ) : (
                <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
              )}
              <p
                className={`text-sm ${
                  uploadStatus.type === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {uploadStatus.message}
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              CSV Format Requirements
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>Cloud ID, ID, Nama, Tanggal Absensi, Jam Absensi</li>
              <li>Verifikasi, Tipe Absensi, Jabatan, Kantor</li>
              <li>Date format: YYYY-MM-DD</li>
              <li>Time format: HH:MM</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
