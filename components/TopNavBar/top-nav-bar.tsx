'use client';

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext'; // Adjust path as necessary
import styles from '../../app/landing-page/landing-page.module.css'; // Import styles

export function TopNavBar() {
  const { user } = useAuth();

  return (
    <nav className={styles.navbar}>
      {/* Left side: Logo/Brand */}
      <Link href={user ? "/dashboard" : "/"} className={styles.navbarBrand}>
        Zero AI
      </Link>

      {/* Right side: Login/User Info Button */}
      <div className={styles.navbarActions}>
        {user ? (
          <Link href="/dashboard" className="flex items-center text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            {/* User Initial Icon Only */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px', // Adjust size as needed
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-accent, #f59e0b)', // Use accent color or fallback
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.875rem'
              }}
            >
              {user.email ? user.email[0].toUpperCase() : '?'}
            </span>
            {/* Removed user email span */}
          </Link>
        ) : (
          <Link
            href="/login"
            className={styles.loginButton} // Apply styles directly to Link
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
