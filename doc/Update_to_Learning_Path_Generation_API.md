Frontend Documentation: Update to Learning Path Generation API
Date: 2024-07-26
Author: AI Assistant
Version: 1.0
1. Summary of Change
The API endpoint for generating a learning path from a chat prompt (POST /api/chat/generate-learning-path) has been significantly updated to improve user experience and frontend responsiveness.
Previously, this endpoint would perform the entire generation process (extracting goals, planning the path structure via AI, saving to the database) before returning a response. This could take a considerable amount of time (potentially minutes), leaving the user waiting without feedback.
The endpoint now returns almost immediately, scheduling the entire generation process (including card generation) as a background task. The frontend will receive a task_id and must then poll a new status endpoint to track the progress and retrieve the final result.
2. Old Workflow (Deprecated)
Frontend sends POST /api/chat/generate-learning-path with a { prompt: "..." } body.
Backend performs goal extraction (AI call), path planning (AI call), database writes.
Backend schedules only card generation as a background task.
Backend returns the learning path structure (without cards) and a task_id for card generation only.
Problem: Steps 2 & 3 could take a long time, blocking the frontend.
3. New Workflow (Current)
Initiate Generation:
Frontend sends POST /api/chat/generate-learning-path with a { prompt: "..." } body.
Reference: app/recommendation/routes.py (lines 338-372)
Receive Task ID:
Backend immediately schedules the entire generation process (goal extraction, path planning, DB creation, card generation) as a single background task.
Backend responds instantly with a TaskCreationResponse:
Reference: app/recommendation/routes.py (lines 334-336)
Start Polling:
Frontend receives the task_id.
Frontend begins polling the new status endpoint: GET /api/tasks/{task_id}/status every few seconds (e.g., 5-10 seconds).
Note: Ensure this endpoint is correctly registered in the main FastAPI application (likely mounting task_router from app.services.background_tasks.py).
Track Progress:
The status endpoint (GET /api/tasks/{task_id}/status) returns a JSON object detailing the task's current state. Example structure:
Reference: app/services/background_tasks.py (lines 96-105, 178-189 for status structure)
Use the stage, progress, cards_completed, and total_cards fields to provide informative feedback to the user (e.g., "Planning path...", "Generating cards (23/50)...").
Handle Completion:
Continue polling until the status field is "completed".
Once completed, retrieve the learning_path_id from the final status response.
Use this learning_path_id to fetch the complete learning path data (including courses, sections, and now potentially the generated cards) using the existing endpoint, likely GET /recommendation/learning-paths/{path_id}/full.
Reference: app/recommendation/routes.py (lines 48-66)
Handle Errors:
If the polling response shows status as "failed" or "timeout", stop polling.
Display an appropriate error message to the user. You can use the errors array from the status response for more details.
4. API Endpoint Details
A. Initiate Learning Path Generation
Method: POST
Path: /api/chat/generate-learning-path
Request Body:
Success Response (200 OK): TaskCreationResponse
Failure Response: Standard HTTP errors (e.g., 400 for empty prompt, 500 for scheduling failure).
B. Get Task Status
Method: GET
Path: /api/tasks/{task_id}/status
Path Parameter:
task_id (string): The ID received from the initiation endpoint.
Success Response (200 OK): Task Status JSON object (see example in section 3.4).
Failure Response:
404 Not Found: If the task_id does not exist or doesn't belong to the user.
5. Example Frontend Logic (High-Level)
6. UI/UX Considerations
Provide immediate feedback after the user submits the prompt, indicating that generation has started (using the message from the initial response).
Display the current stage of the process (e.g., "Analyzing request...", "Planning curriculum...", "Generating learning cards...").
Show a progress indicator. If total_cards is available, showing "X / Y cards generated" is helpful. Otherwise, use the overall progress percentage or a more general indeterminate progress bar.
Clearly indicate success, failure, or timeout states.
Allow the user to potentially navigate away while generation happens in the background (though this requires more complex state management to resume tracking if they return).