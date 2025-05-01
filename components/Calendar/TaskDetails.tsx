'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Task } from './types';

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
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [date, setDate] = useState(task.scheduled_date);
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
      console.log(`Saving note for task ${task.id}:`, note);
      
      // Use the specialized function if available, otherwise use the regular update
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
  
  // Handle schedule update
  const handleScheduleUpdate = () => {
    onUpdate({
      scheduled_date: date,
      start_time: startTime,
      end_time: endTime
    });
    setIsEditing(false);
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
    // Validate title length (max 50 characters is reasonable)
    if (title.trim().length > 0 && title.trim().length <= 50) {
      onUpdate({ title: title.trim() });
      setIsEditingTitle(false);
    }
  };
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        {isEditingTitle ? (
          <div className="flex-grow mr-2">
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
              className="w-full p-1 border rounded text-lg font-semibold"
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/50 {t('calendar.characters', 'characters')}
            </p>
          </div>
        ) : (
          <h3 
            className="text-lg font-semibold cursor-pointer hover:text-blue-600 flex items-center"
            onClick={() => setIsEditingTitle(true)}
            title={t('calendar.editTitle', 'Click to edit title')}
          >
            {task.title || t('calendar.untitledTask', 'Untitled Task')}
            <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </h3>
        )}
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-1">Scheduled Date</p>
        <p>{task.scheduled_date}</p>
      </div>
      
      {(task.start_time || task.end_time) && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-1">Time</p>
          <p>
            {task.start_time && task.end_time 
              ? `${task.start_time} - ${task.end_time}`
              : task.start_time || task.end_time}
          </p>
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-1">Status</p>
        <div className="flex space-x-2 mt-1">
          <button
            onClick={() => handleStatusChange('todo')}
            className={`px-3 py-1 rounded-md ${
              task.status === 'todo' 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {getStatusDisplay('todo')}
          </button>
          <button
            onClick={() => handleStatusChange('done')}
            className={`px-3 py-1 rounded-md ${
              task.status === 'done' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {getStatusDisplay('done')}
          </button>
          <button
            onClick={() => handleStatusChange('skipped')}
            className={`px-3 py-1 rounded-md ${
              task.status === 'skipped' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {getStatusDisplay('skipped')}
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm text-gray-500 mb-1">Notes</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border rounded-md p-2 min-h-[100px]"
          placeholder="Add notes about this task..."
        />
        <button
          onClick={handleSaveNote}
          disabled={isSaving}
          className={`mt-2 px-3 py-1 ${
            isSaving ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
          } text-white rounded-md`}
        >
          {isSaving ? 'Saving...' : 'Save Note'}
        </button>
      </div>
      
      {/* Delete task button */}
      {onDelete && (
        <div className="border-t pt-4 mt-4">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`px-3 py-1 ${
              isDeleting ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'
            } text-white rounded-md`}
          >
            {isDeleting ? 'Deleting...' : t('calendar.deleteTask', 'Delete Task')}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            {t('calendar.deleteWarning', 'This action cannot be undone.')}
          </p>
        </div>
      )}
    </div>
  );
} 