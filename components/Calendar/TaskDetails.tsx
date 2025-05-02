'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Task } from './types';
import styles from './Calendar.module.css';

interface TaskDetailsProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onUpdateNote?: (note: string | null) => void;
  onClose: () => void;
  onDelete?: (taskId: number) => void;
}

export function TaskDetails({ task, onUpdate, onUpdateNote, onClose, onDelete }: TaskDetailsProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState(task.note || '');
  const [title, setTitle] = useState(task.title || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [date, setDate] = useState(task.scheduled_date);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [startTime, setStartTime] = useState(task.start_time);
  const [endTime, setEndTime] = useState(task.end_time);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Format status for display
  const getStatusDisplay = (status: Task['status']) => {
    switch (status) {
      case 'todo': return t('calendar.status.todo', 'To Do');
      case 'done': return t('calendar.status.done', 'Completed');
      case 'skipped': return t('calendar.status.skipped', 'Skipped');
      default: return status;
    }
  };
  
  // Handle status change
  const handleStatusChange = (status: 'todo' | 'done' | 'skipped') => {
    onUpdate({ status });
  };
  
  // Handle saving note
  const handleSaveNote = () => {
    setIsSaving(true);
    
    try {
      const noteValue = note.trim() || null;
      if (onUpdateNote) {
        onUpdateNote(noteValue);
      } else {
        onUpdate({ note: noteValue });
      }
      setIsSaving(false);
    } catch (error) {
      console.error('Error in handleSaveNote:', error);
      setIsSaving(false);
    }
  };
  
  // Handle date update
  const handleDateUpdate = () => {
    onUpdate({
      scheduled_date: date,
    });
    setIsEditingDate(false);
  };
  
  // Handle time update
  const handleTimeUpdate = () => {
    onUpdate({
      start_time: startTime,
      end_time: endTime
    });
  };
  
  // Handle delete confirmation
  const handleDelete = () => {
    if (window.confirm(t('calendar.confirmDelete', 'Are you sure you want to delete this task?'))) {
      setIsDeleting(true);
      
      try {
        if (onDelete) {
          onDelete(task.id);
        }
      } catch (error) {
        console.error('Error in handleDelete:', error);
        setIsDeleting(false);
      }
    }
  };
  
  // Handle title update
  const handleTitleUpdate = () => {
    if (title.trim().length > 0 && title.trim().length <= 50) {
      onUpdate({ title: title.trim() });
      setIsEditingTitle(false);
    }
  };
  
  return (
    <div className={styles.taskDetailContainer}>
      <div className={styles.taskDetailHeader}>
        <h3 className={styles.taskDetailTitle}>
          {t('calendar.taskDetails', 'Task Details')}
        </h3>
        <button 
          onClick={onClose}
          className={styles.secondaryButton}
          aria-label="Close"
        >
          Close
        </button>
      </div>
      
      <div className={styles.taskDetailBody}>
        {/* Title Section */}
        <div className={styles.fieldSection}>
          {isEditingTitle ? (
            <div>
              <label className={styles.fieldLabel}>
                {t('calendar.taskTitle', 'Task Title')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleUpdate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTitleUpdate();
                  } else if (e.key === 'Escape') {
                    setTitle(task.title || '');
                    setIsEditingTitle(false);
                  }
                }}
                maxLength={50}
                autoFocus
                className={styles.editableInput}
              />
              <p className={styles.charCount}>
                {title.length}/50 {t('calendar.characters', 'characters')}
              </p>
            </div>
          ) : (
            <div className={styles.editableField}>
              <label className={styles.fieldLabel}>
                {t('calendar.taskTitle', 'Task Title')}
              </label>
              <p 
                className={styles.fieldValue}
                onClick={() => setIsEditingTitle(true)}
              >
                {task.title || t('calendar.untitledTask', 'Untitled Task')}
                <span className={styles.editIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </span>
              </p>
            </div>
          )}
        </div>
        
        {/* Date Section */}
        <div className={styles.fieldSection}>
          {isEditingDate ? (
            <div>
              <label className={styles.fieldLabel}>
                {t('calendar.scheduledDate', 'Scheduled Date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onBlur={handleDateUpdate}
                className={styles.dateInput}
                autoFocus
              />
              <div className={styles.formActions} style={{ marginTop: '0.5rem' }}>
                <button 
                  className={`${styles.actionButton} ${styles.primaryButton}`}
                  onClick={handleDateUpdate}
                >
                  {t('calendar.updateDate', 'Update Date')}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.editableField}>
              <label className={styles.fieldLabel}>
                {t('calendar.scheduledDate', 'Scheduled Date')}
              </label>
              <p 
                className={styles.fieldValue}
                onClick={() => setIsEditingDate(true)}
              >
                {task.scheduled_date}
                <span className={styles.editIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </span>
              </p>
            </div>
          )}
        </div>
        
        {/* Time Section */}
        <div className={styles.fieldSection}>
          <label className={styles.fieldLabel}>
            {t('calendar.time', 'Time')}
          </label>
          <div className={styles.dateTimeField}>
            <input
              type="time"
              value={startTime || ''}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={handleTimeUpdate}
              className={styles.timeInput}
              placeholder={t('calendar.startTime', 'Start time')}
            />
            <input
              type="time"
              value={endTime || ''}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={handleTimeUpdate}
              className={styles.timeInput}
              placeholder={t('calendar.endTime', 'End time')}
            />
          </div>
        </div>
        
        {/* Status Section */}
        <div className={styles.fieldSection}>
          <label className={styles.fieldLabel}>
            {t('calendar.status', 'Status')}
          </label>
          <div className={styles.statusButtons}>
            <button
              onClick={() => handleStatusChange('todo')}
              className={`${styles.statusButton} ${
                task.status === 'todo' 
                  ? styles.statusTodoButtonActive 
                  : styles.statusTodoButton
              }`}
              aria-label={t('calendar.status.todo', 'To Do')}
              type="button"
            >
              {t('calendar.status.todo', 'To Do')}
            </button>
            <button
              onClick={() => handleStatusChange('done')}
              className={`${styles.statusButton} ${
                task.status === 'done' 
                  ? styles.statusDoneButtonActive 
                  : styles.statusDoneButton
              }`}
              aria-label={t('calendar.status.done', 'Completed')}
              type="button"
            >
              {t('calendar.status.done', 'Completed')}
            </button>
            <button
              onClick={() => handleStatusChange('skipped')}
              className={`${styles.statusButton} ${
                task.status === 'skipped' 
                  ? styles.statusSkippedButtonActive 
                  : styles.statusSkippedButton
              }`}
              aria-label={t('calendar.status.skipped', 'Skipped')}
              type="button"
            >
              {t('calendar.status.skipped', 'Skipped')}
            </button>
          </div>
        </div>
        
        {/* Notes Section */}
        <div className={styles.fieldSection}>
          <label className={styles.fieldLabel}>
            {t('calendar.notes', 'Notes')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={styles.noteTextarea}
            placeholder={t('calendar.notesPlaceholder', 'Add notes about this task...')}
          />
          <div className={styles.formActions} style={{ marginTop: '0.75rem' }}>
            <button
              onClick={handleSaveNote}
              disabled={isSaving}
              className={`${styles.actionButton} ${styles.primaryButton}`}
            >
              {isSaving ? t('calendar.saving', 'Saving...') : t('calendar.saveNote', 'Save Note')}
            </button>
          </div>
        </div>
        
        {/* Delete Section */}
        {onDelete && (
          <div className={styles.fieldSection}>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`${styles.actionButton} ${styles.dangerButton}`}
            >
              <svg className={styles.buttonIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              {isDeleting ? t('calendar.deleting', 'Deleting...') : t('calendar.deleteTask', 'Delete Task')}
            </button>
            <p className={styles.warningText} style={{ marginTop: '0.5rem' }}>
              {t('calendar.deleteWarning', 'This action cannot be undone.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 