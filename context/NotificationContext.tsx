'use client';

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

interface NotificationContextType {
  hasNewPaths: boolean;
  setHasNewPaths: Dispatch<SetStateAction<boolean>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [hasNewPaths, setHasNewPaths] = useState(false);

  return (
    <NotificationContext.Provider value={{ hasNewPaths, setHasNewPaths }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}; 