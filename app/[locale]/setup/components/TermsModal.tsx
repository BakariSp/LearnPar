'use client';

import { useEffect, useRef } from 'react';
import styles from '../setup.module.css';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      // Restore scrolling when modal is closed
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.modalHeader}>
          <h2>Terms of Service</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalContent}>
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing or using Zero AI's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          
          <h3>2. Description of Service</h3>
          <p>Zero AI provides personalized AI-powered learning and productivity tools. We reserve the right to modify, suspend, or discontinue any part of our services at any time.</p>
          
          <h3>3. User Accounts</h3>
          <p>You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>
          
          <h3>4. User Content</h3>
          <p>You retain ownership of any content you submit to our platform. By submitting content, you grant us a worldwide, non-exclusive license to use, reproduce, modify, and display your content solely for the purpose of providing our services.</p>
          
          <h3>5. Privacy</h3>
          <p>Your privacy is important to us. Our Privacy Policy describes how we collect, use, and protect your personal information.</p>
          
          <h3>6. Intellectual Property</h3>
          <p>All content, features, and functionality on our platform, including but not limited to text, graphics, logos, and software, are owned by Zero AI and are protected by intellectual property laws.</p>
          
          <h3>7. Prohibited Conduct</h3>
          <p>You may not use our services for any illegal purpose or in violation of any laws. You may not attempt to gain unauthorized access to our systems or interfere with the proper working of our services.</p>
          
          <h3>8. Termination</h3>
          <p>We reserve the right to terminate or suspend your account at our discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.</p>
          
          <h3>9. Limitation of Liability</h3>
          <p>Zero AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services.</p>
          
          <h3>10. Changes to Terms</h3>
          <p>We may update these Terms from time to time. We will notify you of any significant changes by posting a notice on our platform.</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalButton} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal; 