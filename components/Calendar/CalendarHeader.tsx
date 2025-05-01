'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import styles from './Calendar.module.css';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: 'timeline' | 'day' | 'week' | 'month';
  onDateChange: (date: Date) => void;
  onViewChange: (view: 'timeline' | 'day' | 'week' | 'month') => void;
}

export function CalendarHeader({ 
  currentDate, 
  viewMode, 
  onDateChange, 
  onViewChange 
}: CalendarHeaderProps) {
  const { t } = useTranslation();

  // Format the current date
  const formatDate = (date: Date, mode: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      year: 'numeric' 
    };
    
    if (mode === 'day') {
      options.day = 'numeric';
    }
    
    return date.toLocaleDateString(undefined, options);
  };
  
  // Navigate to the next period
  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(currentDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'timeline':
        newDate.setDate(currentDate.getDate() + 14);
        break;
    }
    
    onDateChange(newDate);
  };
  
  // Navigate to the previous period
  const handlePrevPeriod = () => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(currentDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() - 1);
        break;
      case 'timeline':
        newDate.setDate(currentDate.getDate() - 14);
        break;
    }
    
    onDateChange(newDate);
  };
  
  // Navigate to today
  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className={styles.calendarHeader}>
      <div className={styles.calendarControls}>
        <h2 className={styles.currentDateDisplay}>{formatDate(currentDate, viewMode)}</h2>
        <div className={styles.navigationButtons}>
          <button 
            onClick={handlePrevPeriod}
            className={styles.navButton}
            aria-label="Previous period"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={handleToday}
            className={styles.navButton}
          >
            Today
          </button>
          <button 
            onClick={handleNextPeriod}
            className={styles.navButton}
            aria-label="Next period"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className={styles.viewButtons}>
        <button
          onClick={() => onViewChange('day')}
          className={`${styles.viewButton} ${viewMode === 'day' ? styles.viewButtonActive : ''}`}
        >
          Day
        </button>
        <button
          onClick={() => onViewChange('week')}
          className={`${styles.viewButton} ${viewMode === 'week' ? styles.viewButtonActive : ''}`}
        >
          Week
        </button>
        <button
          onClick={() => onViewChange('month')}
          className={`${styles.viewButton} ${viewMode === 'month' ? styles.viewButtonActive : ''}`}
        >
          Month
        </button>
        <button
          onClick={() => onViewChange('timeline')}
          className={`${styles.viewButton} ${viewMode === 'timeline' ? styles.viewButtonActive : ''}`}
        >
          Timeline
        </button>
      </div>
    </div>
  );
} 