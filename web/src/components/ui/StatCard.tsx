// src/components/ui/StatCard.tsx
import React from 'react';
import styles from './StatCard.module.css';

interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: string; // CSS color
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, sub, accent = 'var(--color-blue)', icon }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.accent} style={{ background: accent }} />
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}
