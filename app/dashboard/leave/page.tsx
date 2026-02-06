"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Loading from "@/components/ui/Loading";
import { LeaveAttendance, StaffList } from "@/types";
import { Plus, Calendar, Edit, Trash2, Upload, FileText } from "lucide-react";

export default function LeavePage() {
  const { data: session, status } = useSession();
  const [leaves, setLeaves] = useState<LeaveAttendance[]>([]);
  const [staff, setStaff] = useState<StaffList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveAttendance | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    staff_id: "",
    date_from: "",
    date_end: "",
    category: "sick",
    link_url: "",
  });

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [leavesRes, staffRes] = await Promise.all([
        fetch("/api/leave"),
        fetch("/api/staff"),
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
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const uploadFile = async (): Promise<string> => {
    if (!uploadedFile) return "";

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
      return "";
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Upload file if exists
    let fileUrl = formData.link_url;
    if (uploadedFile) {
      fileUrl = await uploadFile();
      if (!fileUrl) return; // Upload failed
    }

    if (editingLeave) {
      // Update existing leave
      try {
        const response = await fetch("/api/leave", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingLeave.id,
            date_from: formData.date_from,
            date_end: formData.date_end,
            category: formData.category,
            link_url: fileUrl,
          }),
        });

        if (response.ok) {
          resetForm();
          fetchData();
        }
      } catch (error) {
        console.error("Error updating leave:", error);
      }
    } else {
      // Create new leave
      const selectedStaff = staff.find((s) => s.id === formData.staff_id);
      if (!selectedStaff) return;

      try {
        const response = await fetch("/api/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registration_id: selectedStaff.registration_id,
            name: selectedStaff.name,
            date_from: formData.date_from,
            date_end: formData.date_end,
            category: formData.category,
            link_url: fileUrl,
          }),
        });

        if (response.ok) {
          resetForm();
          fetchData();
        }
      } catch (error) {
        console.error("Error creating leave:", error);
      }
    }
  };

  const handleEdit = (leave: LeaveAttendance) => {
    setEditingLeave(leave);
    setFormData({
      staff_id: "",
      date_from: leave.date_from,
      date_end: leave.date_end,
      category: leave.category,
      link_url: leave.link_url,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leave request?")) return;

    try {
      const response = await fetch(`/api/leave?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting leave:", error);
    }
  };

  const resetForm = () => {
    setIsModalOpen(false);
    setEditingLeave(null);
    setUploadedFile(null);
    setFormData({
      staff_id: "",
      date_from: "",
      date_end: "",
      category: "sick",
      link_url: "",
    });
  };

  // Redirect if not logged in
  if (status !== "loading" && !session) {
    redirect("/login");
  }

  // Show loading for session check
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const columns = [
    { header: "Name", accessor: "name" as keyof LeaveAttendance },
    { header: "Date From", accessor: "date_from" as keyof LeaveAttendance },
    { header: "Date To", accessor: "date_end" as keyof LeaveAttendance },
    {
      header: "Category",
      accessor: (row: LeaveAttendance) => (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {row.category}
        </span>
      ),
    },
    {
      header: "Document",
      accessor: (row: LeaveAttendance) =>
        row.link_url ? (
          <a
            href={row.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs inline-flex items-center gap-1"
          >
            <FileText size={12} />
            View
          </a>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        ),
    },
    {
      header: "Created",
      accessor: (row: LeaveAttendance) =>
        new Date(row.created_at).toLocaleDateString(),
    },
    {
      header: "Actions",
      accessor: (row: LeaveAttendance) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-800 dark:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      user={{
        id: session.user.id,
        username: session.user.email || "",
        name: session.user.name ?? "",
        role: session.user.role,
        permissions: session.user.permissions,
      }}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Leave Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage employee leave requests
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Add Leave
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <Loading size="lg" />
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Loading leave data...
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <Table data={leaves} columns={columns} />
          </Card>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={resetForm}
          title={editingLeave ? "Edit Leave Request" : "Add Leave Request"}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            {!editingLeave && (
              <div>
                <label className="label-field">Employee</label>
                <select
                  value={formData.staff_id}
                  onChange={(e) =>
                    setFormData({ ...formData, staff_id: e.target.value })
                  }
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
            )}

            {editingLeave && (
              <div>
                <label className="label-field">Employee</label>
                <input
                  type="text"
                  value={editingLeave.name}
                  className="input-field bg-gray-100 dark:bg-gray-700"
                  disabled
                />
              </div>
            )}

            <div>
              <label className="label-field">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="input-field"
                required
              >
                <option value="sick">Sick Leave</option>
                <option value="annual">Annual Leave</option>
                <option value="personal">Personal Leave</option>
                <option value="emergency">Emergency Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">From Date</label>
                <input
                  type="date"
                  value={formData.date_from}
                  onChange={(e) =>
                    setFormData({ ...formData, date_from: e.target.value })
                  }
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="label-field">To Date</label>
                <input
                  type="date"
                  value={formData.date_end}
                  onChange={(e) =>
                    setFormData({ ...formData, date_end: e.target.value })
                  }
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-field">Document Upload</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="text-gray-400 mb-2" size={32} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {uploadedFile
                      ? uploadedFile.name
                      : "Click to upload document"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX, JPG, PNG
                  </span>
                </label>
              </div>
              {formData.link_url && !uploadedFile && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Current: <a href={formData.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View Document</a>
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isUploading}
              >
                <Calendar size={14} className="mr-1.5" />
                {editingLeave ? "Update" : "Add"} Leave
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}