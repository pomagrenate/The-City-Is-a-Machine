'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/',           icon: '◈', label: 'Overview'        },
  { href: '/executive',  icon: '⚡', label: 'CEO Center'     },
  { href: '/revenue',    icon: '◎', label: 'Revenue'         },
  { href: '/demand',     icon: '◌', label: 'Demand'          },
  { href: '/market-share', icon: '◰', label: 'Market Share'  },
  { href: '/weather',    icon: '🌧', label: 'Weather Impact'  },
  { href: '/equity',     icon: '◫', label: 'Transit Equity'  },
  { href: '/history',    icon: '⏳', label: '5-Year History'  },
  { href: '/routes',     icon: '⇄', label: 'Route Corridors' },
  { href: '/airports',   icon: '✈', label: 'Airport Hubs'    },
  { href: '/congestion', icon: '⚡', label: 'Traffic Speed'   },
  { href: '/economics',  icon: '◇', label: 'Unit Economics'  },
  { href: '/simulator',  icon: '◆', label: 'Simulator'       },
  { href: '/technical',  icon: '◉', label: 'Technical'       },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>⬡</span>
        <div>
          <div className={styles.logoTitle}>The City</div>
          <div className={styles.logoSub}>Is a Machine</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Analytics</div>
        {NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerLabel}>Data Source</div>
        <div className={styles.footerText}>NYC TLC Yellow Taxi 2023</div>
        <div className={styles.footerText}>~37M trips</div>
      </div>
    </nav>
  );
}
