'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Task } from './types';
import styles from './Calendar.module.css';

interface TaskListProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
}

export function TaskList({ tasks, onTaskSelect, onTaskUpdate, onAddTask }: TaskListProps) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const [newTask, setNewTask] = useState<Partial<Omit<Task, 'id'>>>({
    title: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'todo',
    note: '',
    start_time: null,
    end_time: null
    // Omitting foreign key fields for standalone tasks as per API documentation
  });

  // Format a time string (HH:MM) to a more readable format
  const formatTime = (timeString: string): string => {
    try {
      // Convert "HH:MM:SS" to "HH:MM AM/PM"
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString; // Return original if parsing fails
    }
  };

  // Format a date string (YYYY-MM-DD) to a more readable format
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // Filter for today's tasks
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(task => task.scheduled_date === today);
  
  // Use all tasks or just today's tasks based on view mode
  const filteredTasks = viewMode === 'today' ? todayTasks : tasks;
  
  // Sort tasks by date (ascending) and then by status
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // First sort by date (ascending)
    if (!a.scheduled_date && !b.scheduled_date) {
      return 0; // Both are missing date, consider them equal
    }
    
    if (!a.scheduled_date) {
      return 1; // a is missing date, b should come first
    }
    
    if (!b.scheduled_date) {
      return -1; // b is missing date, a should come first
    }
    
    if (a.scheduled_date !== b.scheduled_date) {
      return a.scheduled_date.localeCompare(b.scheduled_date);
    }
    
    // Then by status (todo first, then done, then skipped)
    const statusOrder = { todo: 0, done: 1, skipped: 2 };
    return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
  });
  
  const handleStatusToggle = (task: Task) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    onTaskUpdate(task.id, { status: newStatus });
  };
  
  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation for title and date
    if (!newTask.title?.trim()) {
      alert(t('calendar.errors.titleRequired', 'Task title is required'));
      return;
    }
    
    if (newTask.title.trim().length > 50) {
      alert(t('calendar.errors.titleTooLong', 'Task title cannot exceed 50 characters'));
      return;
    }
    
    if (!newTask.scheduled_date) {
      alert(t('calendar.errors.dateRequired', 'Task date is required'));
      return;
    }
    
    // Make sure we're passing all required fields
    const taskToAdd: Omit<Task, 'id'> = {
      title: newTask.title.trim(), // Trim the title to remove extra whitespace
      scheduled_date: newTask.scheduled_date || new Date().toISOString().split('T')[0],
      status: newTask.status || 'todo',
      note: newTask.note?.trim() || null, // Empty string should be null, trim to remove extra whitespace
      start_time: newTask.start_time || null,
      end_time: newTask.end_time || null,
    };
    
    console.log('Adding task:', taskToAdd); // Log for debugging
    onAddTask(taskToAdd);
    setShowAddForm(false);
    setNewTask({
      title: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      status: 'todo',
      note: '',
      start_time: null,
      end_time: null
      // Omitting foreign key fields for standalone tasks as per API documentation
    });
  };

  // Group tasks by date for the 'all' view
  const tasksByDate = sortedTasks.reduce((acc, task) => {
    // Skip tasks with no scheduled date
    if (!task.scheduled_date) {
      return acc;
    }
    
    const date = task.scheduled_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);
  
  // Sort dates for the 'all' view
  const sortedDates = Object.keys(tasksByDate).sort();

  return (
    <div>
      <div className={styles.taskListHeader}>
        <h3 className={styles.taskListTitle}>Tasks</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={styles.addTaskButton}
        >
          {showAddForm ? 'Cancel' : '+ Add Task'}
        </button>
      </div>
      
      {/* Tab navigation */}
      <div className={styles.taskListTabs}>
        <button
          onClick={() => setViewMode('today')}
          className={`${styles.taskTab} ${viewMode === 'today' ? styles.taskTabActive : ''}`}
        >
          Today
        </button>
        <button
          onClick={() => setViewMode('all')}
          className={`${styles.taskTab} ${viewMode === 'all' ? styles.taskTabActive : ''}`}
        >
          All Tasks
        </button>
      </div>
      
      {showAddForm && (
        <form onSubmit={handleAddTaskSubmit} className={styles.addTaskForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('calendar.taskTitle', 'Task Title')} <span className={styles.required}>*</span>
            </label>
            <input 
              type="text"
              value={newTask.title || ''}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              className={styles.formInput}
              required
              maxLength={50}
              autoFocus
              placeholder={t('calendar.taskTitlePlaceholder', 'Enter a title for your task')}
            />
            <p className={styles.charCount}>
              {(newTask.title || '').length}/50 {t('calendar.characters', 'characters')}
            </p>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('calendar.date', 'Date')} <span className={styles.required}>*</span>
            </label>
            <input 
              type="date"
              value={newTask.scheduled_date || ''}
              onChange={(e) => setNewTask({...newTask, scheduled_date: e.target.value})}
              className={styles.formInput}
              required
            />
          </div>
          
          <div className={styles.timeInputs}>
            <div>
              <label className={styles.formLabel}>
                {t('calendar.startTime', 'Start Time')} <span className={styles.optional}>{t('calendar.optional', '(optional)')}</span>
              </label>
              <input 
                type="time"
                value={newTask.start_time || ''}
                onChange={(e) => setNewTask({...newTask, start_time: e.target.value || null})}
                className={styles.formInput}
              />
            </div>
            <div>
              <label className={styles.formLabel}>
                {t('calendar.endTime', 'End Time')} <span className={styles.optional}>{t('calendar.optional', '(optional)')}</span>
              </label>
              <input 
                type="time"
                value={newTask.end_time || ''}
                onChange={(e) => setNewTask({...newTask, end_time: e.target.value || null})}
                className={styles.formInput}
              />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('calendar.notes', 'Notes')} <span className={styles.optional}>{t('calendar.optional', '(optional)')}</span>
            </label>
            <textarea
              value={newTask.note || ''}
              onChange={(e) => setNewTask({...newTask, note: e.target.value})}
              className={styles.formTextarea}
              placeholder={t('calendar.notesPlaceholder', 'Any additional details...')}
              rows={3}
            />
          </div>
          
          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitButton}
            >
              {t('calendar.addTask', 'Add Task')}
            </button>
          </div>
        </form>
      )}
      
      {/* No tasks message */}
      {filteredTasks.length === 0 && !showAddForm && (
        <div className={styles.emptyState}>
          <p>{t('calendar.noTasks', 'No tasks scheduled.')}</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className={styles.addTaskLink}
          >
            {t('calendar.createTask', 'Create a task')}
          </button>
        </div>
      )}
      
      {/* Task list */}
      {viewMode === 'today' ? (
        <div className={styles.taskItems}>
          {sortedTasks.map(task => (
            <div 
              key={task.id} 
              className={styles.taskItem}
              onClick={() => onTaskSelect(task)}
            >
              <div className={styles.taskCheckbox}>
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => handleStatusToggle(task)}
                  onClick={(e) => e.stopPropagation()}
                  className={styles.checkbox}
                />
                <div className={`${styles.taskTitle} ${task.status === 'done' ? styles.taskDone : ''}`}>
                  {task.title}
                </div>
              </div>
              {(task.start_time || task.end_time) && (
                <div className={styles.taskTime}>
                  {task.start_time && formatTime(task.start_time)}
                  {task.start_time && task.end_time && ' - '}
                  {task.end_time && formatTime(task.end_time)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div>
          {sortedDates.map(date => (
            <div key={date} className={styles.dateGroup}>
              <div className={styles.dateHeader}>
                {formatDate(date)}
              </div>
              <div className={styles.taskItems}>
                {tasksByDate[date].map(task => (
                  <div 
                    key={task.id} 
                    className={styles.taskItem}
                    onClick={() => onTaskSelect(task)}
                  >
                    <div className={styles.taskCheckbox}>
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={() => handleStatusToggle(task)}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.checkbox}
                      />
                      <div className={`${styles.taskTitle} ${task.status === 'done' ? styles.taskDone : ''}`}>
                        {task.title}
                      </div>
                    </div>
                    {(task.start_time || task.end_time) && (
                      <div className={styles.taskTime}>
                        {task.start_time && formatTime(task.start_time)}
                        {task.start_time && task.end_time && ' - '}
                        {task.end_time && formatTime(task.end_time)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 