'use client';

import { useState, useEffect } from 'react';
import styles from './courses.module.css';
import { courseData } from './courseData';
import { CourseCard } from '../../../components/Course/CourseCard';
import JsonLd from '@/components/JsonLd';
import { usePathname } from 'next/navigation';

// This is a client component, so we use the metadata in a separate file for SSR
export default function CoursePage() {
  const [filter, setFilter] = useState('all');
  const pathname = usePathname();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  const filteredCourses = filter === 'all' 
    ? courseData 
    : courseData.filter(course => course.status === filter);

  // Generate breadcrumb structured data
  const breadcrumbItems = [
    { name: 'Home', item: baseUrl },
    { name: 'Courses', item: `${baseUrl}${pathname}` }
  ];

  return (
    <main className={styles.container}>
      <JsonLd 
        type="BreadcrumbList" 
        data={{ items: breadcrumbItems }} 
      />
      
      {courseData.slice(0, 3).map(course => (
        <JsonLd 
          key={`jsonld-${course.id}`}
          type="Course" 
          data={{
            name: course.title,
            description: course.description,
            provider: "Zero AI",
            url: `${baseUrl}${pathname}#${course.id}`,
            image: `${baseUrl}/course-${course.id}.jpg`,
          }} 
        />
      ))}
            
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