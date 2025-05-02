import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, Button, Spin, Alert, Typography, Space, Divider, message } from 'antd';
import { apiGetFullLearningPath, apiAddToMyLearningPaths, FullLearningPathResponse } from '@/services/api';
import { isAuthenticated } from '@/services/auth';
import AddToMyPathsButton from '@/components/learning-path/AddToMyPathsButton';

const { Title, Paragraph, Text } = Typography;

const RecommendedLearningPathPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [learningPath, setLearningPath] = useState<FullLearningPathResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLoggedIn = isAuthenticated();

  useEffect(() => {
    const fetchLearningPath = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await apiGetFullLearningPath(Number(id));
        if (data) {
          setLearningPath(data);
          setError(null);
        } else {
          setError('Failed to load learning path. Please try again later.');
        }
      } catch (err: any) {
        console.error('Error fetching learning path:', err);
        setError(err.message || 'Error loading learning path');
      } finally {
        setLoading(false);
      }
    };

    fetchLearningPath();
  }, [id]);

  const handleLoginRedirect = () => {
    // Store the current path to redirect back after login
    if (typeof window !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', router.asPath);
    }
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" tip="Loading learning path..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className="p-6">
        <Alert
          message="Learning Path Not Found"
          description="The requested learning path could not be found."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <Card className="shadow-md mb-6">
        <div className="flex justify-between items-start flex-wrap">
          <div className="flex-1 min-w-0 mr-4">
            <Title level={2}>{learningPath.title}</Title>
            <Space className="mb-4">
              <Text type="secondary">Category: {learningPath.category}</Text>
              <Text type="secondary">Difficulty: {learningPath.difficulty_level}</Text>
              <Text type="secondary">Estimated time: {learningPath.estimated_days} days</Text>
            </Space>
            <Paragraph>{learningPath.description}</Paragraph>
          </div>
          <div className="mt-4 sm:mt-0">
            {isLoggedIn ? (
              <AddToMyPathsButton learningPath={learningPath} />
            ) : (
              <div className="text-center">
                <Button type="primary" onClick={handleLoginRedirect}>
                  Login to Add to My Paths
                </Button>
                <div className="mt-2 text-sm text-gray-500">
                  <Text type="secondary">Login required to save this path</Text>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Title level={3} className="mt-8 mb-4">Courses</Title>
      {learningPath.courses.map((course, courseIndex) => (
        <Card key={course.id} className="mb-6 shadow-md">
          <Title level={4}>{courseIndex + 1}. {course.title}</Title>
          <Paragraph>{course.description}</Paragraph>
          
          <Divider />
          
          <Title level={5} className="mt-4">Sections</Title>
          {course.sections.map((section, sectionIndex) => (
            <Card 
              key={section.id} 
              className="mb-4 border border-gray-200"
              type="inner"
            >
              <Title level={5}>{courseIndex + 1}.{sectionIndex + 1} {section.title}</Title>
              <Paragraph>{section.description}</Paragraph>
              
              <Title level={5} className="mt-4">Learning Cards ({section.cards.length})</Title>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {section.cards.slice(0, 2).map((card) => (
                  <Card key={card.id} className="hover:shadow-md transition-shadow">
                    <Title level={5}>{card.keyword}</Title>
                    <Paragraph>{card.explanation.length > 150 
                      ? card.explanation.substring(0, 150) + '...' 
                      : card.explanation}
                    </Paragraph>
                  </Card>
                ))}
                {section.cards.length > 2 && (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                    <Text type="secondary">+ {section.cards.length - 2} more cards</Text>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </Card>
      ))}
    </div>
  );
};

export default RecommendedLearningPathPage; 