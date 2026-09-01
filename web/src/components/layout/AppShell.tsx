// src/components/layout/AppShell.tsx
'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSimulator = pathname === '/simulator';

  if (isSimulator) {
    return (
      <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
        {children}
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
