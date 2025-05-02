'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ProductInfoPopup.module.css';
import Image from 'next/image';

interface ProductInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProductInfoPopup({ isOpen, onClose }: ProductInfoPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div ref={popupRef} className={styles.popup}>
        <div className={styles.header}>
          <h2 className={styles.title}>Product Status</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className={styles.content}>
          <h3 className={styles.sectionTitle}>Current Issues</h3>
          <ul className={styles.issueList}>
            <li className={styles.issueItem}>
              <div className={styles.statusBadge} data-status="fixing">Fixing</div>
              <span>Dark Mode Support</span>
              <p className={styles.issueDescription}>We currently only support light mode. Dark mode is being fixed to ensure consistent UI across the application.</p>
            </li>
            <li className={styles.issueItem}>
              <div className={styles.statusBadge} data-status="designing">Beta</div>
              <span>Calendar & Knowledge Map</span>
              <p className={styles.issueDescription}>Calendar and Knowledge Map features are currently in beta. We're redesigning them for improved functionality.</p>
            </li>
            <li className={styles.issueItem}>
              <div className={styles.statusBadge} data-status="planning">Planned</div>
              <span>Mobile Responsiveness</span>
              <p className={styles.issueDescription}>Enhancing mobile experience across all screens and features.</p>
            </li>
          </ul>

          <h3 className={styles.sectionTitle}>What We're Working On</h3>
          <ul className={styles.featureList}>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>🚀</div>
              <div>
                <span className={styles.featureName}>Enhanced Learning Paths</span>
                <p className={styles.featureDescription}>Improving the path recommendation system with more personalized content.</p>
              </div>
            </li>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>💬</div>
              <div>
                <span className={styles.featureName}>Chat Improvements</span>
                <p className={styles.featureDescription}>Adding more context-aware responses in the AI chat system.</p>
              </div>
            </li>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>⚡</div>
              <div>
                <span className={styles.featureName}>Performance Optimization</span>
                <p className={styles.featureDescription}>Working on faster load times and smoother transitions.</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className={styles.footer}>
          <p>Have suggestions? We'd love to hear from you!</p>
          <a 
            href="https://docs.google.com/forms/d/e/1FAIpQLSezgdVX2_oQa9TNUEnXd7TVUhlc5lgYNXWDr7vEhMv00Z_fdg/viewform" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.feedbackButton}
          >
            Send Feedback
          </a>
        </div>
      </div>
    </div>
  );
} 