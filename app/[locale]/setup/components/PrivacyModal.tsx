'use client';

import { useEffect, useRef } from 'react';
import styles from '../setup.module.css';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
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
          <h2>Privacy Policy</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalContent}>
          <h3>1. Information We Collect</h3>
          <p>We collect information that you provide directly to us, such as when you create an account, update your profile, or interact with our services. This information may include your name, email address, and preferences.</p>
          
          <h3>2. How We Use Your Information</h3>
          <p>We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to personalize your learning experience.</p>
          
          <h3>3. Information Sharing</h3>
          <p>We do not share your personal information with third parties except as described in this policy. We may share information with service providers who help us operate our platform, or as required by law.</p>
          
          <h3>4. Data Security</h3>
          <p>We take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorized access.</p>
          
          <h3>5. Your Choices</h3>
          <p>You can access, update, or delete your account information at any time through your account settings. You can also opt out of receiving promotional emails from us.</p>
          
          <h3>6. Cookies and Similar Technologies</h3>
          <p>We use cookies and similar technologies to improve your experience, understand how our services are used, and personalize content.</p>
          
          <h3>7. Children's Privacy</h3>
          <p>Our services are not intended for children under the age of 13, and we do not knowingly collect personal information from children under 13.</p>
          
          <h3>8. Changes to This Policy</h3>
          <p>We may update this privacy policy from time to time. We will notify you of any significant changes by posting a notice on our platform.</p>
          
          <h3>9. Contact Us</h3>
          <p>If you have any questions about this privacy policy, please contact us at privacy@zeroai.com.</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalButton} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal; 