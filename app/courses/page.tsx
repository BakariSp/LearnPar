'use client';

import { useState } from 'react';
import styles from './courses.module.css';
import { courseData } from './courseData';
import { CourseCard } from '../../components/Course/CourseCard';

export default function CoursePage() {
  const [filter, setFilter] = useState('all');
  
  const filteredCourses = filter === 'all' 
    ? courseData 
    : courseData.filter(course => course.status === filter);

  return (
    <main className={styles.container}>
      <h1 className={styles.pageTitle}>My Courses</h1>
      
      <div className={styles.filterContainer}>
        <button 
          className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All Courses
        </button>
        <button 
          className={`${styles.filterButton} ${filter === 'in-progress' ? styles.active : ''}`}
          onClick={() => setFilter('in-progress')}
        >
          In Progress
        </button>
        <button 
          className={`${styles.filterButton} ${filter === 'completed' ? styles.active : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>
      
      <div className={styles.courseGrid}>
        {filteredCourses.map(course => (
          <CourseCard 
            key={course.id} 
            course={{
              id: course.id,
              title: course.title,
              subtitle: `${course.status}: ${course.description.substring(0, 30)}...`,
              progress: course.progress
            }} 
          />
        ))}
      </div>
    </main>
  );
} 