// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'The City Is a Machine',
  description: 'Millions of trips. One very large dataset. A lot of questions about where the money goes.',
  keywords: ['NYC taxi', 'data analytics', 'urban mobility', 'big data', 'DuckDB', 'PySpark'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}

