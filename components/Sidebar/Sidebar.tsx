'use client';

import Link from 'next/link';
import styles from './Sidebar.module.css';
import { useEffect, useState } from 'react';
import { isAuthenticated, logout } from '../../services/auth';

export function Sidebar() {
  const [authenticated, setAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check authentication status on client side
    setAuthenticated(isAuthenticated());
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.profileSection}>
        <div className={styles.avatar}></div>
        <h2>Home page</h2>
      </div>
      <nav className={styles.navigation}>
        <Link href="./" className={styles.navItem}>
          <span className={styles.navIcon}>🧭</span> Explore
        </Link>
        <Link href="./notebook" className={styles.navItem}>
          <span className={styles.navIcon}>📓</span> Notebook
        </Link>
        <Link href="./courses" className={styles.navItem}>
          <span className={styles.navIcon}>🎓</span> Course
        </Link>
        <Link href="./knowledge-map" className={styles.navItem}>
          <span className={styles.navIcon}>🌐</span> Knowledge Map
        </Link>
        <Link href="./updates" className={styles.navItem}>
          <span className={styles.navIcon}>🔔</span> Updates
        </Link>
        
        {authenticated ? (
          <a href="#" onClick={handleLogout} className={styles.navItem}>
            <span className={styles.navIcon}>🚪</span> Logout
          </a>
        ) : (
          <Link href="./login" className={styles.navItem}>
            <span className={styles.navIcon}>🔑</span> Login
          </Link>
        )}
      </nav>
    </div>
  );
} 