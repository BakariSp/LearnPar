# Achievements System Documentation

This document describes the achievements system in the Zero-AI backend, including how to integrate it into the frontend.

## Overview

The achievements system rewards users for making progress in their learning journey. Achievements are awarded for various accomplishments such as:

1. **Streak Achievements**: Awarded for logging in and studying for consecutive days
2. **Card Completion Achievements**: Awarded for completing a certain number of learning cards
3. **Course Completion Achievements**: Awarded for completing courses
4. **Learning Path Completion Achievements**: Awarded for completing learning paths
5. **Custom Section Achievements**: Awarded for creating custom learning sections

## Achievement Structure

Each achievement has the following properties:

```typescript
interface Achievement {
  id: number;
  title: string;
  description: string;
  badge_image: string | null; // URL to the badge image
  achievement_type: string; // "streak", "completion", etc.
  criteria: {
    // For streak achievements
    streak_days?: number;
    
    // For completion achievements
    type?: string; // "cards_completed", "courses_completed", "learning_paths_completed", "custom_sections_created"
    count?: number; // Threshold count to unlock the achievement
  };
  created_at: string; // ISO date
  updated_at: string; // ISO date
}

interface UserAchievement {
  achievement: Achievement;
  achieved_at: string; // ISO date when the user earned this achievement
}
```

## Tracking Learning Path Progress

### Card Completion in Sequence

The backend tracks when a user completes a card within a learning path. Cards are meant to be completed in sequence, and the system can track a user's position in the learning path based on their progress.

Key aspects of the tracking system:

1. **Card Completion Status**: Each card has an `is_completed` field in the `user_cards` association table.
2. **Sequential Learning**: The system is designed for users to complete cards in order without skipping.
3. **Progress Tracking**: When a user marks a card as completed, the backend automatically:
   - Updates the card's completion status
   - Updates the overall progress percentage for the section
   - Updates the overall progress percentage for the course
   - Updates the overall progress percentage for the learning path

### Progress Calculation

The progress for a learning path is calculated as follows:

1. Each card in a section has equal weight
2. Each section's progress is the percentage of completed cards
3. Each course's progress is the weighted average of its sections' progress
4. The learning path's progress is the weighted average of its courses' progress

### API Endpoints for Progress Tracking

#### Mark a Card as Completed

```
PUT /cards/users/me/cards/{card_id}
```

Request Body:
```json
{
  "is_completed": true
}
```

Response:
```json
{
  "card": {
    "id": 123,
    "keyword": "Example Keyword",
    "question": "Example Question",
    "answer": "Example Answer",
    "explanation": "Example Explanation",
    "difficulty": "intermediate",
    "resources": [],
    "level": "basic",
    "tags": ["tag1", "tag2"],
    "created_by": "system",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  "is_completed": true,
  "expanded_example": null,
  "notes": null,
  "saved_at": "2023-01-01T00:00:00Z",
  "difficulty_rating": null,
  "depth_preference": null,
  "recommended_by": null
}
```

#### Get Learning Path Progress

```
GET /users/me/learning-paths/{path_id}
```

Response:
```json
{
  "id": 1,
  "user_id": 42,
  "learning_path_id": 123,
  "progress": 35.5,  // Progress as percentage (0-100)
  "start_date": "2023-01-01T00:00:00Z",
  "completed_at": null,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-05T00:00:00Z",
  "learning_path": {
    "id": 123,
    "title": "Example Learning Path",
    "description": "Description of the learning path",
    "category": "programming",
    "difficulty_level": "intermediate",
    "estimated_days": 30,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "is_template": false,
    "sections": [
      // Section data with their own progress information
    ],
    "courses": [
      // Course data with their own progress information
    ]
  }
}
```

### Frontend Implementation for Progress Tracking

To properly display a user's progress in a learning path:

1. **Progress Indicator**: 
   - Display the overall progress percentage from the `UserLearningPath.progress` field
   - Visualize this with a progress bar, circular progress indicator, or similar UI element

2. **Current Position**:
   - Fetch the learning path structure with all its courses, sections, and cards
   - Highlight the user's current position by finding the last completed card and the next card to be completed
   - For example:
     ```jsx
     // Find the first incomplete card in the sequence
     const findNextCardToComplete = (courses) => {
       for (const course of courses) {
         for (const section of course.sections) {
           for (const card of section.cards) {
             if (!card.is_completed) {
               return {
                 card,
                 section: section,
                 course: course
               };
             }
           }
         }
       }
       return null; // All cards completed
     };
     ```

3. **Sequential Navigation**:
   - Guide users through the learning path in the correct sequence
   - Disable or visually indicate cards that should be completed later in the sequence
   - Allow users to review previously completed cards at any time

## Available Achievements

### Streak Achievements

