'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import { TaskList } from './TaskList';
import { TaskDetails } from './TaskDetails';
import { CalendarHeader } from './CalendarHeader';
import styles from './Calendar.module.css';
import CalendarService, { mapStatusToFrontend } from '../../services/api/calendar';
import { Task } from './types';
import { useToast } from '../../context/ToastContext';

// Dynamically import FullCalendar to avoid SSR issues
const CalendarView = dynamic(() => import('./CalendarView'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingIndicator}>
      <div className={styles.spinner}></div>
    </div>
  ),
}) as any; // Type assertion to avoid TypeScript error

export function CalendarContainer() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'day' | 'week' | 'month'>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  // Get date range based on view mode for API calls
  const getDateRange = useCallback(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        // Same day
        break;
      case 'week':
        // Start from Sunday of the current week
        const day = currentDate.getDay();
        start.setDate(currentDate.getDate() - day);
        // End on Saturday
        end.setDate(start.getDate() + 6);
        break;
      case 'month':
        // Start from the 1st of the month
        start.setDate(1);
        // End on the last day of the month
        end.setMonth(currentDate.getMonth() + 1);
        end.setDate(0);
        break;
      case 'timeline':
        // Show more days for timeline view (e.g., 2 weeks)
        start.setDate(currentDate.getDate() - 7);
        end.setDate(currentDate.getDate() + 14);
        break;
    }
    
    return {
      start: start.toISOString().split('T')[0], // Format as YYYY-MM-DD
      end: end.toISOString().split('T')[0]
    };
  }, [currentDate, viewMode]);

  // Fetch tasks function that can be called to refresh the list
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { start, end } = getDateRange();
      const fetchedTasks = await CalendarService.fetchTasks(start, end);
      setTasks(fetchedTasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      
      // Special handling for network/CORS errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. This might be due to CORS issues, network connectivity problems, or the server being offline.');
      } else {
        setError('Failed to load your calendar tasks. Please try again later.');
      }
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [getDateRange]);

  // Fetch tasks when the component mounts or date range changes
  useEffect(() => {
    fetchTasks();
  }, [currentDate, viewMode, fetchTasks]);

  // Handle task update (status, date, time)
  const handleTaskUpdate = async (taskId: number, updates: Partial<Task>) => {
    try {
      // Format time values properly before sending to the API
      const formattedUpdates: Partial<Task> = { ...updates };
      
      // If we're updating time fields, ensure they're in the correct format (HH:MM:SS)
      if (updates.start_time) {
        // If it's from a time input, it might be in HH:MM format, so add seconds
        if (updates.start_time.split(':').length === 2) {
          formattedUpdates.start_time = `${updates.start_time}:00`;
        }
      }
      
      if (updates.end_time) {
        // If it's from a time input, it might be in HH:MM format, so add seconds
        if (updates.end_time.split(':').length === 2) {
          formattedUpdates.end_time = `${updates.end_time}:00`;
        }
      }
      
      console.log('Updating task with formatted data:', formattedUpdates);
      await CalendarService.updateTask(taskId, formattedUpdates);
      
      // Update local state after successful API call
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        )
      );
      
      showToast(t('calendar.taskUpdated', 'Task updated successfully'));
    } catch (error) {
      console.error('Failed to update task:', error);
      showToast(t('calendar.updateError', 'Failed to update task'), 'error');
    }
  };

  // Specialized function for updating just the note field
  const handleUpdateTaskNote = async (taskId: number, note: string | null): Promise<void> => {
    try {
      await CalendarService.updateTask(taskId, { note });
      
      // Update task locally
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, note } : task
      );
      setTasks(updatedTasks);
      
      // If the updated task is the selected task, update it
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, note });
      }
      
      setError(null);
    } catch (error: any) {
      console.error('Error in handleUpdateTaskNote:', error);
      
      // Special handling for network/CORS errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. This might be due to CORS issues, network connectivity problems, or the server being offline.');
      } else {
        setError(`Failed to update note: ${error.message}`);
      }
    }
  };

  // Handle shifting future tasks
  const handleShiftTasks = async (fromDate: string, days: number) => {
    try {
      await CalendarService.shiftTasks(fromDate, days);
      
      // Refresh tasks after shifting
      fetchTasks();
      
      setError(null);
    } catch (error: any) {
      console.error('Error shifting tasks:', error);
      
      // Special handling for network/CORS errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. This might be due to CORS issues, network connectivity problems, or the server being offline.');
      } else {
        setError('Failed to shift tasks. Please try again later.');
      }
    }
  };

  // Handle rescheduling section
  const handleRescheduleSection = async (sectionId: number, newStartDate: string, newEndDate: string) => {
    try {
      await CalendarService.rescheduleSection(sectionId, newStartDate, newEndDate);
      
      // Refresh tasks
      fetchTasks();
      
      setError(null);
    } catch (error: any) {
      console.error('Error rescheduling section:', error);
      
      // Special handling for network/CORS errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. This might be due to CORS issues, network connectivity problems, or the server being offline.');
      } else {
        setError('Failed to reschedule section. Please try again later.');
      }
    }
  };

  // Handle adding a new task
  const handleAddTask = async (newTask: Omit<Task, 'id'>) => {
    try {
      await CalendarService.createTask(newTask);
      
      // Reload the full task list to ensure consistency
      fetchTasks();
      
      // Show a success message
      setError(null);
    } catch (error: any) {
      console.error('Error creating task:', error);
      
      // Special handling for network/CORS errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. This might be due to CORS issues, network connectivity problems, or the server being offline.');
      } else {
        setError('Failed to create task. Please try again later.');
      }
    }
  };

  // Handle deleting a task
  const handleTaskDelete = async (taskId: number): Promise<void> => {
    try {
      await CalendarService.deleteTask(taskId);
      
      // Update local state to remove the deleted task
      setTasks(tasks.filter(task => task.id !== taskId));
      
      // If the deleted task is currently selected, clear the selection
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(null);
      }
      
      // Show success message
      console.log(`Task ${taskId} successfully deleted`);
      setError(null);
    } catch (error: any) {
      console.error('Error deleting task:', error);
      
      // Special handling for network/CORS errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server. This might be due to CORS issues, network connectivity problems, or the server being offline.');
      } else {
        setError(`Failed to delete task: ${error.message}`);
      }
    }
  };

  // Handle date navigation
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  // Handle view mode change
  const handleViewChange = (mode: 'timeline' | 'day' | 'week' | 'month') => {
    setViewMode(mode);
  };

  return (
    <div className={styles.calendarContainer}>
      {/* Calendar header with controls */}
      <div className={styles.calendarHeader}>
        <CalendarHeader 
          currentDate={currentDate}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onViewChange={handleViewChange}
        />
      </div>
      
      {/* Error message if present */}
      {error && (
        <div className={styles.errorMessage}>
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className={styles.dismissButton}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Main calendar area */}
      <div className={styles.calendarContent}>
        <div className={styles.mainView}>
          <CalendarView 
            tasks={tasks}
            viewMode={viewMode}
            currentDate={currentDate}
            onTaskUpdate={handleTaskUpdate}
            onTaskSelect={setSelectedTask}
            onShiftTasks={handleShiftTasks}
            onRescheduleSection={handleRescheduleSection}
            isLoading={isLoading}
          />
        </div>
        
        {/* Task sidebar */}
        <div className={styles.taskList}>
          {selectedTask ? (
            <TaskDetails 
              task={selectedTask} 
              onUpdate={(updates: Partial<Task>) => {
                // Use the specialized note update function if only note is being updated
                if (updates.note !== undefined && Object.keys(updates).length === 1) {
                  handleUpdateTaskNote(selectedTask.id, updates.note);
                } else {
                  handleTaskUpdate(selectedTask.id, updates);
                }
              }}
              onUpdateNote={(note: string | null) => handleUpdateTaskNote(selectedTask.id, note)}
              onClose={() => setSelectedTask(null)}
              onDelete={handleTaskDelete}
            />
          ) : (
            <TaskList 
              tasks={tasks}
              onTaskSelect={setSelectedTask}
              onTaskUpdate={handleTaskUpdate}
              onAddTask={handleAddTask}
            />
          )}
        </div>
      </div>
    </div>
  );
}
