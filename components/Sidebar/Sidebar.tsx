'use client';

import Link from 'next/link';
import styles from './Sidebar.module.css';
import { useAuth } from '../../context/AuthContext'; // Adjust path

// Define props interface
interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  // Consume the context
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout(); // Use logout from context
  };

  // Determine display name
  const userName = user?.full_name || user?.username || null;
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    // Apply collapsed class conditionally
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.profileSection}>
        <div className={styles.avatar} title={!isCollapsed ? (userName || 'User') : undefined}>
          {userInitial}
        </div>
        {/* Conditionally render profile name */}
        {!isCollapsed && (
          <h2>{isLoading ? 'Loading...' : (userName || 'Home page')}</h2>
        )}
      </div>

      {/* --- Toggle Button (Moved Here) --- */}
      <button onClick={toggleSidebar} className={styles.toggleButton} title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
        {/* Use a static menu icon */}
        <span className={styles.navIcon}>☰</span>
      </button>

      <nav className={styles.navigation}>
        {/* --- Navigation Links --- */}
        <Link href="/" className={styles.navItem} title={isCollapsed ? 'Explore' : undefined}>
          <span className={styles.navIcon}>🧭</span>
          {!isCollapsed && <span className={styles.navText}>Explore</span>}
        </Link>
        <Link href="/chat" className={styles.navItem} title={isCollapsed ? 'AI Chat Path' : undefined}>
          <span className={styles.navIcon}>💬</span>
          {!isCollapsed && <span className={styles.navText}>AI Chat Path</span>}
        </Link>
        <Link href="/my-paths" className={styles.navItem} title={isCollapsed ? 'My Paths' : undefined}>
          <span className={styles.navIcon}>📚</span>
          {!isCollapsed && <span className={styles.navText}>My Paths</span>}
        </Link>
        {/* <Link href="/notebook" className={styles.navItem} title={isCollapsed ? 'Notebook' : undefined}>
          <span className={styles.navIcon}>📓</span>
          {!isCollapsed && <span className={styles.navText}>Notebook</span>}
        </Link>
        <Link href="/courses" className={styles.navItem} title={isCollapsed ? 'Course' : undefined}>
          <span className={styles.navIcon}>🎓</span>
          {!isCollapsed && <span className={styles.navText}>Course</span>}
        </Link> */}
        <Link href="/knowledge-map" className={styles.navItem} title={isCollapsed ? 'Knowledge Map' : undefined}>
          <span className={styles.navIcon}>🌐</span>
          {!isCollapsed && <span className={styles.navText}>Knowledge Map</span>}
        </Link>
        <Link href="/updates" className={styles.navItem} title={isCollapsed ? 'Updates' : undefined}>
          <span className={styles.navIcon}>🔔</span>
          {!isCollapsed && <span className={styles.navText}>Updates</span>}
        </Link>
        

        {/* --- Auth Links --- */}
        {isAuthenticated ? (
          <a href="#" onClick={handleLogout} className={styles.navItem} title={isCollapsed ? 'Logout' : undefined}>
            <span className={styles.navIcon}>🚪</span>
            {!isCollapsed && <span className={styles.navText}>Logout</span>}
          </a>
        ) : (
          <Link href="/login" className={styles.navItem} title={isCollapsed ? 'Login' : undefined}>
            <span className={styles.navIcon}>🔑</span>
            {!isCollapsed && <span className={styles.navText}>Login</span>}
          </Link>
        )}
      </nav>
    </div>
  );
} 