import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './EditableLearningPath.module.css'; // We'll create this CSS file next
import { Course as EditableCourse } from './EditableLearningPath'; // Import type from parent

interface SortableCourseItemProps {
  course: EditableCourse;
  index: number; // To display the week number
  onDelete: (id: string | number) => void;
  isGeneratingSections?: boolean; // <-- Add optional prop
}

export function SortableCourseItem({ course, index, onDelete, isGeneratingSections }: SortableCourseItemProps) {
  // The key issue was the delete button being affected by the drag & drop functionality
  // We'll keep the separate delete function outside the sortable handlers
  
  // The parent delete handler will be called directly from a non-sortable element
  const triggerDelete = useCallback(() => {
    console.log('Delete action triggered for course ID:', course.id);
    try {
      // Try-catch to ensure we can debug any issues
      onDelete(course.id);
    } catch (error) {
      console.error('Error in delete handler:', error);
    }
  }, [course.id, onDelete]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto', // Ensure dragging item is on top
    cursor: isDragging ? 'grabbing' : 'grab', // Add grab cursor
  };

  return (
    <div className={styles.courseItem} ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className={styles.courseContent}>
        <div className={styles.courseHeader}>
          <span className={styles.courseWeek}>Week {index + 1}</span>
          <h4 className={styles.courseTitle}>{course.title}</h4>
          {isGeneratingSections && <span className={styles.statusDot} title="Generating sections..."></span>}
        </div>
        {/* --- Conditional Rendering for Sections --- */}
        {isGeneratingSections ? (
          <div className={styles.sectionPlaceholderContainer}>
            <div className={`${styles.placeholderLine} ${styles.short}`}></div>
            <div className={styles.placeholderLine}></div>
            <div className={`${styles.placeholderLine} ${styles.medium}`}></div>
            <div className={styles.placeholderLine}></div>
          </div>
        ) : (
          // Only show list if sections exist and are not empty
          course.sections && course.sections.length > 0 && (
            <ul className={styles.sectionList}>
              {course.sections.map((section) => (
                <li key={section.id} className={styles.sectionItem}>
                  {section.title}
                </li>
              ))}
            </ul>
          )
        )}
        {/* --- End Conditional Rendering --- */}
      </div>
      
      {/* Delete button - still outside sortable context handlers but visually positioned in the corner */}
      <div className={styles.deleteButtonContainer}>
        <button
          type="button"
          className={styles.deleteButton}
          aria-label={`Delete course: ${course.title}`}
          onClick={triggerDelete}
        >
          ×
        </button>
      </div>
    </div>
  );
} 