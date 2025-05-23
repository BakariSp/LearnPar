'use client';

import { useEffect, useState } from 'react';
import { ZeroLandingPageContent, RecommendationsResponse } from './home-content';
import { useGuestAuth } from '@/hooks/useGuestAuth';
import styles from './home.module.css';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation('common');
  const isGuestReady = useGuestAuth();

  if (!isGuestReady) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>{t('Common.loading')}</p>
      </div>
    );
  }

  return <ZeroLandingPageContent />;
}