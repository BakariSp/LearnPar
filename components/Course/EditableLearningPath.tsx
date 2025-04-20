import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCourseItem } from './SortableCourseItem';
import styles from './EditableLearningPath.module.css';

// Define the structure for Course and Section if not already globally defined
// Ensure this matches the structure used in your chat/page.tsx
export interface Section {
    id: string | number;
    title: string;
}

export interface Course {
    id: string | number; // Must be unique and stable
    title: string;
    sections: Section[];
}

interface EditableLearningPathProps {
  pathTitle: string;
  courses: Course[];
  onDeleteCourse: (id: string | number) => void;
  onReorderCourses: (reorderedCourses: Course[]) => void;
  generatingCourseIds?: Set<string | number>;
  // Add props for difficulty level
  selectedDifficulty: string; // Receive selected difficulty from parent
  onDifficultyChange: (difficulty: string) => void; // Notify parent of change
  // Potentially add a prop to receive/update selected days from parent
  // onScheduleChange?: (selectedDays: string[]) => void;
}

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced']; // Define levels

export function EditableLearningPath({
  pathTitle,
  courses,
  onDeleteCourse,
  onReorderCourses,
  generatingCourseIds,
  selectedDifficulty, // Use prop from parent
  onDifficultyChange, // Use prop from parent
}: EditableLearningPathProps) {
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = courses.findIndex((c) => c.id === active.id);
      const newIndex = courses.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(courses, oldIndex, newIndex);
        onReorderCourses(reordered);
      }
    }
  };

  const handleDaySelect = (day: string) => {
    setSelectedDays(prevSelectedDays => {
      const newSelectedDays = new Set(prevSelectedDays);
      if (newSelectedDays.has(day)) {
        newSelectedDays.delete(day);
      } else {
        newSelectedDays.add(day);
      }
      // If you added onScheduleChange prop, call it here:
      // onScheduleChange?.(Array.from(newSelectedDays));
      return newSelectedDays;
    });
  };

  // Function to handle difficulty selection
  const handleDifficultySelect = (level: string) => {
    onDifficultyChange(level); // Call the callback passed from parent
  };

  // Get course IDs for SortableContext
  const courseIds = courses.map(c => c.id);

  return (
    <div className={styles.learningPathCard}>
      <h3 className={styles.pathTitle}>{pathTitle}</h3>

      {/* --- Schedule Day Selector --- */}
      <div className={styles.scheduleContainer}>
        <span className={styles.scheduleTitle}>Learning Days</span>
        <div className={styles.daySelector}>
         
          {daysOfWeek.map(day => (
            <button
              key={day}
              onClick={() => handleDaySelect(day)}
              className={`${styles.dayButton} ${selectedDays.has(day) ? styles.selectedDay : ''}`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
      {/* --- End Schedule Section --- */}

      {/* --- Difficulty Level Selector --- */}
      <div className={styles.difficultyContainer}>
        <span className={styles.difficultyTitle}>Difficulty Level</span>
        <div className={styles.difficultySelector}>
          {difficultyLevels.map(level => (
            <button
              key={level}
              onClick={() => handleDifficultySelect(level)}
              className={`${styles.difficultyButton} ${selectedDifficulty === level ? styles.selectedDifficulty : ''}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      {/* --- End Difficulty Section --- */}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={courseIds} strategy={verticalListSortingStrategy}>
          <div className={styles.courseListContainer}>
            {courses.length > 0 ? (
              courses.map((course, index) => (
                <SortableCourseItem
                  key={course.id}
                  course={course}
                  index={index}
                  onDelete={onDeleteCourse}
                  isGeneratingSections={generatingCourseIds?.has(course.id)}
                />
              ))
            ) : (
              <p className={styles.emptyMessage}>No courses in this path yet.</p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
} 