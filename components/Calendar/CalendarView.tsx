'use client';

import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import { Task } from './types';
import styles from './Calendar.module.css';

// Define more specific Event interface that works with FullCalendar
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string; // Make end optional since we allow null
  extendedProps: {
    sectionId?: number | null;
    courseId?: number | null;
    [key: string]: any; // Allow other properties from Task
  };
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  allDay: boolean;
  resourceId?: string; // Make resourceId optional
}

interface CalendarViewProps {
  tasks: Task[];
  viewMode: 'timeline' | 'day' | 'week' | 'month';
  currentDate: Date;
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void;
  onTaskSelect: (task: Task) => void;
  onShiftTasks: (fromDate: string, days: number) => void;
  onRescheduleSection: (sectionId: number, newStartDate: string, newEndDate: string) => void;
  isLoading: boolean;
}

// Map our view modes to FullCalendar's view types
const viewModeMap = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
  timeline: 'dayGridWeek' // We'll customize this to look more like a timeline
};

export default function CalendarView({ 
  tasks, 
  viewMode, 
  currentDate, 
  onTaskUpdate,
  onTaskSelect,
  onShiftTasks,
  onRescheduleSection,
  isLoading 
}: CalendarViewProps) {
  const { t } = useTranslation();
  const calendarRef = useRef<FullCalendar | null>(null);
  
  // Validate tasks to ensure they have the required properties
  const validTasks = Array.isArray(tasks) ? tasks.filter(task => 
    task && 
    typeof task === 'object' && 
    task.id !== undefined &&
    task.scheduled_date !== undefined
  ) : [];
  
  // Convert tasks to FullCalendar event format
  const events: EventInput[] = validTasks.map(task => {
    // Ensure we have an ID that can be converted to string
    const id = task.id?.toString() || Math.random().toString(36).substring(2, 9);
    
    // Determine color based on status
    let backgroundColor;
    let borderColor;

    switch (task.status) {
      case 'done':
        backgroundColor = '#10B981'; // Green
        borderColor = '#059669';
        break;
      case 'skipped':
        backgroundColor = '#F59E0B'; // Amber/Yellow
        borderColor = '#D97706';
        break;
      default:
        backgroundColor = '#3B82F6'; // Blue
        borderColor = '#2563EB';
    }
    
    // Create event object with safe fallbacks for all properties
    return {
      id: id,
      title: task.title || `Task #${task.id}`,
      start: task.start_time 
        ? `${task.scheduled_date}T${task.start_time}` 
        : task.scheduled_date,
      end: task.end_time && task.start_time
        ? `${task.scheduled_date}T${task.end_time}` 
        : undefined,
      allDay: !task.start_time,
      backgroundColor,
      borderColor,
      textColor: 'white',
      extendedProps: {
        ...task
      }
    };
  });
  
  // Update calendar view when viewMode or currentDate changes
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(viewModeMap[viewMode] || 'timeGridWeek');
      calendarApi.gotoDate(currentDate);
    }
  }, [viewMode, currentDate]);
  
  // Handle date click (for potentially adding new tasks)
  const handleDateClick = (info: any) => {
    console.log('Date clicked:', info.dateStr);
    // Future: Could open "add task" modal pre-filled with this date
  };
  
  // Handle event click (task selection)
  const handleEventClick = (info: any) => {
    try {
      const taskId = parseInt(info.event.id);
      const task = validTasks.find(t => t.id === taskId);
      if (task) {
        onTaskSelect(task);
      }
    } catch (error) {
      console.error('Error handling event click:', error);
    }
  };
  
  // Handle event drag and drop (reschedule)
  const handleEventDrop = (info: any) => {
    const taskId = parseInt(info.event.id);
    const newDate = info.event.start.toISOString().split('T')[0];
    
    // Extract time if it's not an all-day event
    const updates: Partial<Task> = { scheduled_date: newDate };
    
    if (!info.event.allDay) {
      const startTime = info.event.start.toTimeString().substring(0, 5);
      updates.start_time = startTime;
      
      if (info.event.end) {
        const endTime = info.event.end.toTimeString().substring(0, 5);
        updates.end_time = endTime;
      }
    }
    
    onTaskUpdate(taskId, updates);
  };
  
  // Show loading spinner if data is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className={styles.calendarViewContainer}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={false} // We're using our own header
        initialView={viewModeMap[viewMode] || 'timeGridWeek'}
        initialDate={currentDate}
        events={events}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        height="100%"
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        nowIndicator={true}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }}
      />
    </div>
  );
} 