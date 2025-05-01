import { apiClient } from '../auth';

/**
 * Subscription API service
 * This file handles all subscription-related API calls
 */

// Types for the API endpoints as shown in documentation
export interface SubscriptionData {
  subscription_type?: 'free' | 'standard' | 'premium';
  limits?: {
    paths: number;
    cards: number;
  };
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
  daily_limits?: {
    paths: number;
    cards: number;
  };
  daily_usage?: {
    date: string;
    paths: {
      count: number;
      remaining: number;
      limit_reached: boolean;
    };
    cards: {
      count: number;
      remaining: number;
      limit_reached: boolean;
    };
  };
  // New format from API
  plan?: {
    type: 'free' | 'standard' | 'premium';
    start_date: string;
    expiry_date: string;
    is_active: boolean;
  };
}

export interface DailyUsageData {
  paths: {
    used: number;
    limit: number;
    remaining: number;
  };
  cards: {
    used: number;
    limit: number;
    remaining: number;
  };
  subscription_tier: 'free' | 'standard' | 'premium';
  usage_date: string;
}

export interface SubscriptionUpdatePayload {
  user_id?: string; // Optional, only for superusers
  subscription_type?: 'free' | 'standard' | 'premium';
  promotion_code?: string;
}

export interface UserSubscriptionResponse {
  email: string;
  username: string;
  full_name: string | null;
  profile_picture: string | null;
  interests: string[] | null;
  subscription_type: 'free' | 'standard' | 'premium';
  id: number;
  is_active: boolean;
  oauth_provider: string | null;
  created_at: string;
  is_superuser: boolean;
}

/**
 * Get the current user's subscription information
 * Returns current usage, limits and subscription type
 */
