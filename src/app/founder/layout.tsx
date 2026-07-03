import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import AdminLayoutClient from '@/components/AdminLayoutClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  const secret = process.env.ADMIN_PASSWORD || '';
  
  // Server-side authentication check
  const session = token ? await verifySession(token, secret) : null;
  const isAuthenticated = !!session;

  if (!isAuthenticated) {
    // If not authenticated, render children directly (allows login page to display)
    return <>{children}</>;
  }

  // If authenticated, render with the premium Admin Sidebar shell
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