| Title | Description | Criteria |
|-------|-------------|----------|
| 3-Day Streak | Log in and study for 3 consecutive days | 3 days of consecutive activity |
| 7-Day Streak | Log in and study for 7 consecutive days | 7 days of consecutive activity |
| 30-Day Streak | Log in and study for 30 consecutive days | 30 days of consecutive activity |

### Card Completion Achievements

| Title | Description | Criteria |
|-------|-------------|----------|
| Card Collector | Complete 10 learning cards | 10 cards completed |
| Memory Master | Complete 50 learning cards | 50 cards completed |
| Knowledge Guru | Complete 100 learning cards | 100 cards completed |

### Course Completion Achievements

| Title | Description | Criteria |
|-------|-------------|----------|
| Course Beginner | Complete your first course | 1 course completed |
| Course Explorer | Complete 3 courses | 3 courses completed |
| Course Expert | Complete 10 courses | 10 courses completed |

### Learning Path Completion Achievements

| Title | Description | Criteria |
|-------|-------------|----------|
| Path Finder | Complete your first learning path | 1 learning path completed |
| Path Voyager | Complete 3 learning paths | 3 learning paths completed |

### Custom Section Achievements

| Title | Description | Criteria |
|-------|-------------|----------|
| Section Creator | Create your first custom learning section | 1 custom section created |
| Section Architect | Create 5 custom learning sections | 5 custom sections created |

## API Endpoints

### Get User Achievements

Retrieves all achievements earned by the current user.

```
GET /achievements/users/me/achievements
```

Response:
```json
[
  {
    "achievement": {
      "id": 1,
      "title": "3-Day Streak",
      "description": "Log in and study for 3 consecutive days",
      "badge_image": "/assets/badges/streak-3.png",
      "achievement_type": "streak",
      "criteria": { "streak_days": 3 },
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    },
    "achieved_at": "2023-01-04T00:00:00Z"
  }
]
```

### Check for New Achievements

This endpoint checks for new achievements and awards them if criteria are met. It returns any newly awarded achievements.

```
POST /achievements/users/me/check-achievements
```

Response:
```json
[
  {
    "achievement": {
      "id": 2,
      "title": "Card Collector",
      "description": "Complete 10 learning cards",
      "badge_image": "/assets/badges/cards-10.png",
      "achievement_type": "completion",
      "criteria": { "type": "cards_completed", "count": 10 },
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    },
    "achieved_at": "2023-01-05T00:00:00Z"
  }
]
```

### List All Available Achievements

Retrieves all achievements defined in the system.

```
GET /achievements/achievements
```

Query parameters:
- `skip`: Number of items to skip (default: 0)
- `limit`: Maximum number of items to return (default: 100)
- `achievement_type`: Filter by type, e.g., "streak" or "completion"

Response:
```json
[
  {
    "id": 1,
    "title": "3-Day Streak",
    "description": "Log in and study for 3 consecutive days",
    "badge_image": "/assets/badges/streak-3.png",
    "achievement_type": "streak",
    "criteria": { "streak_days": 3 },
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  // More achievements...
]
```

## Automatic Achievement Checks

The backend automatically checks for achievements in the following scenarios:

1. When a user marks a card as completed (`PUT /cards/users/me/cards/{card_id}`)
2. When a course is marked as completed or reaches 100% progress (`PUT /courses/users/me/courses/{course_id}`)
3. When a learning path is marked as completed or reaches 100% progress (`PUT /learning-paths/users/me/learning-paths/{path_id}`)

You can also trigger a manual check by calling the `check-achievements` endpoint.

## Integration Guidelines for Frontend

### Displaying User Achievements

1. Fetch the user's achievements using the `GET /achievements/users/me/achievements` endpoint.
2. Display the achievements in a grid or list format, showing the badge image, title, and description.
3. You may want to sort achievements by `achieved_at` date to show most recently earned achievements first.

### Achievement Notifications

1. After user actions that might result in achievements (completing cards, courses, or learning paths), call the `POST /achievements/users/me/check-achievements` endpoint.
2. If the response contains any achievements, show a notification or modal to the user to celebrate their achievement.

### Achievement Progress

For achievements that have a count threshold:

1. You may want to display progress toward upcoming achievements.
2. This requires maintaining a count on the frontend or making additional API calls to get the current counts.
3. For example, if a user has completed 8 cards, you could show "8/10" progress toward the "Card Collector" achievement.

### Achievement Badges Display

1. Badge images are stored at the URL specified in the `badge_image` field.
2. Ensure your frontend can handle cases where the badge image is null or missing.
3. Consider implementing a fallback badge or generating a badge based on the achievement title.

## Example Achievement Display Component

