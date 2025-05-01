'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

// Toast type definition
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Toast object structure
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Context interface
interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

// Create the context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast provider component
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Function to add a new toast
  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = Date.now().toString();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after duration
    if (duration !== 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  // Function to remove a toast
  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} hideToast={hideToast} />
    </ToastContext.Provider>
  );
};

// Custom hook to use the toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast container component to display all active toasts
const ToastContainer = ({ toasts, hideToast }: { toasts: Toast[], hideToast: (id: string) => void }) => {
  if (toasts.length === 0) return null;
  
  return (
    <div className="toast-container fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`toast p-3 rounded shadow-lg flex justify-between items-center max-w-xs ${getToastClasses(toast.type)}`}
        >
          <span>{toast.message}</span>
          <button 
            onClick={() => hideToast(toast.id)}
            className="ml-3 text-sm"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

// Helper function to get toast class based on type
const getToastClasses = (type: ToastType): string => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800 border-l-4 border-green-500';
    case 'error':
      return 'bg-red-100 text-red-800 border-l-4 border-red-500';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500';
    case 'info':
      return 'bg-blue-100 text-blue-800 border-l-4 border-blue-500';
    default:
      return 'bg-gray-100 text-gray-800 border-l-4 border-gray-500';
  }
}; 