'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaChartPie, FaUserTie, FaDollarSign, FaChartLine, FaTaxi,
  FaCloudSunRain, FaBalanceScale, FaHistory, FaRoute, FaPlane,
  FaTachometerAlt, FaCalculator, FaSlidersH, FaServer, FaCity
} from 'react-icons/fa';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/',             icon: <FaChartPie />,       label: 'Overview'        },
  { href: '/executive',    icon: <FaUserTie />,        label: 'CEO Center'     },
  { href: '/revenue',      icon: <FaDollarSign />,     label: 'Revenue'         },
  { href: '/demand',       icon: <FaChartLine />,      label: 'Demand'          },
  { href: '/market-share', icon: <FaTaxi />,           label: 'Market Share'  },
  { href: '/weather',      icon: <FaCloudSunRain />,   label: 'Weather Impact'  },
  { href: '/equity',       icon: <FaBalanceScale />,   label: 'Transit Equity'  },
  { href: '/history',      icon: <FaHistory />,        label: '5-Year History'  },
  { href: '/routes',       icon: <FaRoute />,          label: 'Route Corridors' },
  { href: '/airports',     icon: <FaPlane />,          label: 'Airport Hubs'    },
  { href: '/congestion',   icon: <FaTachometerAlt />,  label: 'Traffic Speed'   },
  { href: '/economics',    icon: <FaCalculator />,     label: 'Unit Economics'  },
  { href: '/simulator',    icon: <FaSlidersH />,       label: 'Simulator'       },
  { href: '/technical',    icon: <FaServer />,         label: 'Technical'       },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}><FaCity /></span>
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
        <div className={styles.footerText}>NYC TLC Telemetry</div>
        <div className={styles.footerText}>2019–2023 Multi-Year</div>
      </div>
    </nav>
  );
}
