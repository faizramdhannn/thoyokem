'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Loading from '@/components/ui/Loading';

// Persistent shell for every /dashboard/* route — Sidebar + Topbar mount ONCE here and
// stay mounted across navigations between pages, instead of every page.tsx building its
// own <DashboardLayout> and remounting the whole sidebar (which caused the collapse-state
// flash + status-dot reset + visible "flicker" on every navigation this replaces).
export default function DashboardSectionLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status !== 'loading' && !session) redirect('/login');
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }
  if (!session) return null;

  const layoutUser = {
    id: session.user.id,
    username: session.user.email || '',
    name: session.user.name ?? '',
    role: session.user.role,
    permissions: session.user.permissions,
  };

  return <DashboardLayout user={layoutUser}>{children}</DashboardLayout>;
}
