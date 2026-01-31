"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import { AlertCircle } from "lucide-react";
import { readSheet, writeSheet } from "@/lib/sheets";

interface UserPermission {
  id: string;
  name: string;
  username: string;
  role: string;
  dashboard: boolean;
  attendance: boolean;
  registration_request: boolean;
  setting: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session?.user.permissions.setting) {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      const rows = await readSheet("users");

      if (rows && rows.length > 1) {
        const usersData: UserPermission[] = rows.slice(1).map((row) => ({
          id: row[0] || "",
          name: row[1] || "",
          username: row[2] || "",
          role: row[4] || "",
          dashboard: row[5] === "TRUE" || row[5] === true,
          attendance: row[6] === "TRUE" || row[6] === true,
          registration_request: row[7] === "TRUE" || row[7] === true,
          setting: row[8] === "TRUE" || row[8] === true,
        }));
        setUsers(usersData);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (
    userId: string,
    permission: keyof Omit<UserPermission, "id" | "name" | "username" | "role">,
    value: boolean,
  ) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, [permission]: value } : user,
      ),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const rows = await readSheet("users");

      if (rows && rows.length > 1) {
        // Update each user row
        for (let i = 1; i < rows.length; i++) {
          const userId = rows[i][0];
          const user = users.find((u) => u.id === userId);

          if (user) {
            rows[i][5] = user.dashboard ? "TRUE" : "FALSE";
            rows[i][6] = user.attendance ? "TRUE" : "FALSE";
            rows[i][7] = user.registration_request ? "TRUE" : "FALSE";
            rows[i][8] = user.setting ? "TRUE" : "FALSE";
          }
        }

        // Write back to sheet
        await writeSheet("users", `A2:I${rows.length}`, rows.slice(1));

        alert("Permissions updated successfully!");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      alert("Failed to update permissions. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return <Loading fullScreen />;
  }

  if (!session) {
    redirect("/login");
  }

  if (!session.user.permissions.setting) {
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
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="mx-auto text-red-500 mb-3" size={40} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const permissions = [
    { key: "dashboard" as const, label: "Dashboard" },
    { key: "attendance" as const, label: "Attendance" },
    { key: "registration_request" as const, label: "Registration" },
    { key: "setting" as const, label: "Settings" },
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
              Settings
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage user access permissions
            </p>
          </div>
          <Button onClick={handleSave} variant="primary" isLoading={isSaving}>
            Save Changes
          </Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  {permissions.map((perm) => (
                    <th
                      key={perm.key}
                      className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {perm.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        {user.role}
                      </span>
                    </td>
                    {permissions.map((perm) => (
                      <td
                        key={perm.key}
                        className="px-4 py-3 whitespace-nowrap text-center"
                      >
                        <input
                          type="checkbox"
                          checked={user[perm.key]}
                          onChange={(e) =>
                            handlePermissionChange(
                              user.id,
                              perm.key,
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex">
            <AlertCircle
              className="text-yellow-600 dark:text-yellow-400 flex-shrink-0"
              size={18}
            />
            <div className="ml-2">
              <h3 className="text-xs font-medium text-yellow-800 dark:text-yellow-400">
                Important Note
              </h3>
              <div className="mt-1 text-xs text-yellow-700 dark:text-yellow-500">
                <p>
                  Changes to permissions will take effect on the user's next
                  login. Be careful when modifying permissions for admin users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
