'use client';
import { useTranslation } from 'react-i18next'; 
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation'; // Import usePathname
import styles from './Sidebar.module.css';
import { useAuth } from '../../context/AuthContext'; // Adjust path
import { useNotificationContext } from '../../context/NotificationContext'; // Import the context hook
import { useTheme } from '../../context/ThemeContext'; // Import useTheme
import { useState } from 'react';
import { ProductInfoPopup } from '../ProductInfoPopup/ProductInfoPopup';
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
  const { theme, toggleTheme } = useTheme(); // Get theme and toggle function
  const [isProductInfoOpen, setIsProductInfoOpen] = useState(false);

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

  // Feedback form URL
  const feedbackFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSezgdVX2_oQa9TNUEnXd7TVUhlc5lgYNXWDr7vEhMv00Z_fdg/viewform?usp=header";

  return (
    <>
      <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarContent}>
          {/* Logo */}
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <div className={styles.logoCircle}></div>
              </div>
              <span className={styles.logoText}>Zero AI</span>
            </div>
          </div>
          
          {/* Toggle button */}
          <div className={styles.toggleButtonContainer}>
            <button onClick={toggleSidebar} className={styles.toggleButton} aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}>
              <div className={styles.windowIconWrapper}>
                <div className={styles.fixedSizeIcon}>
                  <Image 
                    src={isCollapsed ?  "/sidebar_collasp.svg" : "/sidebar_expend.svg"} 
                    alt={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} 
                    width={24} 
                    height={24}
                    className={styles.sidebarIcon}
                  />
                </div>
              </div>
            </button>
          </div>

          {/* Main navigation */}
          <nav className={styles.navigation}>
            <Link href={`/${locale}`} className={getNavItemClass(`/${locale}`)} title={isCollapsed ? t('sidebar.explore') : undefined}>
              <Image src="/explore.svg" alt="Explore" width={24} height={24} />
              <span className={styles.navText}>Explore</span>
            </Link>
            {/* <Link href="/chat" className={getNavItemClass('/chat')} title={isCollapsed ? 'AI Chat Path' : undefined}>
              <span className={styles.navIcon}>💬</span>
              {!isCollapsed && <span className={styles.navText}>AI Chat Path</span>}
            </Link> */}
            <Link href={`/${locale}/my-paths`} className={getNavItemClass(`/${locale}/my-paths`)} title={isCollapsed ? t('sidebar.my_paths') : undefined}>
              <Image src="/my_path.svg" alt="My path" width={24} height={24} />
              <span className={styles.navText}>My Paths</span>
              {/* Show dot if hasNewPaths is true and sidebar is not collapsed */}
              {hasNewPaths && <span className={styles.notificationDot}></span>}
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
              <Image src="/knowledge_map.svg" alt="Knowledge map" width={24} height={24} />
              <span className={styles.navText}>Knowledge Map</span>
            </Link>
            <Link href={`/${locale}/calendar`} className={getNavItemClass(`/${locale}/calendar`)} title={isCollapsed ? t('sidebar.calendar') : undefined}>
              <Image src="/calendar.svg" alt="Calendar" width={24} height={24} />
              <span className={styles.navText}>Study Calendar</span>
            </Link>
            
            {/* Utils section - grouped items with separator */}
            <div className={styles.utilsSection}>
              {/* Product Info Button */}
              <button
                onClick={() => setIsProductInfoOpen(true)}
                className={`${styles.navItem} ${styles.productInfoButton}`}
                title={isCollapsed ? "Product Information" : undefined}
              >
                <div className={styles.fixedSizeIcon}>
                  <Image 
                    src="/product-info.svg"
                    alt="Product Information" 
                    width={24} 
                    height={24}
                    className={styles.sidebarIcon}
                  />
                </div>
                <span className={styles.navText}>Product Info</span>
              </button>
              
              {/* Feedback button */}
              <a 
                href={feedbackFormUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.navItem} 
                title={isCollapsed ? t('sidebar.feedback') : undefined}
              >
                <Image src="/form.png" alt="Feedback" width={24} height={24} />
                <span className={styles.navText}>Feedback</span>
              </a>
            </div>
          </nav>

          {/* Admin section at the bottom */}
          <div className={styles.adminSection}>
            <Link 
              href={`/${locale}/dashboard`} 
              className={`${styles.adminProfile} ${pathname === `/${locale}/dashboard` ? styles.active : ''}`} 
              title={isCollapsed ? t('sidebar.dashboard') : undefined}
            >
              <div className={styles.adminAvatar}>{userInitial}</div>
              <div className={styles.adminInfo}>
                <div className={styles.adminTitle}>{userName || 'Unknown'}</div>
                <div className={styles.adminEmail}>{user?.email || 'Unknown'}</div>
              </div>
              {!isCollapsed && <div className={styles.adminStatus}></div>}
            </Link>
            
            <button onClick={handleLogout} className={styles.logoutButton}>
              <Image 
                src="/logout-icon.svg" 
                alt="Log Out" 
                width={24} 
                height={24}
                className={styles.logoutIcon} 
              />
              {!isCollapsed && <span className={styles.logoutText}>{t('sidebar.logout')}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Product Info Popup */}
      <ProductInfoPopup 
        isOpen={isProductInfoOpen} 
        onClose={() => setIsProductInfoOpen(false)} 
      />
    </>
  );
}