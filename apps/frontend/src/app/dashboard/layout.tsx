import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getSession } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/auth/login');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}