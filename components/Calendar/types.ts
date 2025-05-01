// Define Task interface
export interface Task {
  id: number;
  card_id?: number | null;
  section_id?: number | null;
  course_id?: number | null;
  learning_path_id?: number | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: 'todo' | 'done' | 'skipped';
  title?: string; // Optional as it may be fetched separately
  note: string | null;
} 