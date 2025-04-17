'use client';

import Link from 'next/link';
import styles from './Sidebar.module.css';
import { useAuth } from '../../context/AuthContext'; // Adjust path

export function Sidebar() {
  // Consume the context
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout(); // Use logout from context
  };

  // Determine display name
  const userName = user?.full_name || user?.username || null;

  return (
    <div className={styles.sidebar}>
      <div className={styles.profileSection}>
        <div className={styles.avatar}>
          {/* Display initial based on context user */}
          {userName ? userName.charAt(0).toUpperCase() : ''}
        </div>
        {/* Use context state for display */}
        <h2>{isLoading ? 'Loading...' : (userName || 'Home page')}</h2>
      </div>
      <nav className={styles.navigation}>
        <Link href="/" className={styles.navItem}> {/* Ensure Explore link is absolute */}
          <span className={styles.navIcon}>🧭</span> Explore
        </Link>
        <Link href="/chat" className={styles.navItem}>
          <span className={styles.navIcon}>💬</span> AI Chat Path
        </Link>
        <Link href="/notebook" className={styles.navItem}> {/* Use absolute paths */}
          <span className={styles.navIcon}>📓</span> Notebook
        </Link>
        <Link href="/courses" className={styles.navItem}> {/* Use absolute paths */}
          <span className={styles.navIcon}>🎓</span> Course
        </Link>
        <Link href="/knowledge-map" className={styles.navItem}> {/* Use absolute paths */}
          <span className={styles.navIcon}>🌐</span> Knowledge Map
        </Link>
        <Link href="/updates" className={styles.navItem}> {/* Use absolute paths */}
          <span className={styles.navIcon}>🔔</span> Updates
        </Link>
        <Link href="/my-paths" className={styles.navItem}>
          <span className={styles.navIcon}>📚</span> My Paths
        </Link>

        {/* Use isAuthenticated from context */}
        {isAuthenticated ? (
          <a href="#" onClick={handleLogout} className={styles.navItem}>
            <span className={styles.navIcon}>🚪</span> Logout
          </a>
        ) : (
          <Link href="/login" className={styles.navItem}> {/* Use absolute paths */}
            <span className={styles.navIcon}>🔑</span> Login
          </Link>
        )}
      </nav>
    </div>
  );
} 