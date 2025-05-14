'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './landing-page.module.css'; // Import the CSS module
import Link from 'next/link'; // Import Link for navigation
import Image from 'next/image';
import { useParams } from 'next/navigation'; // Import useParams to get locale

// Custom Hook for Intersection Observer
interface IntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  once?: boolean; // Option to unobserve after first intersection
}

function useIntersectionObserver(
  elementsRef: React.RefObject<HTMLElement[]>,
  options: IntersectionObserverOptions = { threshold: 0.1, once: true }
) {
  const [visibleElements, setVisibleElements] = useState<Set<Element>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const callback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setVisibleElements(prev => new Set(prev).add(entry.target));
        if (options.once && observerRef.current) {
          observerRef.current.unobserve(entry.target);
        }
      }
    });
  }, [options.once]);

  useEffect(() => {
    // Ensure elementsRef.current is not null and is an array
    if (!elementsRef.current || elementsRef.current.length === 0) {
      return;
    }
    
    const currentElements = elementsRef.current.filter(el => el !== null);
    if(currentElements.length === 0) return;


    observerRef.current = new IntersectionObserver(callback, options);
    const currentObserver = observerRef.current;

    currentElements.forEach(element => {
      if (element) { // Check if element is not null
        currentObserver.observe(element);
      }
    });

    return () => {
      currentElements.forEach(element => {
        if (element && currentObserver) { // Check if element and observer are not null
          currentObserver.unobserve(element);
        }
      });
    };
  }, [elementsRef, options, callback]);

  return visibleElements;
}

