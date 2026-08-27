'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, usePathname } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Loading from '@/components/ui/Loading';

// Persistent shell for every /dashboard/* route — Sidebar + Topbar mount ONCE here and
// stay mounted across navigations between pages, instead of every page.tsx building its
// own <DashboardLayout> and remounting the whole sidebar (which caused the collapse-state
// flash + status-dot reset + visible "flicker" on every navigation this replaces).
export default function DashboardSectionLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Referentially stable across the ~60s background session refreshes (NextAuth's
  // refetchInterval + the idle-timeout keep-alive ping, both in AuthProvider.tsx) as
  // long as the underlying values haven't actually changed — those refreshes hand back
  // a brand-new `session` object even when nothing in it changed, which without this
  // memo would rebuild `layoutUser` every time and cascade a re-render through
  // DashboardLayout → Sidebar/Topbar for no visible reason.
  const layoutUser = useMemo(() => {
    if (!session) return null;
    return {
      id: session.user.id,
      username: session.user.email || '',
      name: session.user.name ?? '',
      role: session.user.role,
      permissions: session.user.permissions,
    };
  }, [session?.user.id, session?.user.email, session?.user.name, session?.user.role, session?.user.permissions]);

  // Print pages render their own bare, sidebar-free layout (DocumentPrintLayout) — they
  // never used <DashboardLayout> even before this shared layout existed, and each already
  // does its own session check. Every route under /dashboard/* would otherwise inherit
  // this file's Sidebar/Topbar, wrongly wrapping print views in the app chrome.
  if (pathname?.endsWith('/print')) return <>{children}</>;

  // Only block on a full-screen loader when there's truly no session yet (first load).
  // Gating on `status` alone here blanked out the ENTIRE page (Sidebar included) every
  // time a background refresh transiently flipped `status` back to 'loading' — that was
  // the periodic "flicker". Once we have a session, keep rendering it through any later
  // status wobble instead of discarding it for a loading spinner.
  if (status === 'loading' && !layoutUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }
  if (!layoutUser) {
    redirect('/login');
    return null;
  }

  return <DashboardLayout user={layoutUser}>{children}</DashboardLayout>;
}
