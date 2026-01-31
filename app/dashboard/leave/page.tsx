'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Loading from '@/components/ui/Loading';
import { LeaveAttendance, StaffList } from '@/types';
import { Plus, Calendar } from 'lucide-react';

export default function LeavePage() {
  const { data: session, status } = useSession();
  const [leaves, setLeaves] = useState<LeaveAttendance[]>([]);
  const [staff, setStaff] = useState<StaffList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    date_from: '',
    date_end: '',
    category: 'sick',
    link_url: '',
  });

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [leavesRes, staffRes] = await Promise.all([
        fetch('/api/leave'),
        fetch('/api/staff'),
      ]);

      if (leavesRes.ok) {
        const leavesData = await leavesRes.json();
        setLeaves(leavesData);
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(staffData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedStaff = staff.find((s) => s.id === formData.staff_id);
    if (!selectedStaff) return;

    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_id: selectedStaff.registration_id,
          name: selectedStaff.name,
          date_from: formData.date_from,
          date_end: formData.date_end,
          category: formData.category,
          link_url: formData.link_url,
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({
          staff_id: '',
          date_from: '',
          date_end: '',
          category: 'sick',
          link_url: '',
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating leave:', error);
    }
  };

  if (status === 'loading' || isLoading) {
    return <Loading fullScreen />;
  }

  if (!session) {
    redirect('/login');
  }

  const columns = [
    { header: 'Name', accessor: 'name' as keyof LeaveAttendance },
    { header: 'Date From', accessor: 'date_from' as keyof LeaveAttendance },
    { header: 'Date To', accessor: 'date_end' as keyof LeaveAttendance },
    {
      header: 'Category',
      accessor: (row: LeaveAttendance) => (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {row.category}
        </span>
      ),
    },
    {
      header: 'Link',
      accessor: (row: LeaveAttendance) =>
        row.link_url ? (
          <a
            href={row.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View
          </a>
        ) : (
          '-'
        ),
    },
    { header: 'Created', accessor: (row: LeaveAttendance) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <DashboardLayout user={session.user}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Leave Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage employee leave requests
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Add Leave
          </Button>
        </div>

        <Card>
          <Table data={leaves} columns={columns} />
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Leave Request"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">Employee</label>
              <select
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select employee</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
                required
              >
                <option value="sick">Sick Leave</option>
                <option value="annual">Annual Leave</option>
                <option value="personal">Personal Leave</option>
                <option value="emergency">Emergency Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">From Date</label>
                <input
                  type="date"
                  value={formData.date_from}
                  onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-field">To Date</label>
                <input
                  type="date"
                  value={formData.date_end}
                  onChange={(e) => setFormData({ ...formData, date_end: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-field">Link URL (Optional)</label>
              <input
                type="url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                className="input-field"
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <Calendar size={18} className="mr-2" />
                Add Leave
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
