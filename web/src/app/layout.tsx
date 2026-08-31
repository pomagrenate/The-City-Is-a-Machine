// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'The City Is a Machine',
  description: 'Millions of trips. One very large dataset. A lot of questions about where the money goes.',
  keywords: ['NYC taxi', 'data analytics', 'urban mobility', 'big data', 'DuckDB', 'PySpark'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-content">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