Here's a simple React component example for displaying achievements:

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AchievementsDisplay = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await axios.get('/achievements/users/me/achievements');
        setAchievements(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  const checkForNewAchievements = async () => {
    try {
      const response = await axios.post('/achievements/users/me/check-achievements');
      if (response.data.length > 0) {
        // Show notification for new achievements
        alert(`You've earned ${response.data.length} new achievements!`);
        // Refresh the achievements list
        setAchievements([...achievements, ...response.data]);
      }
    } catch (error) {
      console.error('Error checking for achievements:', error);
    }
  };

  if (loading) {
    return <div>Loading achievements...</div>;
  }

  return (
    <div className="achievements-container">
      <h2>Your Achievements</h2>
      <button onClick={checkForNewAchievements}>Check for new achievements</button>
      
      <div className="achievements-grid">
        {achievements.map((item) => (
          <div key={item.achievement.id} className="achievement-card">
            {item.achievement.badge_image ? (
              <img 
                src={item.achievement.badge_image} 
                alt={item.achievement.title} 
                className="achievement-badge"
              />
            ) : (
              <div className="achievement-badge-placeholder">
                {item.achievement.title.substring(0, 2)}
              </div>
            )}
            <h3>{item.achievement.title}</h3>
            <p>{item.achievement.description}</p>
            <small>Earned on: {new Date(item.achieved_at).toLocaleDateString()}</small>
          </div>
        ))}
        
        {achievements.length === 0 && (
          <p>You haven't earned any achievements yet. Keep learning!</p>
        )}
      </div>
    </div>
  );
};

export default AchievementsDisplay;
```

## Example Learning Path Progress Component

Here's an example React component for displaying a user's progress through a learning path:

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const LearningPathProgress = ({ pathId }) => {
  const [pathData, setPathData] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLearningPathProgress = async () => {
      try {
        const response = await axios.get(`/users/me/learning-paths/${pathId}`);
        setPathData(response.data);
        
        // Find current position (next card to complete)
        const nextToComplete = findNextCardToComplete(response.data.learning_path.courses);
        setCurrentPosition(nextToComplete);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching learning path progress:', error);
        setLoading(false);
      }
    };

    fetchLearningPathProgress();
  }, [pathId]);

  // Find the first incomplete card in the sequence
  const findNextCardToComplete = (courses) => {
    for (const course of courses) {
      for (const section of course.sections) {
        for (const card of section.cards) {
          if (!card.is_completed) {
            return {
              card,
              section,
              course
            };
          }
        }
      }
    }
    return null; // All cards completed
  };

  const markCardComplete = async (cardId) => {
    try {
      await axios.put(`/cards/users/me/cards/${cardId}`, {
        is_completed: true
      });
      
      // Refresh the learning path data to get updated progress
      const response = await axios.get(`/users/me/learning-paths/${pathId}`);
      setPathData(response.data);
      
      // Find new current position
      const nextToComplete = findNextCardToComplete(response.data.learning_path.courses);
      setCurrentPosition(nextToComplete);
      
      // Check for new achievements
      const achievementsResponse = await axios.post('/achievements/users/me/check-achievements');
      if (achievementsResponse.data.length > 0) {
        // Show notification for new achievements
        alert(`You've earned ${achievementsResponse.data.length} new achievements!`);
      }
    } catch (error) {
      console.error('Error marking card as complete:', error);
    }
  };

  if (loading) {
    return <div>Loading learning path progress...</div>;
  }

  if (!pathData) {
    return <div>Learning path not found</div>;
  }

  return (
    <div className="learning-path-progress">
      <h2>{pathData.learning_path.title}</h2>
      
      {/* Overall progress */}
      <div className="progress-container">
        <div className="progress-label">
          Overall Progress: {pathData.progress.toFixed(1)}%
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${pathData.progress}%` }}
          ></div>
        </div>
      </div>
      
      {/* Current position */}
      {currentPosition ? (
        <div className="current-position">
          <h3>Currently Learning</h3>
          <div className="current-course">
            Course: {currentPosition.course.title}
          </div>
          <div className="current-section">
            Section: {currentPosition.section.title}
          </div>
          <div className="current-card">
            <h4>{currentPosition.card.keyword}</h4>
            <p><strong>Question:</strong> {currentPosition.card.question}</p>
            <p><strong>Answer:</strong> {currentPosition.card.answer}</p>
            <button 
              onClick={() => markCardComplete(currentPosition.card.id)}
            >
              Mark Complete
            </button>
          </div>
        </div>
      ) : (
        <div className="completed-path">
          <h3>Path Completed!</h3>
          <p>Congratulations! You've completed all cards in this learning path.</p>
        </div>
      )}
      
      {/* Courses structure with progress */}
      <div className="courses-list">
        <h3>Courses in this Path</h3>
        {pathData.learning_path.courses.map(course => (
          <div key={course.id} className="course-item">
            <h4>{course.title}</h4>
            {/* Course progress calculation would be needed here */}
            <div className="sections-list">
              {course.sections.map(section => (
                <div key={section.id} className="section-item">
                  <h5>{section.title}</h5>
                  {/* Section progress calculation would be needed here */}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningPathProgress;
``` 