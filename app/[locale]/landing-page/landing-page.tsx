'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './landing-page.module.css'; // Import the CSS module
import Link from 'next/link'; // Import Link for navigation
import Image from 'next/image';
import { useParams } from 'next/navigation'; // Import useParams to get locale
import { TopNavBar } from '@/components/TopNavBar/top-nav-bar';
import { useTranslation } from 'react-i18next';

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
  const locale = params ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) || 'en' : 'en';
  const { t } = useTranslation('common');
  
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
      <TopNavBar locale={locale} />

      <div className={styles.contentWrapper}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroContent}>
            <span className={styles.subTitle}>{t('landing.hero_subtitle')}</span>
            <h1 className={styles.mainHeading}>
              {t('landing.hero_title_1')}<br />
              {t('landing.hero_title_2')}<br />
              {t('landing.hero_title_3', { brand: <span className={styles.accentText}>Zero AI</span> })}
            </h1>
            <div className={styles.heroButtons}>
              <Link href={`/${locale}/home`} className={styles.primaryButton}>
                {t('landing.get_started')}
              </Link>
              <Link href={`/${locale}/about`} className={styles.secondaryButton}>
                {t('landing.learn_more')}
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className={styles.heroImageContainer}>
            <Image 
              src="/learning_path_1.png"
              alt={t('landing.hero_image_alt')}
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
              <span>{t('landing.pill_personalized')}</span>
            </div>
            <div className={styles.featurePill}>
              <Image src="/globe.svg" alt="" width={20} height={20} />
              <span>{t('landing.pill_realtime')}</span>
            </div>
            <div className={styles.featurePill}>
              <Image src="/knowledge_map.svg" alt="" width={20} height={20} />
              <span>{t('landing.pill_knowledge_map')}</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section 
          ref={featuresSectionRef}
          className={`${styles.featuresSection} ${getAnimatedClass(featuresSectionRef.current)}`}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>{t('landing.features_tag')}</span>
            <h2 className={styles.sectionHeading}>{t('landing.features_heading')}</h2>
            <p className={styles.sectionDescription}>
              {t('landing.features_desc')}
            </p>
          </div>

          <div className={styles.featureGrid}>
            {/* Feature Card 1 */}
            <div 
              ref={featureCard1Ref}
              className={`${styles.featureCard} ${getAnimatedClass(featureCard1Ref.current)}`}
            >
              <div className={styles.featureIcon}>📇</div>
              <h3 className={styles.featureTitle}>{t('landing.feature_card1_title')}</h3>
              <p className={styles.featureDescription}>
                {t('landing.feature_card1_desc')}
              </p>
            </div>

            {/* Feature Card 2 */}
            <div 
              ref={featureCard2Ref}
              className={`${styles.featureCard} ${getAnimatedClass(featureCard2Ref.current)}`}
            >
              <div className={styles.featureIcon}>🛤️</div>
              <h3 className={styles.featureTitle}>{t('landing.feature_card2_title')}</h3>
              <p className={styles.featureDescription}>
                {t('landing.feature_card2_desc')}
              </p>
            </div>

            {/* Feature Card 3 */}
            <div 
              ref={featureCard3Ref}
              className={`${styles.featureCard} ${getAnimatedClass(featureCard3Ref.current)}`}
            >
              <div className={styles.featureIcon}>🏆</div>
              <h3 className={styles.featureTitle}>{t('landing.feature_card3_title')}</h3>
              <p className={styles.featureDescription}>
                {t('landing.feature_card3_desc')}
              </p>
            </div>
          </div>

          <div className={styles.featureShowcase}>
            <Image 
              src="/learning_path_1.png"
              alt={t('landing.showcase_image_alt')}
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
            <span className={styles.sectionTag}>{t('landing.usecases_tag')}</span>
            <h2 className={styles.sectionHeading}>{t('landing.usecases_heading')}</h2>
            <p className={styles.sectionDescription}>
              {t('landing.usecases_desc')}
            </p>
          </div>

          <div className={styles.useCaseGrid}>
            {/* Use Case 1 */}
            <div 
              ref={useCaseCard1Ref}
              className={`${styles.useCaseCard} ${getAnimatedClass(useCaseCard1Ref.current)}`}
            >
              <div className={styles.useCaseIcon}>💼</div>
              <h3 className={styles.useCaseTitle}>{t('landing.usecase1_title')}</h3>
              <p className={styles.useCaseDescription}>
                {t('landing.usecase1_desc')}
              </p>
            </div>

            {/* Use Case 2 */}
            <div 
              ref={useCaseCard2Ref}
              className={`${styles.useCaseCard} ${getAnimatedClass(useCaseCard2Ref.current)}`}
            >
              <div className={styles.useCaseIcon}>🎮</div>
              <h3 className={styles.useCaseTitle}>{t('landing.usecase2_title')}</h3>
              <p className={styles.useCaseDescription}>
                {t('landing.usecase2_desc')}
              </p>
            </div>

            {/* Use Case 3 */}
            <div 
              ref={useCaseCard3Ref}
              className={`${styles.useCaseCard} ${getAnimatedClass(useCaseCard3Ref.current)}`}
            >
              <div className={styles.useCaseIcon}>🧩</div>
              <h3 className={styles.useCaseTitle}>{t('landing.usecase3_title')}</h3>
              <p className={styles.useCaseDescription}>
                {t('landing.usecase3_desc')}
              </p>
            </div>

            {/* Use Case 4 */}
            <div 
              ref={useCaseCard4Ref}
              className={`${styles.useCaseCard} ${getAnimatedClass(useCaseCard4Ref.current)}`}
            >
              <div className={styles.useCaseIcon}>📚</div>
              <h3 className={styles.useCaseTitle}>{t('landing.usecase4_title')}</h3>
              <p className={styles.useCaseDescription}>
                {t('landing.usecase4_desc')}
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
            {t('landing.waitlist_heading')}
          </h2>
          <p className={styles.waitlistText}>
            {t('landing.waitlist_text')}
          </p>
          <Link href={`/${locale}/login`} className={styles.waitlistButton}>
            🚀 {t('landing.get_early_access')}
          </Link>
        </section>
      </div>
    </div>
  );
}
