'use client';

import { useTranslation } from 'react-i18next';
import { CalendarContainer } from '@/components/Calendar/CalendarContainer';
import styles from './Calendar.module.css';

export default function CalendarPage() {
  const { t } = useTranslation();
  
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('calendar.title', 'Study Calendar')}</h1>
          <p className={styles.description}>
            {t('calendar.description', 'Manage your study schedule and tasks')}
          </p>
        </div>
        
        <div className={styles.calendarBox}>
          <CalendarContainer />
        </div>
      </div>
    </div>
  );
}
