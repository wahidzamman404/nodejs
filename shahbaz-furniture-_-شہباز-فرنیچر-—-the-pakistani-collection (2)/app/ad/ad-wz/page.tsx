import type { Metadata } from 'next';
import AdminPanel from '@/components/AdminPanel';

export const metadata: Metadata = {
  title: 'Admin Login',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminWzPage() {
  return <AdminPanel />;
}
