export interface Course {
  id: number;
  title: string;
  description: string;
  learningTime: string;
  keywords: string[];
  status: 'completed' | 'in-progress' | 'not-started';
  progress: number;
}

export const courseData: Course[] = [
  {
    id: 1,
    title: 'CS 101',
    description: 'Introduction to computer science fundamentals and programming concepts',
    learningTime: '8 weeks',
    keywords: ['Programming', 'Algorithms', 'Data Structures'],
    status: 'in-progress',
    progress: 71
  },
  {
    id: 2,
    title: 'How to learn fast?',
    description: 'Techniques and strategies for accelerated learning and knowledge retention',
    learningTime: '4 weeks',
    keywords: ['Learning Techniques', 'Memory', 'Productivity'],
    status: 'in-progress',
    progress: 59
  },
  {
    id: 3,
    title: 'How to build your first indie game?',
    description: 'Step-by-step guide to creating your first independent video game from concept to launch',
    learningTime: '12 weeks',
    keywords: ['Game Development', 'Unity', 'Game Design'],
    status: 'not-started',
    progress: 0
  },
  {
    id: 4,
    title: 'How to start investing in stocks?',
    description: 'Fundamentals of stock market investing for beginners with practical examples',
    learningTime: '6 weeks',
    keywords: ['Finance', 'Stocks', 'Investment'],
    status: 'completed',
    progress: 100
  },
  {
    id: 5,
    title: 'How to create a successful YouTube channel?',
    description: 'Strategies for content creation, audience growth, and monetization on YouTube',
    learningTime: '8 weeks',
    keywords: ['Content Creation', 'Video Editing', 'Marketing'],
    status: 'in-progress',
    progress: 45
  },
  {
    id: 6,
    title: 'How to master digital photography?',
    description: 'Comprehensive guide to photography techniques, composition, and post-processing',
    learningTime: '10 weeks',
    keywords: ['Photography', 'Composition', 'Editing'],
    status: 'not-started',
    progress: 0
  },
  {
    id: 7,
    title: 'How to build a personal brand online?',
    description: 'Strategies for creating and growing your personal brand across digital platforms',
    learningTime: '6 weeks',
    keywords: ['Personal Branding', 'Social Media', 'Networking'],
    status: 'in-progress',
    progress: 30
  },
  {
    id: 8,
    title: 'How to launch a successful startup?',
    description: 'From idea validation to market entry: essential steps for launching a startup',
    learningTime: '14 weeks',
    keywords: ['Entrepreneurship', 'Business Model', 'Funding'],
    status: 'not-started',
    progress: 0
  }
]; 