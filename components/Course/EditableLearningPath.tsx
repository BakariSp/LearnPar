import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import formStyles from '../Shared/InputForm.module.css'; // Import shared form styles
import { apiCreatePathFromStructure, GeneratePathPayload } from '../../services/api'; // Import the specific API function and payload type
import { FullLearningPathResponse } from '@/services/api'; // Keep for type reference

// Define the structure for Course and Section if not already globally defined
// Ensure this matches the structure used in your chat/page.tsx
export interface Section {
    id: string | number;
    title: string;
    order_index: number;
    // Add other fields like description, cards if needed by SortableCourseItem
}

export interface Course {
    id: string | number;
    title: string;
    order_index: number;
    sections?: Section[];
    // Add other fields like description if needed by SortableCourseItem
}

// Type for the plan structure this component receives and sends
// This should align with FullLearningPathResponse but might be partial
type LearningPlanData = FullLearningPathResponse;

// --- Dialogue specific types (can be defined here or imported) ---
// interface DialogueMessage { ... }
// interface DialogueRequestPayload { ... }
// interface DialogueResponseData { ... }
// --- End Dialogue Types ---

interface EditableLearningPathProps {
  // initialPrompt?: string | null; // No longer needed here
  initialPlan?: LearningPlanData | null; // Receive initial plan state (can be null)
  // onPlanUpdate: (updatedPlanData: Partial<LearningPlanData>) => void; // No longer called from here
  onDeleteCourse: (id: string | number) => void; // Keep direct manipulation handlers
  onReorderCourses: (reorderedCourses: Course[]) => void;
  onDifficultyChange: (difficulty: string) => void;
  // generatingCourseIds?: Set<string | number>; // Decide if needed based on SortableCourseItem
}

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const difficultyLevels = ['Beginner', 'Intermediate', 'Advanced']; // Define levels

export function EditableLearningPath({
  // initialPrompt,
  initialPlan,
  // onPlanUpdate,
  onDeleteCourse,
  onReorderCourses,
  onDifficultyChange,
  // generatingCourseIds, // Removed for now, can be added back if needed
}: EditableLearningPathProps) {

  // --- REMOVE Chat State ---
  // const [userInput, setUserInput] = useState('');
  // const [messages, setMessages] = useState<DialogueMessage[]>([]);
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  // const chatEndRef = useRef<HTMLDivElement>(null);

  // --- REMOVE State for Finalization ---
  // const [isFinalizing, setIsFinalizing] = useState(false);
  // const [finalizationMessage, setFinalizationMessage] = useState<string | null>(null);
  // const [finalizationError, setFinalizationError] = useState<string | null>(null);
  // --- End Finalization State ---

  // --- Local state for UI elements derived from props ---
  // Use initialPlan to set initial state for difficulty, courses etc.
  const pathTitle = initialPlan?.title || 'Learning Plan';
  // Map incoming courses to add order_index based on array position and ensure stable IDs
  const courses: Course[] = (initialPlan?.courses || []).map((course, index) => ({
    ...course,
    order_index: index,
    // Ensure the id is consistent
    id: course.id || `course-${index}`,
  }));
  
  // Keep the difficulty level in sync with initialPlan or default to "Intermediate"
  const [internalDifficulty, setInternalDifficulty] = useState(initialPlan?.difficulty_level || 'Intermediate');

  // State for schedule selector (remains local)
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  // Update internal difficulty when initialPlan changes
  useEffect(() => {
    // Update difficulty if present in initialPlan
    if (initialPlan?.difficulty_level) {
      setInternalDifficulty(initialPlan.difficulty_level);
    }
  }, [initialPlan]);

  // --- REMOVE Chat Scroll Effect ---
  // useEffect(() => { ... }, [messages]);

  // --- REMOVE Initial Prompt Handling ---
  // useEffect(() => { ... }, [initialPrompt]);

  // --- REMOVE sendMessage Function ---
  // const sendMessage = useCallback(async (...) => { ... }, [messages, initialPlan, onPlanUpdate]);

  // --- REMOVE Form Submission Handler ---
  // const handleSubmit = (e: React.FormEvent) => { ... };

  // --- REMOVE Handler for the Finalize Path button ---
  // const handleFinalizePath = async () => { ... };

  // --- Drag and Drop Handlers (Keep) ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = courses.findIndex(c => (c.id || c.title || `course-${c.order_index}`) === active.id);
      const newIndex = courses.findIndex(c => (c.id || c.title || `course-${c.order_index}`) === over.id);
      const reordered = arrayMove(courses, oldIndex, newIndex);
      // Update order_index based on new position
      const updatedCourses = reordered.map((course, index) => ({ ...course, order_index: index }));
      onReorderCourses(updatedCourses); // Notify parent
    }
  };

  // Generate stable IDs for SortableContext
  const courseIds = courses.map(c => c.id || c.title || `course-${c.order_index}`);

  // --- Schedule and Difficulty Handlers (Keep) ---
  const handleDaySelect = (day: string) => {
    setSelectedDays(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(day)) {
        newSelection.delete(day);
      } else {
        newSelection.add(day);
      }
      // TODO: Potentially notify parent or trigger AI interaction if schedule affects plan
      return newSelection;
    });
  };

  const handleDifficultySelect = (level: string) => {
    setInternalDifficulty(level); // Update local state first for immediate UI feedback
    onDifficultyChange(level); // Then notify parent
  };

  // If there's no plan, maybe render nothing or a minimal placeholder?
  // The parent component controls rendering this component based on `currentPlan`.
  if (!initialPlan) {
      return null; // Or a loading/placeholder specific to this component if needed
  }

  return (
    // Main container - styles might need adjustment based on parent layout
    <div className={styles.editablePathContainer}>
        {/* Path title */}
        <h3 className={styles.pathTitle}>{pathTitle}</h3>

        {/* Study Days */}
        <div className={styles.scheduleContainer}>
            <span className={styles.scheduleTitle}>Study Days</span>
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

        {/* Difficulty Level */}
        <div className={styles.difficultyContainer}>
            <span className={styles.difficultyTitle}>Difficulty Level</span>
            <div className={styles.difficultySelector}>
                {difficultyLevels.map(level => (
                    <button
                        key={level}
                        onClick={() => handleDifficultySelect(level)}
                        className={`${styles.difficultyButton} ${internalDifficulty === level ? styles.selectedDifficulty : ''}`}
                        aria-selected={internalDifficulty === level}
                    >
                        {level}
                    </button>
                ))}
            </div>
        </div>

        {/* Course List */}
        <div className={styles.courseListArea}>
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
                            // Use stable ID for key - use actual ID value directly
                            key={course.id}
                            course={{ // Ensure props match SortableCourseItem expectations
                                id: course.id, // Pass the ID directly
                                title: course.title,
                                order_index: index, // Ensure index matches array position
                                sections: course.sections?.map(s => ({ // Map sections if needed
                                    id: s.id || `section-${index}-${s.order_index || 0}`,
                                    title: s.title,
                                    order_index: s.order_index || 0,
                                })) || [],
                            }}
                            index={index} // Pass index if needed
                            onDelete={(id) => {
                              // Call the parent component's onDeleteCourse function
                              onDeleteCourse(id);
                            }}
                            // isGeneratingSections={generatingCourseIds?.has(course.id)} // Pass if needed
                        />
                    ))
                    ) : (
                    <p className={styles.emptyMessage}>No courses in the plan yet.</p>
                    )}
                </div>
                </SortableContext>
            </DndContext>
        </div>
    </div>
  );
} 