export default function LandingPage() {
  const params = useParams();
  const locale = params.locale || 'en';
  
  // Refs for elements we want to animate
  const elementsToAnimateRefs = useRef<Array<HTMLElement | null>>([]);
  
  // Helper function to add refs
  const addElementRef = useCallback((el: HTMLElement | null) => {
    if (el && !elementsToAnimateRefs.current.includes(el)) {
      elementsToAnimateRefs.current.push(el);
    }
  }, []);
  
  // Use a state to pass refs to the hook ensuring it re-runs if refs change
  // This might be overly complex for this specific case if elements are static,
  // but good practice for dynamic lists.
  const [elementNodes, setElementNodes] = useState<HTMLElement[]>([]);

  useEffect(() => {
    setElementNodes(elementsToAnimateRefs.current.filter(el => el !== null) as HTMLElement[]);
  }, []); // Runs once after initial render to collect all refs


  const visibleElements = useIntersectionObserver(
    // A bit of a hack to match types, ideally useIntersectionObserver would take RefObject<Array<HTMLElement | null>>
    { current: elementNodes }, 
    { threshold: 0.1, once: true }
  );
  
  // Helper to determine if an element should be visible
  const isVisible = (el: HTMLElement | null) => el ? visibleElements.has(el) : false;

  // A helper function to get the combined class names
  const getAnimatedClass = (refElement: HTMLElement | null) => {
    return `${styles.animateOnScroll} ${isVisible(refElement) ? styles.isVisible : ''}`;
  };
  
  // Create specific refs for elements we want to pass to getAnimatedClass
  // This is a bit verbose; an alternative is to query all cards within sections after mount.
  // For now, explicit refs are clearer.
  const featuresSectionRef = useRef<HTMLElement>(null);
  const featureCard1Ref = useRef<HTMLDivElement>(null);
  const featureCard2Ref = useRef<HTMLDivElement>(null);
  const featureCard3Ref = useRef<HTMLDivElement>(null);
  const useCasesSectionRef = useRef<HTMLElement>(null);
  const useCaseCard1Ref = useRef<HTMLDivElement>(null);
  const useCaseCard2Ref = useRef<HTMLDivElement>(null);
  const useCaseCard3Ref = useRef<HTMLDivElement>(null);
  const useCaseCard4Ref = useRef<HTMLDivElement>(null);
  const waitlistSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Populate the elementsToAnimateRefs.current array after refs are attached
    const refs = [
      featuresSectionRef.current,
      featureCard1Ref.current, featureCard2Ref.current, featureCard3Ref.current,
      useCasesSectionRef.current,
      useCaseCard1Ref.current, useCaseCard2Ref.current, useCaseCard3Ref.current, useCaseCard4Ref.current,
      waitlistSectionRef.current
    ];
    elementsToAnimateRefs.current = refs.filter(ref => ref !== null);
    setElementNodes(elementsToAnimateRefs.current as HTMLElement[]);
  }, []); // This effect runs once on mount

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
        <section 
          ref={featuresSectionRef}
          className={`${styles.featuresSection} ${getAnimatedClass(featuresSectionRef.current)}`}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Features</span>
            <h2 className={styles.sectionHeading}>Build knowledge Step by Step</h2>
            <p className={styles.sectionDescription}>
              Zero AI helps you break barriers and explore new fields with effortless, gamified learning.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {/* Feature Card 1 */}
            <div 
              ref={featureCard1Ref}
              className={`${styles.featureCard} ${getAnimatedClass(featureCard1Ref.current)}`}
            >
              <div className={styles.featureIcon}>📇</div>
              <h3 className={styles.featureTitle}>Keyword Cards</h3>
              <p className={styles.featureDescription}>
                Atomic knowledge units with clear explanation, examples, and resources to build your foundation.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div 
              ref={featureCard2Ref}
              className={`${styles.featureCard} ${getAnimatedClass(featureCard2Ref.current)}`}
            >
              <div className={styles.featureIcon}>🛤️</div>
              <h3 className={styles.featureTitle}>Learning Paths</h3>
              <p className={styles.featureDescription}>
                Personalized routes based on your interests and goals, generated dynamically by AI Agents.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div 
              ref={featureCard3Ref}
              className={`${styles.featureCard} ${getAnimatedClass(featureCard3Ref.current)}`}
            >
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
        <section 
          ref={useCasesSectionRef}
          className={`${styles.useCasesSection} ${getAnimatedClass(useCasesSectionRef.current)}`}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Use Cases</span>
            <h2 className={styles.sectionHeading}>Your First Step Into New Knowledge</h2>
            <p className={styles.sectionDescription}>
              Zero AI empowers you to explore new fields, grow new skills, and nurture your curiosity — one step at a time.
            </p>
          </div>

          <div className={styles.useCaseGrid}>
            {/* Use Case 1 */}
            <div 
              ref={useCaseCard1Ref}
              className={`${styles.useCaseCard} ${getAnimatedClass(useCaseCard1Ref.current)}`}
            >
              <div className={styles.useCaseIcon}>💼</div>
              <h3 className={styles.useCaseTitle}>Switching Careers</h3>
              <p className={styles.useCaseDescription}>
                Prepare for new professional paths with a structured, beginner-friendly journey.
              </p>
            </div>

            {/* Use Case 2 */}
            <div 
              ref={useCaseCard2Ref}
              className={`${styles.useCaseCard} ${getAnimatedClass(useCaseCard2Ref.current)}`}
            >
              <div className={styles.useCaseIcon}>🎮</div>
              <h3 className={styles.useCaseTitle}>Exploring New Hobbies</h3>
              <p className={styles.useCaseDescription}>
                Dive into new interests with lightweight, gamified learning experiences.
              </p>
            </div>

            {/* Use Case 3 */}
            <div 
              ref={useCaseCard3Ref}
              className={`${styles.useCaseCard} ${getAnimatedClass(useCaseCard3Ref.current)}`}
            >
              <div className={styles.useCaseIcon}>🧩</div>
              <h3 className={styles.useCaseTitle}>Feeding Your Curiosity</h3>
              <p className={styles.useCaseDescription}>
                Satisfy your thirst for knowledge through modular, bite-sized exploration.
              </p>
            </div>

            {/* Use Case 4 */}
            <div 
              ref={useCaseCard4Ref}
              className={`${styles.useCaseCard} ${getAnimatedClass(useCaseCard4Ref.current)}`}
            >
              <div className={styles.useCaseIcon}>📚</div>
              <h3 className={styles.useCaseTitle}>Building Lifelong Learning Habits</h3>
              <p className={styles.useCaseDescription}>
                Stay motivated with milestones and achievement systems tailored to your goals.
              </p>
            </div>
          </div>
        </section>

        {/* Waitlist Section */}
        <section 
          ref={waitlistSectionRef}
          className={`${styles.waitlistSection} ${getAnimatedClass(waitlistSectionRef.current)}`}
        >
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
