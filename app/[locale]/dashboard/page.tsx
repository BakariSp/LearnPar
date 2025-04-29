'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, isLoading, logout: contextLogout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;
  const { t } = useTranslation('common');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [isLoading, user, router, locale]);

  const handleLogout = () => {
    contextLogout();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>{t('dashboard.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1>{t('dashboard.welcome')}</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          {t('sidebar.logout')}
        </button>
      </div>

      <div className={styles.userInfoCard}>
        <div className={styles.userProfile}>
          {user.profile_picture ? (
            <img 
              src={user.profile_picture} 
              alt={user.username} 
              className={styles.profilePicture} 
            />
          ) : (
            <div className={styles.profilePlaceholder}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.userDetails}>
            <h2>{user.full_name || user.username}</h2>
            <p className={styles.userEmail}>{user.email}</p>
            {user.oauth_provider && (
              <span className={styles.oauthBadge}>
                {user.oauth_provider}
              </span>
            )}
          </div>
        </div>

        <div className={styles.accountInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.username')}</span>
            <span className={styles.infoValue}>{user.username}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.account_id')}</span>
            <span className={styles.infoValue}>{user.id}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.account_status')}</span>
            <span className={`${styles.infoValue} ${user.is_active ? styles.activeStatus : styles.inactiveStatus}`}>
              {user.is_active ? t('dashboard.active') : t('dashboard.inactive')}
            </span>
          </div>
          {user.created_at && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('dashboard.member_since')}</span>
              <span className={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.dashboardContent}>
        <div className={styles.dashboardCard}>
          <h3>{t('dashboard.recent_activity')}</h3>
          <p className={styles.emptyState}>{t('dashboard.no_activity')}</p>
        </div>

        <div className={styles.dashboardCard}>
          <h3>{t('dashboard.your_courses')}</h3>
          <p className={styles.emptyState}>{t('dashboard.no_courses')}</p>
          <button className={styles.actionButton}>{t('dashboard.browse_courses')}</button>
        </div>

        <div className={styles.dashboardCard}>
          <h3>{t('dashboard.learning_progress')}</h3>
          <p className={styles.emptyState}>{t('dashboard.no_progress')}</p>
        </div>
      </div>
    </div>
  );
}