export const getUserSubscription = async (): Promise<SubscriptionData | null> => {
  try {
    const response = await apiClient('/api/subscription');
    
    if (!response || !response.ok) {
      console.error('Failed to fetch subscription info:', response?.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error in getUserSubscription:", error);
    return null;
  }
};

/**
 * Get the user's daily usage information
 */
export const getDailyUsage = async (): Promise<DailyUsageData | null> => {
  try {
    const response = await apiClient('/api/daily-usage/me');
    
    if (!response || !response.ok) {
      console.error('Failed to fetch daily usage info:', response?.status, response?.statusText);
      return null;
    }
    
    const data = await response.json();
    
    // Validate the response data structure
    if (!data || typeof data !== 'object') {
      console.error('Invalid daily usage data format - not an object:', data);
      return null;
    }
    
    // Handle empty object response from API - create a default structure
    if (Object.keys(data).length === 0) {
      console.log('Received empty daily usage object, using default values');
      
      // Get user subscription to determine appropriate limits
      let defaultLimit = { paths: 3, cards: 20 }; // Default free tier limits
      
      try {
        const subscription = await getUserSubscription();
        if (subscription) {
          const tierType = subscription.subscription_type || 
                        (subscription.plan && subscription.plan.type) || 'free';
          
          // Set limits based on subscription tier
          if (tierType === 'standard') {
            defaultLimit = { paths: 10, cards: 50 };
          } else if (tierType === 'premium') {
            defaultLimit = { paths: 100, cards: 500 };
          }
        }
      } catch (subError) {
        console.error('Error getting subscription for default limits:', subError);
      }
      
      // Return default structure
      return {
        paths: {
          used: 0,
          limit: defaultLimit.paths,
          remaining: defaultLimit.paths
        },
        cards: {
          used: 0,
          limit: defaultLimit.cards,
          remaining: defaultLimit.cards
        },
        subscription_tier: 'free', // Default
        usage_date: new Date().toISOString().split('T')[0]
      };
    }
    
    // Validate that paths and cards exist and have the correct structure
    if (!data.paths || !data.cards || 
        typeof data.paths !== 'object' || typeof data.cards !== 'object' ||
        typeof data.paths.remaining !== 'number' || typeof data.cards.remaining !== 'number') {
      console.error('Invalid daily usage data structure:', data);
      
      // Attempt to return a fallback structure to avoid errors
      return {
        paths: {
          used: data.paths?.used || 0,
          limit: data.paths?.limit || 3,  // Default free tier limit
          remaining: data.paths?.remaining || 0
        },
        cards: {
          used: data.cards?.used || 0,
          limit: data.cards?.limit || 20, // Default free tier limit
          remaining: data.cards?.remaining || 0
        },
        subscription_tier: data.subscription_tier || 'free',
        usage_date: data.usage_date || new Date().toISOString().split('T')[0]
      };
    }
    
    return data;
  } catch (error) {
    console.error("Error in getDailyUsage:", error);
    return null;
  }
};

/**
 * Update a user's subscription type
 * @param payload The update payload containing either subscription_type, promotion_code, or both
 * For superusers, user_id can be included to update other users
 */
export const updateUserSubscription = async (payload: SubscriptionUpdatePayload): Promise<UserSubscriptionResponse | null> => {
  try {
    const response = await apiClient('/api/subscription', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    
    if (!response) {
      console.error('No response received when updating subscription');
      return null;
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update subscription');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error in updateUserSubscription:", error);
    throw error;
  }
};

/**
 * Apply a promotion code to upgrade subscription
 * This is a convenience wrapper around updateUserSubscription
 */
export const applyPromotionCode = async (promotionCode: string): Promise<{
  success: boolean;
  message: string;
  subscription_type: 'free' | 'standard' | 'premium';
}> => {
  try {
    const response = await updateUserSubscription({
      promotion_code: promotionCode
    });
    
    if (!response) {
      return {
        success: false,
        message: 'Failed to apply promotion code',
        subscription_type: 'free' // Default
      };
    }
    
    return {
      success: true,
      message: `Successfully upgraded to ${response.subscription_type} tier!`,
      subscription_type: response.subscription_type
    };
  } catch (error: any) {
    // Handle specific error cases from documentation
    if (error.message.includes('Invalid promotion code')) {
      return {
        success: false,
        message: 'The promotion code you entered is invalid. Please check and try again.',
        subscription_type: 'free'
      };
    } else if (error.message.includes('Daily limit reached')) {
      return {
        success: false,
        message: 'You have reached your daily limit. Please try again tomorrow or upgrade your subscription.',
        subscription_type: 'free'
      };
    } else if (error.message.includes('Authentication required')) {
      return {
        success: false,
        message: 'Your session has expired. Please log in again to continue.',
        subscription_type: 'free'
      };
    }
    
    return {
      success: false,
      message: error.message || 'An error occurred while applying the promotion code',
      subscription_type: 'free' // Default
    };
  }
};

/**
 * Helper function to check if a user has reached their daily limit
 * for either paths or cards. Can be used before trying to create new content.
 */
export const checkDailyLimits = async (): Promise<{
  canCreatePaths: boolean;
  canCreateCards: boolean;
  message?: string;
}> => {
  try {
    // Try to get usage data from subscription first
    const subscriptionData = await getUserSubscription();
    let usageData = null;
    
    // If subscription data includes daily usage, use that
    if (subscriptionData && 
        subscriptionData.daily_usage && 
        subscriptionData.daily_usage.paths && 
        subscriptionData.daily_usage.cards) {
      
      // Convert to DailyUsageData format
      usageData = {
        paths: {
          used: subscriptionData.daily_usage.paths.count || 0,
          limit: subscriptionData.daily_limits?.paths || 3,  // Default if missing
          remaining: subscriptionData.daily_usage.paths.remaining || 0
        },
        cards: {
          used: subscriptionData.daily_usage.cards.count || 0,
          limit: subscriptionData.daily_limits?.cards || 20,  // Default if missing
          remaining: subscriptionData.daily_usage.cards.remaining || 0
        },
        subscription_tier: subscriptionData.subscription_type || 
                        (subscriptionData.plan && subscriptionData.plan.type) || 'free',
        usage_date: subscriptionData.daily_usage.date || new Date().toISOString().split('T')[0]
      };
    } else {
      // If not in subscription data, get it separately
      usageData = await getDailyUsage();
    }
    
    // If we still can't get usage data, use conservative defaults for free tier
    if (!usageData) {
      console.warn('Unable to fetch usage data, using conservative default limits');
      
      // Default to allowing creation but with a warning message
      return {
        canCreatePaths: true,
        canCreateCards: true,
        message: 'Unable to fetch your daily limits. If you encounter issues, please refresh the dashboard.'
      };
    }
    
    // Check if paths and cards properties exist before accessing their properties
    if (!usageData.paths || !usageData.cards) {
      console.error('Invalid usage data format:', usageData);
      return {
        canCreatePaths: true,
        canCreateCards: true,
        message: 'Unable to verify your limits. If you encounter issues, please refresh the dashboard.'
      };
    }
    
    // Get subscription tier to check for premium users
    const tierType = usageData.subscription_tier || 'free';
    
    // Premium users can always create content
    if (tierType === 'premium') {
      return {
        canCreatePaths: true,
        canCreateCards: true
      };
    }
    
    // Safely access the remaining property with fallbacks
    const pathsRemaining = typeof usageData.paths.remaining === 'number' ? usageData.paths.remaining : 0;
    const cardsRemaining = typeof usageData.cards.remaining === 'number' ? usageData.cards.remaining : 0;
    
    const canCreatePaths = pathsRemaining > 0;
    const canCreateCards = cardsRemaining > 0;
    
    // Provide specific message if limits are reached
    let message;
    if (!canCreatePaths && !canCreateCards) {
      message = 'You have reached your daily limits for both learning paths and flashcards.';
    } else if (!canCreatePaths) {
      message = 'You have reached your daily limit for learning paths.';
    } else if (!canCreateCards) {
      message = 'You have reached your daily limit for flashcards.';
    }
    
    return {
      canCreatePaths,
      canCreateCards,
      message
    };
  } catch (error) {
    console.error('Error checking daily limits:', error);
    // Default to allowing creation with a warning when there's an error
    return {
      canCreatePaths: true,
      canCreateCards: true,
      message: 'An error occurred while checking your daily limits. If you encounter issues, please refresh the dashboard.'
    };
  }
}; 