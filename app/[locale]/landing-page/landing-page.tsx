'use client';

import React from 'react';
import styles from './landing-page.module.css'; // Import the CSS module
import Link from 'next/link'; // Import Link for navigation
import Image from 'next/image';
import { useParams } from 'next/navigation'; // Import useParams to get locale

export default function LandingPage() {
  const params = useParams();
  const locale = params.locale || 'en';
  
  return (
    <div className={`${styles.pageContainer} ${styles.root}`}>
      {/* Header with Logo and Login */}
      <nav className={styles.navbar}>
        <div className={styles.navbarBrand}>
          <Link href={`/${locale}`} className={styles.logoLink}>
            <span className={styles.logoText}>Zero AI</span>
          </Link>
        </div>
        <div className={styles.navbarActions}>
          <Link href={`/${locale}/login`} className={styles.loginButton}>
            Login
          </Link>
        </div>
      </nav>

      <div className={styles.contentWrapper}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <span className={styles.subTitle}>AI Learning Path Builder</span>
            <h1 className={styles.mainHeading}>
              Create a personalized<br />
              learning path in seconds<br />
              with <span className={styles.accentText}>Zero AI</span>
            </h1>
            <div className={styles.heroButtons}>
              <Link href={`/${locale}/login`} className={styles.primaryButton}>
                Get started
              </Link>
              <Link href={`/${locale}/about`} className={styles.secondaryButton}>
                Learn more
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className={styles.heroImageContainer}>
            <Image 
              src="/learning_path_1.png"
              alt="Learning Path Example"
              width={600}
              height={400}
              className={styles.heroImage}
              priority
            />
          </div>

          {/* Feature Pills */}
          <div className={styles.featurePills}>
            <div className={styles.featurePill}>
              <Image src="/file.svg" alt="" width={20} height={20} />
              <span>Personalized learning path</span>
            </div>
            <div className={styles.featurePill}>
              <Image src="/globe.svg" alt="" width={20} height={20} />
              <span>Real-time AI assistant</span>
            </div>
            <div className={styles.featurePill}>
              <Image src="/knowledge_map.svg" alt="" width={20} height={20} />
              <span>Knowledge map</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.featuresSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Features</span>
            <h2 className={styles.sectionHeading}>Build knowledge Step by Step</h2>
            <p className={styles.sectionDescription}>
              Zero AI helps you break barriers and explore new fields with effortless, gamified learning.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {/* Feature Card 1 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📇</div>
              <h3 className={styles.featureTitle}>Keyword Cards</h3>
              <p className={styles.featureDescription}>
                Atomic knowledge units with clear explanation, examples, and resources to build your foundation.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🛤️</div>
              <h3 className={styles.featureTitle}>Learning Paths</h3>
              <p className={styles.featureDescription}>
                Personalized routes based on your interests and goals, generated dynamically by AI Agents.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🏆</div>
              <h3 className={styles.featureTitle}>Achievement System</h3>
              <p className={styles.featureDescription}>
                Track your milestones, visualize your growth, and build your structured knowledge map.
              </p>
            </div>
          </div>

          <div className={styles.featureShowcase}>
            <Image 
              src="/learning_path_1.png"
              alt="Learning Path Showcase"
              width={400}
              height={300}
              className={styles.showcaseImage}
            />
          </div>
        </section>

        {/* Use Cases Section */}
        <section className={styles.useCasesSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Use Cases</span>
            <h2 className={styles.sectionHeading}>Your First Step Into New Knowledge</h2>
            <p className={styles.sectionDescription}>
              Zero AI empowers you to explore new fields, grow new skills, and nurture your curiosity — one step at a time.
            </p>
          </div>

          <div className={styles.useCaseGrid}>
            {/* Use Case 1 */}
            <div className={styles.useCaseCard}>
              <div className={styles.useCaseIcon}>💼</div>
              <h3 className={styles.useCaseTitle}>Switching Careers</h3>
              <p className={styles.useCaseDescription}>
                Prepare for new professional paths with a structured, beginner-friendly journey.
              </p>
            </div>

            {/* Use Case 2 */}
            <div className={styles.useCaseCard}>
              <div className={styles.useCaseIcon}>🎮</div>
              <h3 className={styles.useCaseTitle}>Exploring New Hobbies</h3>
              <p className={styles.useCaseDescription}>
                Dive into new interests with lightweight, gamified learning experiences.
              </p>
            </div>

            {/* Use Case 3 */}
            <div className={styles.useCaseCard}>
              <div className={styles.useCaseIcon}>🧩</div>
              <h3 className={styles.useCaseTitle}>Feeding Your Curiosity</h3>
              <p className={styles.useCaseDescription}>
                Satisfy your thirst for knowledge through modular, bite-sized exploration.
              </p>
            </div>

            {/* Use Case 4 */}
            <div className={styles.useCaseCard}>
              <div className={styles.useCaseIcon}>📚</div>
              <h3 className={styles.useCaseTitle}>Building Lifelong Learning Habits</h3>
              <p className={styles.useCaseDescription}>
                Stay motivated with milestones and achievement systems tailored to your goals.
              </p>
            </div>
          </div>
        </section>

        {/* Waitlist Section */}
        <section className={styles.waitlistSection}>
          <h2 className={styles.waitlistHeading}>
            Join the waitlist
          </h2>
          <p className={styles.waitlistText}>
            Be among the first to experience the future of learning with Zero AI.
          </p>
          <Link href={`/${locale}/login`} className={styles.waitlistButton}>
            🚀 Get Early Access
          </Link>
        </section>
      </div>
    </div>
  );
}
