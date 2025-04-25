# 🧠 DialoguePlanner Agent Frontend Integration Guide

## 📌 Overview

The `DialoguePlanner` Agent allows users to build personalized learning paths through natural conversation. Based on user input, it determines which AI sub-agent to call (PathPlanner, CourseGenerator, etc.) and returns structured data (learning paths, courses, sections, or cards) along with a friendly natural language response.

---

## 🧱 API Endpoint

- **Method**: POST  
- **Path**: `/api/ai/dialogue`

---

## 📥 Request Payload

```
interface DialogueRequest {
  user_input: string;             // Required natural language input from user
  current_plan?: object | null;   // Optional current path structure (local draft)
  chat_history?: string[];        // Optional past conversation
}
```

### Example

```json
{
  "user_input": "I want to learn how to become a better gamer",
  "current_plan": null,
  "chat_history": []
}
```

---

## 📤 Response Structure

```
interface DialogueResponse {
  ai_reply: string;
  result: {
    learning_path?: object | null;
    courses?: object[] | null;
    sections?: object[] | null;
    cards?: object[] | null;
  };
  status: {
    has_learning_path: boolean;
    has_courses: boolean;
    has_sections: boolean;
    has_cards: boolean;
  };
  triggered_agent: string;
}
```

### Example

```json
{
  "ai_reply": "Got it! Here's a personalized learning path to help you become a better gamer.",
  "result": {
    "learning_path": { "title": "Become a Better Gamer", "courses": [...] },
    "courses": [...],
    "sections": null,
    "cards": null
  },
  "status": {
    "has_learning_path": true,
    "has_courses": true,
    "has_sections": false,
    "has_cards": false
  },
  "triggered_agent": "PathPlanner"
}
```

---

## 🧩 Frontend Logic Guide

### 1. Send Request

```ts
const res = await fetch("/api/ai/dialogue", {
  method: "POST",
  body: JSON.stringify({
    user_input: userMessage,
    current_plan: localDraftPlan,
    chat_history: messageHistory
  })
});
```

### 2. Display AI Reply in Chat

```tsx
addChatMessage({ role: "ai", content: response.ai_reply });
```

### 3. Update UI by Status

```ts
if (res.status.has_learning_path) setLearningPath(res.result.learning_path);
if (res.status.has_courses) setCourses(res.result.courses);
if (res.status.has_sections) setSections(res.result.sections);
if (res.status.has_cards) setCards(res.result.cards);
```

---

## 🎯 UX Suggestions

- Use `ai_reply` for conversational feedback.
- Only reveal UI components if `status.has_X` is true.
- Allow user to continue modifying plan and re-trigger the dialogue API.

---

## ✅ Checklist

- [ ] Integrate dialogue API
- [ ] Build Chat UI
- [ ] Dynamically display generated content using status flags
- [ ] Maintain and pass `current_plan` in session
- [ ] Enable user feedback interactions to refine plan (e.g., “this week is too hard”)

---

Happy building 🛠