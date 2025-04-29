'use client';
import { useTranslation } from 'react-i18next'; 
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
  locale: string;
}

export function Sidebar({ isCollapsed, toggleSidebar, locale }: SidebarProps) {
  const { t } = useTranslation('common');
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
        <Link href={`/${locale}`} className={getNavItemClass(`/${locale}`)} title={isCollapsed ? t('sidebar.explore') : undefined}>
          <span className={styles.navIcon}>🧭</span>
          {!isCollapsed && <span className={styles.navText}>{t('sidebar.explore')}</span>}
        </Link>
        {/* <Link href="/chat" className={getNavItemClass('/chat')} title={isCollapsed ? 'AI Chat Path' : undefined}>
          <span className={styles.navIcon}>💬</span>
          {!isCollapsed && <span className={styles.navText}>AI Chat Path</span>}
        </Link> */}
        <Link href={`/${locale}/my-paths`} className={getNavItemClass(`/${locale}/my-paths`)} title={isCollapsed ? t('sidebar.my_paths') : undefined}>
        <span className={styles.navIcon}>🏴</span>
          {!isCollapsed && <span className={styles.navText}>{t('sidebar.my_paths')}</span>}
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
        <Link href={`/${locale}/knowledge-map`} className={getNavItemClass(`/${locale}/knowledge-map`)} title={isCollapsed ? t('sidebar.knowledge_map') : undefined}>
          <span className={styles.navIcon}>⛯</span>
          {!isCollapsed && <span className={styles.navText}>{t('sidebar.knowledge_map')}</span>}
        </Link>
        <Link href={`/${locale}/dashboard`} className={getNavItemClass(`/${locale}/dashboard`)} title={isCollapsed ? t('sidebar.dashboard') : undefined}>
          <span className={styles.navIcon}>🏠</span>
          {!isCollapsed && <span className={styles.navText}>{t('sidebar.dashboard')}</span>}
        </Link>
        

        {/* --- Auth Links --- */}
        {!isLoading && ( // Only render auth links after initial load check
          isAuthenticated ? (
            <a href="#" onClick={handleLogout} className={styles.navItem} title={isCollapsed ? t('sidebar.logout') : undefined}>
              <span className={styles.navIcon}>🚪</span>
              {!isCollapsed && <span className={styles.navText}>{t('sidebar.logout')}</span>}
            </a>
          ) : (
            <Link href={`/${locale}/login`} className={getNavItemClass(`/${locale}/login`)} title={isCollapsed ? t('sidebar.login') : undefined}>
              <span className={styles.navIcon}>🔑</span>
              {!isCollapsed && <span className={styles.navText}>{t('sidebar.login')}</span>}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}