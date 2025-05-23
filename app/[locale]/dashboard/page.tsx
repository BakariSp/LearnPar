'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { getUserSubscription, getDailyUsage, applyPromotionCode, checkDailyLimits, SubscriptionData, DailyUsageData } from '@/services/api/subscription';
import { getSetupCompleteStatus, getCurrentUser } from '@/services/auth';
import styles from './dashboard.module.css';
import { logAuthState, validateAuthState } from '@/utils/auth-debug';
import { supabase } from '@/services/supabase';

// Extend the API interface to include the limit_reached property we're using
interface ExtendedDailyUsageData extends DailyUsageData {
  paths: {
    used: number;
    limit: number;
    remaining: number;
    limit_reached?: boolean;
  };
  cards: {
    used: number;
    limit: number;
    remaining: number;
    limit_reached?: boolean;
  };
}

// Extend the API interface to include the usage data
interface ExtendedSubscriptionData extends SubscriptionData {
  usage?: {
    paths: {
      count: number;
      limit_reached: boolean;
      remaining: number;
    };
    cards: {
      count: number;
      limit_reached: boolean;
      remaining: number;
    };
  };
}

export default function DashboardPage() {
  const { user, isLoading, logout: contextLogout } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) || 'en' : 'en';
  const { t, i18n } = useTranslation('common');
  const searchParams = useSearchParams();
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const [subscriptionInfo, setSubscriptionInfo] = useState<ExtendedSubscriptionData | null>(null);
  const [dailyUsage, setDailyUsage] = useState<ExtendedDailyUsageData | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPromoSection, setShowPromoSection] = useState(false);
  const [showSubscriptionTable, setShowSubscriptionTable] = useState(false);

  // Check if setup is complete based on cookie status
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        // 1. 检查 setup_complete cookie
        const setupComplete = getSetupCompleteStatus();
        if (setupComplete) {
          setIsSetupComplete(true);
          return;
        }

        // 2. 检查数据库中的用户信息
        const currentUser = await getCurrentUser();
        if (currentUser && currentUser.username) {
          // 如果用户已经设置了用户名，说明已经完成设置
          setIsSetupComplete(true);
          return;
        }

        // 如果设置未完成，重定向到设置页面
        console.log('[Dashboard Debug] Setup not complete, redirecting to setup...');
        router.push(`/${locale}/setup`);
      } catch (error) {
        console.error('[Dashboard Debug] Error checking setup status:', error);
      }
    };

    checkSetupStatus();
  }, [router, locale]);

  // Check for show_upgrade query parameter and auto-expand upgrade section
  useEffect(() => {
    if (searchParams?.get('show_upgrade') === 'true') {
      setShowPromoSection(true);
      // Set error message if redirected from subscription limit error
      setError('You have reached your subscription limit. Please upgrade to continue creating learning paths.');
      // Scroll to subscription section
      setTimeout(() => {
        const subscriptionSection = document.querySelector(`.${styles.subscriptionSection}`);
        if (subscriptionSection) {
          subscriptionSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    }
  }, [searchParams]);

  // Add a debug effect
  useEffect(() => {
    // Log auth state for debugging
    if (typeof window !== 'undefined') {
      if (user) {
        logAuthState(user, isLoading, 'Dashboard Page');
        const validation = validateAuthState(user);
        console.log('[Dashboard Debug] Auth Validation:', validation);
      } else {
        console.log('[Dashboard Debug] User is null, auth validation skipped');
      }
    }
  }, [user, isLoading]);

  // Update the existing useEffect
  useEffect(() => {
    // Redirect to login if not authenticated
    console.log('[Dashboard Debug] Authentication check - isLoading:', isLoading, 'user:', user);
    
    // Add a small delay to ensure auth state has fully synchronized
    const checkAuthState = setTimeout(async () => {
      if (!isLoading) {
        // Check both AuthContext state and direct Supabase session
        try {
          const { data } = await supabase.auth.getSession();
          const hasSupabaseSession = !!data.session;
          
          console.log('[Dashboard Debug] Auth check results - AuthContext user:', !!user, 'Supabase session:', hasSupabaseSession);
          
          // If we don't have a user in context or a valid Supabase session, redirect to login
          if (!user && !hasSupabaseSession) {
            console.log('[Dashboard Debug] No authentication found, redirecting to login...');
            
            // Add a query parameter to show a message about being logged out
            router.push(`/${locale}/login?error=session_expired`);
            return;
          }
          
          // If we have a Supabase session but no user in context, refresh the page
          // This handles edge cases where the auth state isn't properly synchronized
          if (hasSupabaseSession && !user && !window.location.search.includes('refreshed=true')) {
            console.log('[Dashboard Debug] Session exists but user state is null - refreshing page');
            // Add a query param to prevent infinite refresh loops
            window.location.href = `/${locale}/dashboard?refreshed=true`;
            return;
          }

          // 如果用户已认证，确保保持在 dashboard
          if (user) {
            console.log('[Dashboard Debug] User authenticated, showing dashboard');
            localStorage.setItem('last_authenticated_route', `/${locale}/dashboard`);
          }
        } catch (error) {
          console.error('[Dashboard Debug] Error checking auth state:', error);
          // If we can't verify the auth state, redirect to login to be safe
          router.push(`/${locale}/login?error=auth_check_failed`);
          return;
        }
      }
    }, 500); // Short delay to ensure auth state is properly synchronized

    return () => clearTimeout(checkAuthState);
  }, [isLoading, user, router, locale]);

  // Fetch the user's current subscription info and daily usage
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!user) return;

      try {
        setSubLoading(true);
        
        // Get the subscription info which now includes daily usage
        const subscriptionData = await getUserSubscription();
        console.log('Raw API subscription data:', subscriptionData);
        
        if (subscriptionData) {
          // Properly map the data to our expected format
          const mappedSubscription = { ...subscriptionData };
          
          // Handle API response where subscription type is inside 'plan' object
          if (subscriptionData.plan && subscriptionData.plan.type && !subscriptionData.subscription_type) {
            mappedSubscription.subscription_type = subscriptionData.plan.type;
            
            // If limits are provided, map them to the expected format
            if (subscriptionData.daily_limits && !subscriptionData.limits) {
              mappedSubscription.limits = {
                paths: subscriptionData.daily_limits.paths || 0,
                cards: subscriptionData.daily_limits.cards || 0
              };
            }
          }
          
          console.log('Mapped subscription info:', mappedSubscription);
          setSubscriptionInfo(mappedSubscription);
          
          // Set daily usage from subscription data if available
          if (subscriptionData.daily_usage &&
              subscriptionData.daily_usage.paths &&
              subscriptionData.daily_usage.cards) {
            
            // Convert subscription daily_usage to DailyUsageData format
            const extractedUsage: ExtendedDailyUsageData = {
              paths: {
                used: subscriptionData.daily_usage.paths.count || 0,
                limit: subscriptionData.daily_limits?.paths || 0,
                remaining: subscriptionData.daily_usage.paths.remaining || 0,
                limit_reached: Boolean(subscriptionData.daily_usage.paths.limit_reached)
              },
              cards: {
                used: subscriptionData.daily_usage.cards.count || 0,
                limit: subscriptionData.daily_limits?.cards || 0,
                remaining: subscriptionData.daily_usage.cards.remaining || 0,
                limit_reached: Boolean(subscriptionData.daily_usage.cards.limit_reached)
              },
              // Add these fields to match DailyUsageData interface
              subscription_tier: mappedSubscription.subscription_type || 'free',
              usage_date: subscriptionData.daily_usage.date || new Date().toISOString().split('T')[0]
            };
            
            console.log('Extracted daily usage from subscription:', extractedUsage);
            setDailyUsage(extractedUsage);
          } else {
            // If daily usage is not in subscription, fetch it separately
            try {
              console.log('Fetching separate daily usage data');
              const usageData = await getDailyUsage();
              console.log('Received daily usage data:', usageData);
              
              if (usageData) {
                // Always create a properly structured ExtendedDailyUsageData object
                // even if the API returns incomplete data
                const extendedUsageData: ExtendedDailyUsageData = {
                  paths: {
                    used: usageData.paths?.used || 0,
                    limit: usageData.paths?.limit || 3, // Default to free tier
                    remaining: usageData.paths?.remaining || 3, // Default remaining
                    limit_reached: false // Default to false
                  },
                  cards: {
                    used: usageData.cards?.used || 0,
                    limit: usageData.cards?.limit || 20, // Default to free tier
                    remaining: usageData.cards?.remaining || 20, // Default remaining
                    limit_reached: false // Default to false
                  },
                  subscription_tier: usageData.subscription_tier || mappedSubscription.subscription_type || 'free',
                  usage_date: usageData.usage_date || new Date().toISOString().split('T')[0]
                };
                
                console.log('Processed daily usage data:', extendedUsageData);
                setDailyUsage(extendedUsageData);
              } else {
                // If we get null from getDailyUsage, create default usage data
                console.log('Creating default usage data because getDailyUsage returned null');
                const currentTier = mappedSubscription.subscription_type || 'free';
                const defaultUsageData: ExtendedDailyUsageData = {
                  paths: {
                    used: 0,
                    limit: currentTier === 'free' ? 3 : currentTier === 'standard' ? 10 : 100,
                    remaining: currentTier === 'free' ? 3 : currentTier === 'standard' ? 10 : 100,
                    limit_reached: false
                  },
                  cards: {
                    used: 0,
                    limit: currentTier === 'free' ? 20 : currentTier === 'standard' ? 50 : 500,
                    remaining: currentTier === 'free' ? 20 : currentTier === 'standard' ? 50 : 500,
                    limit_reached: false
                  },
                  subscription_tier: currentTier,
                  usage_date: new Date().toISOString().split('T')[0]
                };
                setDailyUsage(defaultUsageData);
              }
            } catch (usageError) {
              console.error('Error fetching separate daily usage:', usageError);
              // Create default usage data on error too
              const currentTier = mappedSubscription.subscription_type || 'free';
              const fallbackUsageData: ExtendedDailyUsageData = {
                paths: {
                  used: 0,
                  limit: currentTier === 'free' ? 3 : currentTier === 'standard' ? 10 : 100,
                  remaining: currentTier === 'free' ? 3 : currentTier === 'standard' ? 10 : 100,
                  limit_reached: false
                },
                cards: {
                  used: 0,
                  limit: currentTier === 'free' ? 20 : currentTier === 'standard' ? 50 : 500,
                  remaining: currentTier === 'free' ? 20 : currentTier === 'standard' ? 50 : 500,
                  limit_reached: false
                },
                subscription_tier: currentTier,
                usage_date: new Date().toISOString().split('T')[0]
              };
              setDailyUsage(fallbackUsageData);
            }
          }
        } else {
          console.error('Failed to fetch subscription info: Empty response');
          setError('Failed to load subscription information. Some features may not work correctly.');
          
          // Create default usage data in this case too
          const defaultUsageData: ExtendedDailyUsageData = {
            paths: {
              used: 0,
              limit: 3, // Default to free tier
              remaining: 3,
              limit_reached: false
            },
            cards: {
              used: 0,
              limit: 20, // Default to free tier
              remaining: 20,
              limit_reached: false
            },
            subscription_tier: 'free',
            usage_date: new Date().toISOString().split('T')[0]
          };
          setDailyUsage(defaultUsageData);
        }
      } catch (err) {
        setError('Failed to load subscription information. Please try again later.');
        console.error('Error fetching subscription data:', err);
        
        // Default data on any error
        const defaultUsageData: ExtendedDailyUsageData = {
          paths: {
            used: 0,
            limit: 3,
            remaining: 3,
            limit_reached: false
          },
          cards: {
            used: 0,
            limit: 20,
            remaining: 20,
            limit_reached: false
          },
          subscription_tier: 'free',
          usage_date: new Date().toISOString().split('T')[0]
        };
        setDailyUsage(defaultUsageData);
      } finally {
        setSubLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [user]);

  // Add a new useEffect that directly checks Supabase auth state
  useEffect(() => {
    const checkSupabaseAuth = async () => {
      if (typeof window !== 'undefined') {
        try {
          // Direct session check with Supabase
          const { data, error } = await supabase.auth.getSession();
          console.log('[Dashboard] Direct Supabase session check:', {
            hasSession: !!data.session,
            userData: data.session?.user?.id,
            error: error || 'none'
          });
          
          // If we have a session but AuthContext doesn't reflect it
          if (data.session && !user && !isLoading) {
            console.log('[Dashboard] Session exists but user state is null - handling edge case');
            // Instead of redirecting, try to refresh the page only once
            if (!window.location.search.includes('attempted_refresh=true')) {
              console.log('[Dashboard] Attempting page refresh to reconcile auth state');
              window.location.href = `${window.location.pathname}?attempted_refresh=true`;
            } else {
              console.log('[Dashboard] Already attempted refresh, showing dashboard anyway');
              // If we've already tried refreshing, force the dashboard to load
              // You could optionally set a local user state here if needed
            }
          }
        } catch (err) {
          console.error('[Dashboard] Error checking Supabase session:', err);
        }
      }
    };
    
    checkSupabaseAuth();
  }, [user, isLoading]);

  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  const handleLogout = () => {
    contextLogout();
    router.push(`/${locale}/logged-out`);
  };

  const handleUpgradeSubscription = async () => {
    if (!promoCode) {
      setError('Please enter a promotion code');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Use the specific promotion code function
      const response = await applyPromotionCode(promoCode);
      
      if (response?.success) {
        setUpgradeSuccess(true);
        setUpgradeMessage(response.message || 'Subscription upgraded successfully!');
        
        // Set a brief timeout before refreshing the page to allow the success message to be shown
        setTimeout(() => {
          // Use window.location.reload() to refresh the entire page
          window.location.reload();
        }, 500); // 0.5 second delay to show the success message before refresh
        
        setShowPromoSection(false);
        setPromoCode('');
      } else {
        setError(response?.message || 'Failed to apply promotion code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during subscription upgrade');
      console.error('Error upgrading subscription:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getFeatureStatus = (plan: 'free' | 'standard' | 'premium', feature: string) => {
    switch (feature) {
      case 'learningPaths':
        return plan === 'free' ? '3' : plan === 'standard' ? '10' : '100';
      case 'flashcards':
        return plan === 'free' ? '20' : plan === 'standard' ? '50' : '500';
      case 'customSections':
        return '✓';
      case 'aiAssistant':
        return plan === 'free' ? 'Limited' : '✓';
      case 'prioritySupport':
        return plan === 'free' ? '✗' : '✓';
      case 'advancedAnalytics':
        return plan === 'free' || plan === 'standard' ? '✗' : '✓';
      default:
        return '';
    }
  };

  const handleCreateNew = async (type: 'path' | 'card') => {
    try {
      // Check if user has remaining daily limits
      const limits = await checkDailyLimits();
      
      if (type === 'path' && !limits.canCreatePaths) {
        setError(limits.message || 'You have reached your daily limit for learning paths');
        // Auto-scroll to the subscription section to show the error
        document.querySelector(`.${styles.subscriptionSection}`)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      
      if (type === 'card' && !limits.canCreateCards) {
        setError(limits.message || 'You have reached your daily limit for flashcards');
        // Auto-scroll to the subscription section to show the error
        document.querySelector(`.${styles.subscriptionSection}`)?.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      
      // If limits are not reached, navigate to the appropriate creation page
      if (type === 'path') {
        router.push(`/${locale}/home`);
      } else {
        router.push(`/${locale}/create-flashcard`);
      }
    } catch (err) {
      console.error('Error checking limits:', err);
      setError('Unable to check your usage limits. Please try again.');
    }
  };

  const handleLanguageSwitch = () => {
    const segments = window.location.pathname.replace(/^\/+/, '').split('/');
    const currentLocale = segments[0];
    const newLocale = currentLocale === 'en' ? 'zh' : 'en';
    segments[0] = newLocale;
    const newPath = '/' + segments.join('/');
    // 设置 cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/`;
    // 跳转
    window.location.replace(newPath);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderDailyUsageStats = () => {
    if (!subscriptionInfo || subLoading) return null;
    
    // Check if we have standalone dailyUsage or if it's embedded in subscriptionInfo
    const usageData = dailyUsage;
    
    // If we don't have any usage data, return null
    if (!usageData) {
      console.log('No usage data available for rendering stats');
      return null;
    }
    
    // Add additional null checks for paths and cards properties
    if (!usageData.paths || !usageData.cards) {
      console.log('Missing paths or cards in usage data', usageData);
      return null;
    }
    
    // Get the current subscription type
    const currentPlan = subscriptionInfo?.subscription_type || 
                        (subscriptionInfo?.plan?.type) || 'free';
    const isPremium = currentPlan === 'premium';

    // Get the usage date
    const usageDate = usageData.usage_date || new Date().toISOString().split('T')[0];

    return (
      <div className={styles.usageStatsContainer}>
        <h3 className={styles.usageStatsTitle}>Daily Usage ({new Date(usageDate).toLocaleDateString()})</h3>
        
        {/* Add limit warning when close to or at limits (only for non-premium users) */}
        {!isPremium && renderLimitWarnings(usageData)}
        
        <div className={styles.usageStatsGrid}>
          <div className={styles.usageStatItem}>
            <p className={styles.usageStatLabel}>Learning Paths</p>
            <div className={styles.progressBarContainer}>
              {!isPremium ? (
                <>
                  <div className={styles.progressBar}>
                    <div 
                      className={`${styles.progressBarFill} ${
                        usageData.paths.remaining <= 0 ? styles.limit : ''
                      }`}
                      style={{ 
                        width: `${Math.min(100, ((usageData.paths.used || 0) / (usageData.paths.limit || 1)) * 100)}%`
                      }}
                    ></div>
                  </div>
                  <span className={styles.progressBarText}>
                    {usageData.paths.used || 0} / {usageData.paths.limit || 0} 
                    <span className={styles.remainingIndicator}>
                      ({usageData.paths.remaining || 0} remaining today)
                    </span>
                  </span>
                </>
              ) : (
                <span className={styles.progressBarText}>
                  <span className={styles.unlimitedBadge}>Unlimited</span>
                </span>
              )}
            </div>
          </div>
          <div className={styles.usageStatItem}>
            <p className={styles.usageStatLabel}>Flashcards</p>
            <div className={styles.progressBarContainer}>
              {!isPremium ? (
                <>
                  <div className={styles.progressBar}>
                    <div 
                      className={`${styles.progressBarFill} ${
                        usageData.cards.remaining <= 0 ? styles.limit : ''
                      }`}
                      style={{ 
                        width: `${Math.min(100, ((usageData.cards.used || 0) / (usageData.cards.limit || 1)) * 100)}%`
                      }}
                    ></div>
                  </div>
                  <span className={styles.progressBarText}>
                    {usageData.cards.used || 0} / {usageData.cards.limit || 0}
                    <span className={styles.remainingIndicator}>
                      ({usageData.cards.remaining || 0} remaining today)
                    </span>
                  </span>
                </>
              ) : (
                <span className={styles.progressBarText}>
                  <span className={styles.unlimitedBadge}>Unlimited</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <p className={styles.dailyLimitInfo}>
          Daily limits reset at midnight UTC. Viewing or editing existing content does not count towards these limits.
        </p>
      </div>
    );
  };

  const renderLimitWarnings = (usageData: any) => {
    if (!usageData || !usageData.paths || !usageData.cards) {
      console.log('Missing data for rendering limit warnings', usageData);
      return null;
    }
    
    // Safely access all properties with default values if not present
    // This ensures the function never breaks, even with incomplete data
    const pathsUsed = typeof usageData.paths.used === 'number' ? usageData.paths.used : 0;
    const pathsLimit = typeof usageData.paths.limit === 'number' ? usageData.paths.limit : 3;
    const pathsRemaining = typeof usageData.paths.remaining === 'number' ? usageData.paths.remaining : 0;
    
    const cardsUsed = typeof usageData.cards.used === 'number' ? usageData.cards.used : 0;
    const cardsLimit = typeof usageData.cards.limit === 'number' ? usageData.cards.limit : 20;
    const cardsRemaining = typeof usageData.cards.remaining === 'number' ? usageData.cards.remaining : 0;
    
    // Check if explicit limit_reached flag exists in the data structure
    const hasPathLimitFlag = 'limit_reached' in usageData.paths;
    const hasCardLimitFlag = 'limit_reached' in usageData.cards;
    
    console.log('Usage data analysis:', {
      hasPathLimitFlag,
      hasCardLimitFlag,
      pathsRemaining,
      cardsRemaining,
      pathsUsed,
      pathsLimit,
      cardsUsed,
      cardsLimit
    });
    
    // Determine limit reached based on remaining counts or explicit flag
    const pathsLimitReached = hasPathLimitFlag ? 
      usageData.paths.limit_reached === true : pathsRemaining <= 0;
      
    const cardsLimitReached = hasCardLimitFlag ? 
      usageData.cards.limit_reached === true : cardsRemaining <= 0;
    
    // Only show "approaching limit" warnings if not already at the limit
    // and if remaining is less than 20% of the limit
    const pathsNearLimit = !pathsLimitReached && 
                          pathsRemaining > 0 && 
                          pathsLimit > 0 && 
                          pathsRemaining <= Math.max(1, Math.floor(pathsLimit * 0.2));
                          
    const cardsNearLimit = !cardsLimitReached && 
                          cardsRemaining > 0 && 
                          cardsLimit > 0 && 
                          cardsRemaining <= Math.max(2, Math.floor(cardsLimit * 0.2));
    
    // Debug logs
    console.log('Warning flags:', {
      pathsLimitReached,
      cardsLimitReached,
      pathsNearLimit,
      cardsNearLimit
    });
    
    if (!pathsLimitReached && !cardsLimitReached && !pathsNearLimit && !cardsNearLimit) {
      return null;
    }
    
    // Get current subscription tier for upgrade messaging
    let currentTier = 'free';
    if (subscriptionInfo) {
      currentTier = subscriptionInfo.subscription_type || 
                  (subscriptionInfo.plan && subscriptionInfo.plan.type) || 'free';
    }
    
    // Check for query param indicating a redirect from subscription limit error
    const isUpgradeRedirect = typeof window !== 'undefined' && 
      window.location.search.includes('show_upgrade=true');
    
    // Continue with the existing JSX rendering...
    return (
      <div className={styles.limitWarningsContainer}>
        {pathsLimitReached && (
          <div className={`${styles.limitAlert} ${isUpgradeRedirect ? styles.highlightedAlert : ''}`}>
            <div className={styles.alertIcon}>⚠️</div>
            <div className={styles.alertText}>
              <strong>Learning Paths Limit Reached</strong>
              <p>You've used all your daily learning paths. Upgrade your subscription for higher limits.</p>
              <ul className={styles.upgradeOptions}>
                <li><strong>Free:</strong> 3 learning paths per day</li>
                <li><strong>Standard:</strong> 10 learning paths per day</li>
                <li><strong>Premium:</strong> Unlimited learning paths</li>
              </ul>
              {currentTier !== 'premium' && (
                <button 
                  className={styles.upgradePromptButton}
                  onClick={() => setShowPromoSection(true)}
                >
                  Upgrade Now
                </button>
              )}
            </div>
          </div>
        )}
        
        {cardsLimitReached && (
          <div className={`${styles.limitAlert} ${isUpgradeRedirect ? styles.highlightedAlert : ''}`}>
            <div className={styles.alertIcon}>⚠️</div>
            <div className={styles.alertText}>
              <strong>Flashcards Limit Reached</strong>
              <p>You've used all your daily flashcards. Upgrade your subscription for higher limits.</p>
              <ul className={styles.upgradeOptions}>
                <li><strong>Free:</strong> 20 flashcards per day</li>
                <li><strong>Standard:</strong> 50 flashcards per day</li>
                <li><strong>Premium:</strong> Unlimited flashcards</li>
              </ul>
              {currentTier !== 'premium' && (
                <button 
                  className={styles.upgradePromptButton}
                  onClick={() => setShowPromoSection(true)}
                >
                  Upgrade Now
                </button>
              )}
            </div>
          </div>
        )}
        
        {pathsNearLimit && (
          <div className={styles.limitWarning}>
            <div className={styles.warningIcon}>ℹ️</div>
            <div className={styles.warningText}>
              <strong>Learning Paths Limit Approaching</strong>
              <p>You have only {pathsRemaining} learning paths remaining today.</p>
            </div>
          </div>
        )}
        
        {cardsNearLimit && (
          <div className={styles.limitWarning}>
            <div className={styles.warningIcon}>ℹ️</div>
            <div className={styles.warningText}>
              <strong>Flashcards Limit Approaching</strong>
              <p>You have only {cardsRemaining} flashcards remaining today.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSubscriptionSection = () => {
    if (subLoading) return <div className={styles.loadingSpinner}></div>;
    
    // Get subscription type from either subscription_type or plan.type
    const currentPlan = subscriptionInfo?.subscription_type || 
                        (subscriptionInfo?.plan?.type) || 'free';
    
    return (
      <div className={`${styles.subscriptionSection} card`}>
        <div className={styles.subscriptionHeader}>
          <h3 className="heading-md">{t('Subscription.subscriptionPlans')}</h3>
          <div className={styles.currentSubscriptionBadge} style={{ backgroundColor: 'var(--primary-accent)' }}>
            {currentPlan === 'free' ? t('Subscription.freeTier') : 
             currentPlan === 'standard' ? t('Subscription.standardTier') : 
             t('Subscription.premiumTier')}
          </div>
        </div>
        
        {/* Show daily usage stats if available */}
        {renderDailyUsageStats()}
        
        {/* Fallback information if stats can't be loaded */}
        {(!subscriptionInfo?.usage || !dailyUsage) && (
          <div className={styles.fallbackSubscriptionInfo}>
            <h4 className="heading-md">{t('Subscription.currentPlan')}: {currentPlan === 'free' ? t('Subscription.freeTier') : 
             currentPlan === 'standard' ? t('Subscription.standardTier') : 
             t('Subscription.premiumTier')}</h4>
            <p className="text-regular">{t('Subscription.currentUsage')}:</p>
            <ul>
              <li>{t('Subscription.learningPaths')}: {currentPlan === 'free' ? '3' : currentPlan === 'standard' ? '10' : t('Subscription.unlimited')} {t('Subscription.perDay')}</li>
              <li>{t('Subscription.flashcards')}: {currentPlan === 'free' ? '20' : currentPlan === 'standard' ? '50' : t('Subscription.unlimited')} {t('Subscription.perDay')}</li>
            </ul>
            <p className="text-small">{t('Subscription.refreshForDetails')}</p>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
        
        {/* Success message */}
        {upgradeSuccess && (
          <div className={styles.success}>
            {upgradeMessage}
          </div>
        )}
        
        <div className={styles.subscriptionActions}>
          {currentPlan !== 'premium' && (
            <button 
              className="button-primary"
              onClick={() => setShowPromoSection(!showPromoSection)}
              style={{ marginRight: '1rem' }}
            >
              {showPromoSection ? t('Subscription.hideUpgrade') : t('Subscription.upgrade')}
            </button>
          )}
          <button 
            className={styles.logoutButton}
            onClick={() => setShowSubscriptionTable(!showSubscriptionTable)}
          >
            {showSubscriptionTable ? t('Subscription.hideDetails') : t('Subscription.showDetails')}
          </button>
        </div>
        
        {showPromoSection && (
          <div className={styles.upgradeContainer}>
            <div className={styles.promoCodeContainer}>
              <h4 className="heading-md">{t('Subscription.enterPromoCode')}</h4>
              <div className={styles.promoCodeForm}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder={t('Subscription.enterPromoCode')}
                  className={styles.promoCodeInput}
                />
                <button
                  onClick={handleUpgradeSubscription}
                  disabled={submitting}
                  className="button-primary"
                >
                  {submitting ? t('Subscription.processing') : t('Subscription.applyCode')}
                </button>
              </div>
              <p className={styles.promoInfo}>
                {t('Subscription.promoCodeInfo')}
              </p>
            </div>
          </div>
        )}
        
        {/* Feature comparison table - now collapsible */}
        {showSubscriptionTable && (
          <div className={styles.featureTable}>
            <h3 className="heading-md">{t('Subscription.planComparison')}</h3>
            <table className={styles.subscriptionTable}>
              <thead>
                <tr>
                  <th>{t('Subscription.feature')}</th>
                  <th>{t('Subscription.freeTier')}</th>
                  <th>{t('Subscription.standardTier')}</th>
                  <th>{t('Subscription.premiumTier')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('Subscription.dailyLearningPaths')}</td>
                  <td>3</td>
                  <td>10</td>
                  <td>{t('Subscription.unlimited')}</td>
                </tr>
                <tr>
                  <td>{t('Subscription.dailyFlashcards')}</td>
                  <td>20</td>
                  <td>50</td>
                  <td>{t('Subscription.unlimited')}</td>
                </tr>
                <tr>
                  <td>{t('Subscription.customSections')}</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>{t('Subscription.aiAssistant')}</td>
                  <td>{t('Subscription.limited')}</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>{t('Subscription.prioritySupport')}</td>
                  <td>✗</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>{t('Subscription.advancedAnalytics')}</td>
                  <td>✗</td>
                  <td>✗</td>
                  <td>✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1 className="heading-xl">{t('dashboard.welcome')}</h1>
        <div className={styles.headerActions}>
          <button onClick={handleLanguageSwitch} className={styles.languageButton}>
            {locale === 'en' ? '中文' : 'English'}
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            {t('sidebar.logout')}
          </button>
        </div>
      </div>

      <div className={`${styles.userInfoCard} card`}>
        <div className={styles.userProfile}>
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt={user.username || t('dashboard.user')} className={styles.profilePicture} />
          ) : (
            <div className={styles.profilePlaceholder}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className={styles.userDetails}>
            <h2 className="heading-lg">{user?.full_name || user?.username || t('dashboard.user')}</h2>
            <p className={styles.userEmail}>{user?.email || t('dashboard.noEmail')}</p>
            {user?.oauth_provider && (
              <span className={styles.oauthBadge}>{user.oauth_provider}</span>
            )}
          </div>
        </div>

        <div className={styles.accountInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.username')}</span>
            <span className={styles.infoValue}>{user?.username || t('dashboard.guest')}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.account_id')}</span>
            <span className={styles.infoValue}>{user?.id || t('dashboard.na')}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.account_status')}</span>
            <span className={`${styles.infoValue} ${user?.is_active ? styles.activeStatus : styles.inactiveStatus}`}>
              {user?.is_active ? t('dashboard.active') : t('dashboard.inactive')}
            </span>
          </div>
          {user?.created_at && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('dashboard.member_since')}</span>
              <span className={styles.infoValue}>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('Subscription.subscription')}</span>
            <span className={styles.infoValue}>
              {(subscriptionInfo?.subscription_type === 'free' || subscriptionInfo?.plan?.type === 'free') && t('Subscription.freeTier')}
              {(subscriptionInfo?.subscription_type === 'standard' || subscriptionInfo?.plan?.type === 'standard') && t('Subscription.standardTier')}
              {(subscriptionInfo?.subscription_type === 'premium' || subscriptionInfo?.plan?.type === 'premium') && t('Subscription.premiumTier')}
              {(!subscriptionInfo?.subscription_type && !subscriptionInfo?.plan?.type) && t('Subscription.freeTier')}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription section */}
      {renderSubscriptionSection()}

      <div className={styles.dashboardContent}>
        <div className={`${styles.dashboardCard} card`}>
          <h3 className="heading-md">{t('dashboard.recent_activity')}</h3>
          <p className={styles.emptyState}>{t('dashboard.no_activity')}</p>
        </div>

        <div className={`${styles.dashboardCard} card`}>
          <h3 className="heading-md">{t('dashboard.learning_resources')}</h3>
          <p className={styles.emptyState}>{t('dashboard.no_courses')}</p>
          <div className={styles.cardActions}>
            <button 
              className="button-primary"
              onClick={() => handleCreateNew('path')}
            >
              {t('dashboard.create_learning_path')}
            </button>
          </div>
        </div>

        <div className={`${styles.dashboardCard} card`}>
          <h3 className="heading-md">{t('dashboard.learning_progress')}</h3>
          <p className={styles.emptyState}>{t('dashboard.start_course')}</p>
        </div>
      </div>
    </div>
  );
}