'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { user, isLoading, logout: contextLogout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const handleLogout = () => {
    contextLogout();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1>Welcome to Your Dashboard</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
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
            <span className={styles.infoLabel}>Username:</span>
            <span className={styles.infoValue}>{user.username}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Account ID:</span>
            <span className={styles.infoValue}>{user.id}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Account Status:</span>
            <span className={`${styles.infoValue} ${user.is_active ? styles.activeStatus : styles.inactiveStatus}`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {user.created_at && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Member Since:</span>
              <span className={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.dashboardContent}>
        <div className={styles.dashboardCard}>
          <h3>Recent Activity</h3>
          <p className={styles.emptyState}>No recent activity to display.</p>
        </div>
        
        <div className={styles.dashboardCard}>
          <h3>Your Courses</h3>
          <p className={styles.emptyState}>You haven't enrolled in any courses yet.</p>
          <button className={styles.actionButton}>Browse Courses</button>
        </div>
        
        <div className={styles.dashboardCard}>
          <h3>Learning Progress</h3>
          <p className={styles.emptyState}>Start a course to track your progress.</p>
        </div>
      </div>
    </div>
  );
} 