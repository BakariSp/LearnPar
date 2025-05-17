'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './AiDialog.module.css';
import formStyles from '../Shared/InputForm.module.css';

interface AiDialogProps {
  query: string;
  setQuery: (query: string) => void;
  onQuerySubmit: (submittedQuery: string) => void;
}

// Define suggestion keywords with a mix of short and longer options
const suggestions = [
  { text: 'quantum physics', icon: '⚛️' },
  { text: 'improve critical thinking', icon: '🧠' },
  { text: 'dinosaur facts', icon: '🦖' },
  { text: 'public speaking tips', icon: '🎤' },
  { text: 'machine learning roadmap', icon: '🤖' },
  { text: 'design thinking', icon: '💡' },
];

export function AiDialog({ query, setQuery, onQuerySubmit }: AiDialogProps) {
  // Keep local loading state for button feedback if needed,
  // but the parent page (landing/chat) usually handles the main loading state.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate new height (capped at max-height defined in CSS)
      const newHeight = Math.min(textarea.scrollHeight, 150);
      
      // Set the height to fit content
      textarea.style.height = `${newHeight}px`;
    };
    
    // Adjust height whenever query changes
    adjustHeight();
    
    // Also adjust on window resize for better responsiveness
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onQuerySubmit(query); // Assume onQuerySubmit handles navigation/main loading
    } catch (error) {
      console.error('Error submitting query:', error);
      // Optionally show local error feedback
    } finally {
      // Reset local submitting state *if* navigation doesn't happen immediately
      // or if you want the button to become active again even if parent is loading.
      // For navigation, this might reset too early or be unnecessary.
      // Consider if parent loading state should disable this button instead.
      setIsSubmitting(false);
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setQuery(suggestionText);
    // Automatically submit when a suggestion is clicked
    if (!isSubmitting) {
        setIsSubmitting(true); // Disable button immediately
        try {
            // Call the function passed from the parent.
            // It's responsible for the actual action (e.g., navigation).
            onQuerySubmit(suggestionText);
            // If onQuerySubmit navigates, this component might unmount shortly after.
            // If it performs an async action without returning a promise,
            // the isSubmitting state might need to be managed by the parent.
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            // Reset local state only if an immediate synchronous error occurs
            setIsSubmitting(false);
        }
        // Removed .catch() and .finally() as onQuerySubmit doesn't guarantee a Promise
    }
  };

  // Handle keyboard events for the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !isSubmitting) {
        handleSubmit(e);
      }
    }
  };

  return (
    // The main div now just acts as a positioning container
    <div className={styles.aiDialog}>
      {/* The form now has the visual container style */}
      <form onSubmit={handleSubmit} className={formStyles.inputForm}>
        {/* Add other icons/buttons here if needed, like the '+' in the image */}
        {/* Example: <button type="button" className={formStyles.iconButton}>+</button> */}
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..." // Updated placeholder
          className={formStyles.input}
          disabled={isSubmitting} // Disable based on local submitting state
          rows={1} // Start with one row
        />
        {/* Add other icons/buttons here if needed, like the microphone */}
        {/* Example: <button type="button" className={formStyles.iconButton}>🎤</button> */}
        <button
          type="submit"
          className={formStyles.submitButton}
          disabled={isSubmitting || !query.trim()}
          aria-label="Submit query" // Accessibility
        >
          {/* Use a simpler icon like an arrow or keep magnifying glass */}
          {/* Using arrow for this example */}
          {isSubmitting ? <span className={formStyles.submitButtonIcon}>⏳</span> : <span className={formStyles.submitButtonIcon}>→</span>}
          {/* Or keep the magnifying glass: */}
          {/* {isSubmitting ? <span className={formStyles.submitButtonIcon}>⏳</span> : <span className={formStyles.submitButtonIcon}>🔍</span>} */}
        </button>
      </form>

      {/* Suggestions Area */}
      <div className={styles.suggestions}>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            className={styles.suggestionButton}
            onClick={() => handleSuggestionClick(suggestion.text)}
            disabled={isSubmitting}
          >
            <span className={styles.suggestionButtonIcon}>{suggestion.icon}</span>
            {suggestion.text}
          </button>
        ))}
      </div>
    </div>
  );
} 