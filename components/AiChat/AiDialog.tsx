'use client';

import { useState } from 'react';
import styles from './AiDialog.module.css';

interface AiDialogProps {
  query: string;
  setQuery: (query: string) => void;
}

export function AiDialog({ query, setQuery }: AiDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API call to AI service
    try {
      // In a real app, you would call your AI service here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset after "response"
      setIsLoading(false);
    } catch (error) {
      console.error('Error querying AI:', error);
      setIsLoading(false);
    }
  };
  
  return (
    <div className={styles.aiDialog}>
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about any topic you want to learn..."
          className={styles.input}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? '⏳' : '🔍'}
        </button>
      </form>
    </div>
  );
} 