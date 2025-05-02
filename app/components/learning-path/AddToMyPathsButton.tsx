import { useState, useEffect } from 'react';
import { Button, message, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { FullLearningPathResponse, apiAddToMyLearningPaths } from '@/services/api';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated, getToken } from '@/services/auth';

export interface AddToMyPathsButtonProps {
  learningPath: FullLearningPathResponse;
  onSuccess?: () => void;
  className?: string;
  size?: 'small' | 'middle' | 'large';
  showIcon?: boolean;
  children?: React.ReactNode;
  initialAddedState?: boolean;
}

/**
 * A button component that adds a learning path to the user's personal collection
 * 
 * @param learningPath - The learning path to add to user's collection
 * @param onSuccess - Optional callback for when the path is successfully added
 * @param className - Optional CSS class name for custom styling
 * @param size - Button size (small, middle, large)
 * @param showIcon - Whether to show the plus icon
 * @param children - Optional child elements (button text will be default if not provided)
 * @param initialAddedState - Optional flag to set the initial added state
 */
const AddToMyPathsButton: React.FC<AddToMyPathsButtonProps> = ({
  learningPath,
  onSuccess,
  className = '',
  size = 'middle',
  showIcon = true,
  children,
  initialAddedState = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(initialAddedState);
  const router = useRouter();
  const params = useParams();
  
  // Extract locale from params
  const locale = params?.locale 
    ? (Array.isArray(params.locale) ? params.locale[0] : params.locale) 
    : 'en';

  // Check if path is in user collection based on any available indicators
  useEffect(() => {
    // If initial state is provided, use it
    if (initialAddedState) {
      setIsAdded(true);
      return;
    }
    
    // Otherwise check any custom properties that might be added to the API response
    // Using type assertion to avoid TypeScript errors for custom properties
    const pathData = learningPath as any;
    if (pathData.is_in_user_collection || 
        pathData.user_id || 
        pathData.is_added || 
        pathData.in_user_collection) {
      setIsAdded(true);
    }
  }, [learningPath, initialAddedState]);

  const handleAddPath = async () => {
    setIsLoading(true);
    console.log('🔍 DEBUG - Add to Learning Path clicked:', learningPath.id, learningPath.title);
    
    try {
      // Check if user is authenticated
      const isLoggedIn = isAuthenticated();
      console.log('🔍 DEBUG - User authentication status:', isLoggedIn);
      
      if (!isLoggedIn) {
        console.log('🔍 DEBUG - User not authenticated, redirecting to login');
        handleAuthError();
        return;
      }
      
      // Get auth token and log its existence (not the actual token for security)
      const token = getToken();
      console.log('🔍 DEBUG - Auth token exists:', !!token);
      
      // Log the API endpoint we're trying to call
      console.log(`🔍 DEBUG - Calling API endpoint: /api/learning-paths/${learningPath.id}/add-to-my-paths`);
      
      // Log API URL from environment 
      const apiUrl = typeof window !== 'undefined' && (window as any).ENV_NEXT_PUBLIC_API_URL;
      console.log('🔍 DEBUG - API URL from env:', apiUrl || 'Not available in window');
      
      // Use the apiAddToMyLearningPaths function from services/api
      console.log('🔍 DEBUG - Calling apiAddToMyLearningPaths function');
      const success = await apiAddToMyLearningPaths(learningPath.id);
      console.log('🔍 DEBUG - API call completed, success:', success);
      
      if (success) {
        // Handle successful response
        console.log('🔍 DEBUG - API call successful, updating UI');
        message.success('Learning path added to your collection');
        setIsAdded(true);
        
        // Call success callback if provided
        if (onSuccess) {
          console.log('🔍 DEBUG - Calling onSuccess callback');
          onSuccess();
        }
      } else {
        console.log('🔍 DEBUG - API call returned false, throwing error');
        throw new Error('Failed to add learning path');
      }
    } catch (error: any) {
      // Handle errors
      console.error('🔍 DEBUG - Error adding learning path:', error);
      console.error('Error message:', error.message);
      
      if (error.message && error.message.includes('Authentication required')) {
        console.log('🔍 DEBUG - Authentication error detected');
        handleAuthError();
      } else if (error.message && error.message.includes('not found')) {
        console.log('🔍 DEBUG - Learning path not found error');
        message.error('Learning path not found');
      } else if (error.message && error.message.includes('already in your account')) {
        console.log('🔍 DEBUG - Path already in account error');
        message.info('This learning path is already in your collection');
        setIsAdded(true);
      } else {
        console.log('🔍 DEBUG - Generic error');
        message.error(error.message || 'Failed to add learning path');
      }
    } finally {
      console.log('🔍 DEBUG - Request completed, setting loading to false');
      setIsLoading(false);
    }
  };

  // Handle authentication errors
  const handleAuthError = () => {
    message.error('Please log in to add this learning path to your collection');
    
    // Store current path for redirect after login
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
    }
    
    // Redirect to login page with correct locale
    router.push(`/${locale}/login`);
  };

  // Determine button text based on state
  const buttonText = () => {
    if (children) {
      return children;
    }
    
    if (isAdded) {
      return 'Added to My Learning Paths';
    }
    
    if (isLoading) {
      return 'Adding...';
    }
    
    return 'Add to My Learning Paths';
  };

  return (
    <Tooltip title={isAdded ? 'Added to your collection' : 'Add this learning path to your collection'}>
      <Button
        type="primary"
        size={size}
        className={className}
        icon={showIcon ? <PlusOutlined /> : undefined}
        onClick={handleAddPath}
        loading={isLoading}
        disabled={isAdded}
        aria-label="Add to My Learning Paths"
      >
        {buttonText()}
      </Button>
    </Tooltip>
  );
};

export default AddToMyPathsButton; 