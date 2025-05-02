'use client';

import { useState } from 'react';
import { Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { apiAddToMyLearningPaths, FullLearningPathResponse } from '@/services/api';

interface AddToMyPathsButtonProps {
  learningPath: FullLearningPathResponse;
}

const AddToMyPathsButton = ({ learningPath }: AddToMyPathsButtonProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddToMyPaths = async () => {
    setLoading(true);
    try {
      const success = await apiAddToMyLearningPaths(learningPath.id);
      
      if (success) {
        message.success(`"${learningPath.title}" added to your learning paths!`);
        
        // Optionally redirect to the user's learning paths page after a delay
        setTimeout(() => {
          router.push('/my-paths');
        }, 1500);
      } else {
        throw new Error('Failed to add learning path');
      }
    } catch (error: any) {
      // Check if the error is because the path is already in the user's collection
      if (error.message && error.message.includes('already in your account')) {
        message.info(`"${learningPath.title}" is already in your learning paths.`);
        
        // Redirect to the user's learning paths page after a short delay
        setTimeout(() => {
          router.push('/my-paths');
        }, 1500);
      } else {
        message.error(error.message || 'Failed to add to your learning paths');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      type="primary" 
      onClick={handleAddToMyPaths} 
      loading={loading}
      icon={<PlusOutlined />}
      className="flex items-center"
      size="large"
    >
      Add to My Learning Paths
    </Button>
  );
};

export default AddToMyPathsButton; 