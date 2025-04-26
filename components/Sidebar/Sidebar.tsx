'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
import styles from './Sidebar.module.css';
import { useAuth } from '../../context/AuthContext'; // Adjust path
import { useNotificationContext } from '../../context/NotificationContext'; // Import the context hook
// --- Предполагаемый импорт для уведомлений ---
// import { useNotificationContext } from '../../context/NotificationContext'; // Example

// Define props interface
interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname(); // Get current pathname
  // Consume the context
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { hasNewPaths } = useNotificationContext();

  // <<<--- ADD THIS LOG --- >>>
  console.log('[Sidebar] Rendering - hasNewPaths:', hasNewPaths, 'isCollapsed:', isCollapsed);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout(); // Use logout from context
  };

  // Determine display name
  const userName = user?.full_name || user?.username || null;
  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  // Helper function to get class names
  const getNavItemClass = (href: string) => {
    // Trim the result to avoid trailing spaces when not active
    return `${styles.navItem} ${pathname === href ? styles.active : ''}`.trim();
  };

  return (
    // Apply collapsed class conditionally
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* 
      <div className={styles.profileSection}>
        <div className={styles.avatar} title={!isCollapsed ? (userName || 'User') : undefined}>
          {userInitial}
        </div>
        {!isCollapsed && (
          <h2>{isLoading ? 'Loading...' : (userName || 'Home page')}</h2>
        )}
      </div>
      */}

      {/* --- Toggle Button (Moved Here) --- */}
      <button onClick={toggleSidebar} className={styles.toggleButton} title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
        {/* Use a static menu icon */}
        <span className={styles.navIcon}>☰</span>
      </button>

      <nav className={styles.navigation}>
        {/* Apply active class conditionally using the helper function */}
        <Link href="/" className={getNavItemClass('/')} title={isCollapsed ? 'Explore' : undefined}>
          <span className={styles.navIcon}>🧭</span>
          {!isCollapsed && <span className={styles.navText}>Explore</span>}
        </Link>
        {/* <Link href="/chat" className={getNavItemClass('/chat')} title={isCollapsed ? 'AI Chat Path' : undefined}>
          <span className={styles.navIcon}>💬</span>
          {!isCollapsed && <span className={styles.navText}>AI Chat Path</span>}
        </Link> */}
        <Link href="/my-paths" className={getNavItemClass('/my-paths')} title={isCollapsed ? 'My Paths' : undefined}>
          <span className={styles.navIcon}>🏴󠁫󠁩󠁬󠁿</span>
          {!isCollapsed && <span className={styles.navText}>My Paths</span>}
          {/* Show dot if hasNewPaths is true and sidebar is not collapsed */}
          {hasNewPaths && !isCollapsed && <span className={styles.notificationDot}></span>}
          {/* Optional: Show dot even when collapsed (needs separate styling) */}
          {/* {hasNewPaths && isCollapsed && <span className={`${styles.notificationDot} ${styles.notificationDotCollapsed}`}></span>} */}
        </Link>
        {/* <Link href="/notebook" className={styles.navItem} title={isCollapsed ? 'Notebook' : undefined}>
          <span className={styles.navIcon}>📓</span>
          {!isCollapsed && <span className={styles.navText}>Notebook</span>}
        </Link>
        <Link href="/courses" className={styles.navItem} title={isCollapsed ? 'Course' : undefined}>
          <span className={styles.navIcon}>🎓</span>
          {!isCollapsed && <span className={styles.navText}>Course</span>}
        </Link> */}
        <Link href="/knowledge-map" className={getNavItemClass('/knowledge-map')} title={isCollapsed ? 'Knowledge Map' : undefined}>
          <span className={styles.navIcon}>⛯</span>
          {!isCollapsed && <span className={styles.navText}>Knowledge Map</span>}
        </Link>
        <Link href="/dashboard" className={getNavItemClass('/dashboard')} title={isCollapsed ? 'Dashboard' : undefined}>
          <span className={styles.navIcon}>🏠</span>
          {!isCollapsed && <span className={styles.navText}>Dashboard</span>}
        </Link>
        

        {/* --- Auth Links --- */}
        {!isLoading && ( // Only render auth links after initial load check
          isAuthenticated ? (
            <a href="#" onClick={handleLogout} className={styles.navItem} title={isCollapsed ? 'Logout' : undefined}>
              <span className={styles.navIcon}>🚪</span>
              {!isCollapsed && <span className={styles.navText}>Logout</span>}
            </a>
          ) : (
            <Link href="/login" className={getNavItemClass('/login')} title={isCollapsed ? 'Login' : undefined}>
              <span className={styles.navIcon}>🔑</span>
              {!isCollapsed && <span className={styles.navText}>Login</span>}
            </Link>
          )
        )}
      </nav>
    </div>
  );
} 