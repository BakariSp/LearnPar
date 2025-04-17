    # Chat API Endpoints

    This document outlines the API endpoint used for generating learning paths via a chat-like interface.

    **Base Path:** `/api` (Assumed prefix for all endpoints below)

    ---

    ## Chat-Based Learning Path Generation

    ### 1. Generate Learning Path from Chat Prompt

    Generates a new learning path based on a user's natural language prompt, saves it, assigns it to the user, and starts background card generation.

    *   **Method:** `POST`
    *   **Path:** `/recommendation/chat/generate-learning-path`
    *   **Description:** Takes a user's chat message (prompt) describing their learning goal. The backend uses an AI agent to extract key parameters (interests, difficulty, duration) from the prompt, generates a structured learning path (Path, Courses, Sections), saves it, assigns it to the currently authenticated user, and triggers background card generation.
    *   **Authentication:** Required (JWT Token in `Authorization` header).
    *   **Request Body:**
        ```json
        {
          "prompt": "string" // The user's chat message, e.g., "I want to learn about trading in 30 days"
        }
        ```
    *   **Success Response Body (200 OK):** `Dict[str, Any]`
        ```json
        {
          "message": "I've created a personalized learning path for you!", // Confirmation message from the AI/system
          "learning_path": { // Basic details of the created LearningPath (ID, title, description)
            "id": 123,
            "title": "Introduction to Trading Concepts",
            "description": "A beginner-friendly path covering the fundamentals of trading."
            // Other LearningPath fields might be included
          },
          "courses": [ // List of courses created within the path (ID, title)
            {
              "course_id": 45,
              "title": "Market Basics",
              "sections": [ // List of sections within this course (ID, title)
                 { "section_id": 101, "title": "Understanding Stocks", "keywords": ["Stock", "Equity", "..."] },
                 { "section_id": 102, "title": "Market Orders", "keywords": ["Buy Order", "Sell Order", "..."] }
                 // ... other sections
              ]
            },
            {
              "course_id": 46,
              "title": "Introduction to Technical Analysis",
               "sections": [ /* ... */ ]
            }
            // ... other courses
          ],
          "task_id": "generate_cards_lp123_user5_timestamp", // ID to track background card generation status
          "next_steps": [ // Suggested next actions for the user
            "Review the learning path structure",
            "Start with the first course",
            "Track your progress in each section"
          ]
        }
        ```
    *   **Error Response Body (400 Bad Request):** If the prompt is missing or invalid.
        ```json
        {
          "detail": "Prompt cannot be empty."
        }
        ```
    *   **Error Response Body (500 Internal Server Error):** If the AI fails to extract goals or generate the path.
        ```json
        {
          "detail": "Failed to parse learning goals from prompt: [Original Prompt]"
          // Or other internal error messages
        }
        ```
    *   **Error Response Body (404 Not Found):** If the background task status endpoint (`/api/recommendation/tasks/{task_id}`) is queried with an invalid `task_id`.
        ```json
        {
          "detail": "Task not found"
        }
        ```

    **Workflow:**

    1.  Frontend sends the user's `prompt` to this endpoint.
    2.  Backend calls an AI agent (`extract_learning_goals`) to get structured `interests`, `difficulty_level`, and `estimated_days`.
    3.  Backend calls `LearningPathPlannerService.generate_complete_learning_path` to create the Path, Courses, and Sections in the database and assign the path to the user.
    4.  Backend schedules background card generation using `schedule_learning_path_generation` and gets a `task_id`.
    5.  Backend returns the success response containing the path structure, `task_id`, and suggested next steps.
    6.  Frontend displays the confirmation message and path outline.
    7.  Frontend can optionally poll the `/api/recommendation/tasks/{task_id}` endpoint (documented elsewhere, e.g., in `recommendation_api.md` or similar) to check the status of card generation.