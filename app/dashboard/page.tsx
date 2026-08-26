import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth';
import DashboardContent from "./DashboardContent";
import { AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!session.user.permissions.dashboard) {
    return (
      
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
      
    );
  }

  return (
    
      <DashboardContent userName={session.user.name ?? ""} permissions={session.user.permissions} />
    
  );
}