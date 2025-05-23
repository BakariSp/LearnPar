'use client';
import { useTranslation } from 'react-i18next'; 
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation'; 
import styles from './Sidebar.module.css';
import { useAuth } from '../../context/AuthContext'; 
import { useNotificationContext } from '../../context/NotificationContext'; 
import { useTheme } from '../../context/ThemeContext'; 
import { useState } from 'react';
import { ProductInfoPopup } from '../ProductInfoPopup/ProductInfoPopup';


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
                    alt={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')} 
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
            <Link href={`/${locale}/home`} className={getNavItemClass(`/${locale}/home`)} title={isCollapsed ? t('sidebar.explore') : undefined}>
              <Image src="/explore.svg" alt={t('sidebar.explore')} width={24} height={24} />
              <span className={styles.navText}>{t('sidebar.explore')}</span>
            </Link>
            {/* <Link href="/chat" className={getNavItemClass('/chat')} title={isCollapsed ? 'AI Chat Path' : undefined}>
              <span className={styles.navIcon}>💬</span>
              {!isCollapsed && <span className={styles.navText}>AI Chat Path</span>}
            </Link> */}
            <Link href={`/${locale}/my-paths`} className={getNavItemClass(`/${locale}/my-paths`)} title={isCollapsed ? t('sidebar.my_paths') : undefined}>
              <Image src="/my_path.svg" alt={t('sidebar.my_paths')} width={24} height={24} />
              <span className={styles.navText}>{t('sidebar.my_paths')}</span>
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
              <Image src="/knowledge_map.svg" alt={t('sidebar.knowledge_map')} width={24} height={24} />
              <span className={styles.navText}>{t('sidebar.knowledge_map')}</span>
            </Link>
            <Link href={`/${locale}/calendar`} className={getNavItemClass(`/${locale}/calendar`)} title={isCollapsed ? t('sidebar.calendar') : undefined}>
              <Image src="/calendar.svg" alt={t('sidebar.calendar')} width={24} height={24} />
              <span className={styles.navText}>{t('sidebar.calendar')}</span>
            </Link>
            
            {/* Utils section - grouped items with separator */}
            <div className={styles.utilsSection}>
              {/* Product Info Button */}
              <button
                onClick={() => setIsProductInfoOpen(true)}
                className={`${styles.navItem} ${styles.productInfoButton}`}
                title={isCollapsed ? t('sidebar.product_info') : undefined}
              >
                <div className={styles.fixedSizeIcon}>
                  <Image 
                    src="/product-info.svg"
                    alt={t('sidebar.product_info')} 
                    width={24} 
                    height={24}
                    className={styles.sidebarIcon}
                  />
                </div>
                <span className={styles.navText}>{t('sidebar.product_info')}</span>
              </button>
              
              {/* Feedback button */}
              <a
                href={feedbackFormUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.navItem} 
                title={isCollapsed ? t('sidebar.feedback') : undefined}
              >
                <Image src="/form.png" alt={t('sidebar.feedback')} width={24} height={24} />
                <span className={styles.navText}>{t('sidebar.feedback')}</span>
              </a>
            </div>
          </nav>

          {/* Admin section at the bottom */}
          <div className={styles.adminSection}>
            {isAuthenticated ? (
              <Link 
                href={`/${locale}/dashboard`} 
                className={`${styles.adminProfile} ${pathname === `/${locale}/dashboard` ? styles.active : ''}`} 
                title={isCollapsed ? t('sidebar.dashboard') : undefined}
                onClick={(e) => {
                  // Add debug logging to track profile clicks
                  console.log('[Sidebar] Admin profile clicked - authenticated user', 
                    `userName: ${userName}`, 
                    `isAuthenticated: ${isAuthenticated}`);
                  
                  if (!isAuthenticated) {
                    e.preventDefault();
                    console.warn('[Sidebar] Prevented navigation - user not authenticated');
                  }
                }}
              >
                <div className={styles.adminAvatar}>{userInitial}</div>
                <div className={styles.adminInfo}>
                  <div className={styles.adminTitle}>{userName || t('sidebar.unknown')}</div>
                  <div className={styles.adminEmail}>{user?.email || t('sidebar.unknown')}</div>
                </div>
                {!isCollapsed && <div className={styles.adminStatus}></div>}
              </Link>
            ) : (
              <Link 
                href={`/${locale}/login`} 
                className={styles.adminProfile} 
                title={isCollapsed ? t('sidebar.login') : undefined}
              >
                <div className={styles.adminAvatar}>?</div>
                <div className={styles.adminInfo}>
                  <div className={styles.adminTitle}>{t('sidebar.login')}</div>
                  <div className={styles.adminEmail}>{t('sidebar.guest')}</div>
                </div>
                {!isCollapsed && <div className={styles.adminStatus}></div>}
              </Link>
            )}
            
            <button onClick={handleLogout} className={styles.logoutButton}>
              <Image 
                src="/logout-icon.svg" 
                alt={t('sidebar.logout')} 
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