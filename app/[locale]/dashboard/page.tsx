'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { getUserSubscription, getDailyUsage, applyPromotionCode, checkDailyLimits, SubscriptionData, DailyUsageData } from '@/services/api/subscription';
import styles from './dashboard.module.css';

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

// Add this interface to the top of the file with the other interface definitions
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
  const { t } = useTranslation('common');
  const searchParams = useSearchParams();

  const [subscriptionInfo, setSubscriptionInfo] = useState<ExtendedSubscriptionData | null>(null);
  const [dailyUsage, setDailyUsage] = useState<ExtendedDailyUsageData | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPromoSection, setShowPromoSection] = useState(false);

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

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/${locale}/login`);
    }
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
              const usageData = await getDailyUsage();
              
              if (usageData && usageData.paths && usageData.cards) {
                // Create a proper ExtendedDailyUsageData object
                const extendedUsageData: ExtendedDailyUsageData = {
                  ...usageData,
                  paths: {
                    ...usageData.paths,
                    limit_reached: false  // Default to false if not provided
                  },
                  cards: {
                    ...usageData.cards,
                    limit_reached: false  // Default to false if not provided
                  }
                };
                
                console.log('Separate daily usage data:', extendedUsageData);
                setDailyUsage(extendedUsageData);
              } else if (usageData) {
                console.warn('Daily usage data is missing required properties:', usageData);
              }
            } catch (usageError) {
              console.error('Error fetching separate daily usage:', usageError);
            }
          }
        } else {
          console.error('Failed to fetch subscription info: Empty response');
          setError('Failed to load subscription information. Some features may not work correctly.');
        }
      } catch (err) {
        setError('Failed to load subscription information. Please try again later.');
        console.error('Error fetching subscription data:', err);
      } finally {
        setSubLoading(false);
      }
    };

    fetchSubscriptionData();
  }, [user]);

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
        router.push(`/${locale}/create-learning-path`);
      } else {
        router.push(`/${locale}/create-flashcard`);
      }
    } catch (err) {
      console.error('Error checking limits:', err);
      setError('Unable to check your usage limits. Please try again.');
    }
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
    
    // CRITICAL CHANGE: Check if limit_reached exists in the data structure
    // and only use it if it does
    const hasPathLimitFlag = 'limit_reached' in usageData.paths;
    const hasCardLimitFlag = 'limit_reached' in usageData.cards;
    
    console.log('API data structure analysis:', {
      hasPathLimitFlag,
      hasCardLimitFlag,
      pathsRemaining: usageData.paths.remaining,
      cardsRemaining: usageData.cards.remaining
    });
    
    // Check remaining counts instead of relying on limit_reached flag
    // This will work regardless of whether the API provides the flag
    const pathsRemaining = typeof usageData.paths.remaining === 'number' ? usageData.paths.remaining : 0;
    const cardsRemaining = typeof usageData.cards.remaining === 'number' ? usageData.cards.remaining : 0;
    
    // Determine limit reached based on remaining counts when flag isn't present
    const pathsLimitReached = hasPathLimitFlag ? 
      usageData.paths.limit_reached === true : pathsRemaining <= 0;
      
    const cardsLimitReached = hasCardLimitFlag ? 
      usageData.cards.limit_reached === true : cardsRemaining <= 0;
    
    // Check path limits and card limits
    const pathLimit = typeof usageData.paths.limit === 'number' ? usageData.paths.limit : 1;
    const cardLimit = typeof usageData.cards.limit === 'number' ? usageData.cards.limit : 1;
    
    // Only show "approaching limit" warnings if not already at the limit
    // and if remaining is less than 20% of the limit
    const pathsNearLimit = !pathsLimitReached && 
                          pathsRemaining > 0 && 
                          pathLimit > 0 && 
                          pathsRemaining <= (pathLimit * 0.2);
                          
    const cardsNearLimit = !cardsLimitReached && 
                          cardsRemaining > 0 && 
                          cardLimit > 0 && 
                          cardsRemaining <= (cardLimit * 0.2);
    
    // Debug logs
    console.log('Warning flags after checking API data:', {
      pathsLimitReached,
      cardsLimitReached,
      pathsNearLimit,
      cardsNearLimit
    });
    
    if (!pathsLimitReached && !cardsLimitReached && !pathsNearLimit && !cardsNearLimit) {
      return null;
    }
    
    // Check for query param indicating a redirect from subscription limit error
    const isUpgradeRedirect = typeof window !== 'undefined' && 
      window.location.search.includes('show_upgrade=true');
    
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
              {subscriptionInfo?.subscription_type !== 'premium' && (
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
              {subscriptionInfo?.subscription_type !== 'premium' && (
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
              <p>You have only {usageData.paths.remaining} learning paths remaining today.</p>
            </div>
          </div>
        )}
        
        {cardsNearLimit && (
          <div className={styles.limitWarning}>
            <div className={styles.warningIcon}>ℹ️</div>
            <div className={styles.warningText}>
              <strong>Flashcards Limit Approaching</strong>
              <p>You have only {usageData.cards.remaining} flashcards remaining today.</p>
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
      <div className={styles.subscriptionSection}>
        <div className={styles.subscriptionHeader}>
          <h3>Your Subscription</h3>
          <div className={styles.currentSubscriptionBadge}>
            {currentPlan === 'free' ? 'Free Tier' : 
             currentPlan === 'standard' ? 'Standard Tier' : 
             'Premium Tier'}
          </div>
        </div>
        
        {/* Show daily usage stats if available */}
        {renderDailyUsageStats()}
        
        {/* Fallback information if stats can't be loaded */}
        {(!subscriptionInfo?.usage || !dailyUsage) && (
          <div className={styles.fallbackSubscriptionInfo}>
            <h4>Your Current Plan: {currentPlan === 'free' ? 'Free Tier' : 
             currentPlan === 'standard' ? 'Standard Tier' : 
             'Premium Tier'}</h4>
            <p>Daily limits based on your current plan:</p>
            <ul>
              <li>Learning Paths: {currentPlan === 'free' ? '3' : currentPlan === 'standard' ? '10' : 'Unlimited'} per day</li>
              <li>Flashcards: {currentPlan === 'free' ? '20' : currentPlan === 'standard' ? '50' : 'Unlimited'} per day</li>
            </ul>
            <p>For more detailed usage statistics, please refresh the page.</p>
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
              className={styles.upgradeButton}
              onClick={() => setShowPromoSection(!showPromoSection)}
            >
              {showPromoSection ? 'Use Promotion Code' : 'Enter Promotion Code'}
            </button>
          )}
        </div>
        
        {showPromoSection && (
          <div className={styles.upgradeContainer}>
            <div className={styles.promoCodeContainer}>
              <h4>Enter your promotion code to upgrade</h4>
              <div className={styles.promoCodeForm}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="e.g., zeroai#0430"
                  className={styles.promoCodeInput}
                />
                <button
                  onClick={handleUpgradeSubscription}
                  disabled={submitting}
                  className={styles.applyButton}
                >
                  {submitting ? 'Processing...' : 'Apply Code'}
                </button>
              </div>
              <p className={styles.promoInfo}>
                Use a valid promotion code to instantly upgrade your subscription tier and unlock more features.
              </p>
              <div className={styles.demoNote}>
                <strong>Demo Note:</strong> For testing, try these codes:
                <ul>
                  <li><code>zeroai#0430</code> - Upgrade to Standard</li>
                  <li><code>zeroultra#2025</code> - Upgrade to Premium</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Feature comparison table */}
        <div className={styles.featureTable}>
          <h3>Subscription Features</h3>
          <table className={styles.subscriptionTable}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Standard</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Daily Learning Paths</td>
                <td>3</td>
                <td>10</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Daily Flashcards</td>
                <td>20</td>
                <td>50</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Custom Sections</td>
                <td>✓</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>AI Learning Assistant</td>
                <td>Limited</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Priority Support</td>
                <td>✗</td>
                <td>✓</td>
                <td>✓</td>
              </tr>
              <tr>
                <td>Advanced Analytics</td>
                <td>✗</td>
                <td>✗</td>
                <td>✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1>{t('dashboard.welcome')}</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          {t('sidebar.logout')}
        </button>
      </div>

      <div className={styles.userInfoCard}>
        <div className={styles.userProfile}>
          {user.profile_picture ? (
            <img src={user.profile_picture} alt={user.username} className={styles.profilePicture} />
          ) : (
            <div className={styles.profilePlaceholder}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.userDetails}>
            <h2>{user.full_name || user.username}</h2>
            <p className={styles.userEmail}>{user.email}</p>
            {user.oauth_provider && (
              <span className={styles.oauthBadge}>{user.oauth_provider}</span>
            )}
          </div>
        </div>

        <div className={styles.accountInfo}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.username')}</span>
            <span className={styles.infoValue}>{user.username}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.account_id')}</span>
            <span className={styles.infoValue}>{user.id}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>{t('dashboard.account_status')}</span>
            <span className={`${styles.infoValue} ${user.is_active ? styles.activeStatus : styles.inactiveStatus}`}>
              {user.is_active ? t('dashboard.active') : t('dashboard.inactive')}
            </span>
          </div>
          {user.created_at && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>{t('dashboard.member_since')}</span>
              <span className={styles.infoValue}>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Subscription</span>
            <span className={styles.infoValue}>
              {(subscriptionInfo?.subscription_type === 'free' || subscriptionInfo?.plan?.type === 'free') && 'Free Tier'}
              {(subscriptionInfo?.subscription_type === 'standard' || subscriptionInfo?.plan?.type === 'standard') && 'Standard Tier'}
              {(subscriptionInfo?.subscription_type === 'premium' || subscriptionInfo?.plan?.type === 'premium') && 'Premium Tier'}
              {(!subscriptionInfo?.subscription_type && !subscriptionInfo?.plan?.type) && 'Free Tier'}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription section */}
      {renderSubscriptionSection()}

      <div className={styles.dashboardContent}>
        <div className={styles.dashboardCard}>
          <h3>{t('dashboard.recent_activity')}</h3>
          <p className={styles.emptyState}>{t('dashboard.no_activity')}</p>
        </div>

        <div className={styles.dashboardCard}>
          <h3>{t('dashboard.your_courses')}</h3>
          <p className={styles.emptyState}>{t('dashboard.no_courses')}</p>
          <div className={styles.cardActions}>
            <button 
              className={styles.actionButton}
              onClick={() => handleCreateNew('path')}
            >
              Create Learning Path
            </button>
            <button 
              className={styles.actionButton}
              onClick={() => handleCreateNew('card')}
            >
              Create Flashcard
            </button>
          </div>
        </div>

        <div className={styles.dashboardCard}>
          <h3>{t('dashboard.learning_progress')}</h3>
          <p className={styles.emptyState}>{t('dashboard.no_progress')}</p>
        </div>
      </div>
    </div>
  );
}