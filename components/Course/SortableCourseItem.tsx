import React from 'react';
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
    <div ref={setNodeRef} style={style} className={styles.courseItem} {...attributes} {...listeners}>
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

      <button
        onClick={(e) => {
            e.stopPropagation(); // Prevent drag start when clicking delete
            onDelete(course.id);
        }}
        className={styles.deleteButton}
        aria-label={`Delete course: ${course.title}`}
      >
        ✕
      </button>
    </div>
  );
} 