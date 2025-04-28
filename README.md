# Zero AI - Personalized Learning Platform

Zero AI is a lightweight AI learning guide designed to help users go from 0 to 0.5 in any unfamiliar field. It provides a personalized, gamified learning experience to break down barriers to knowledge and make learning accessible and engaging.

This repository contains the frontend application built with [Next.js](https://nextjs.org), React, TypeScript, and Tailwind CSS.

## Our Vision

At Zero AI, we believe that the beginning of every journey is the most important step. Our mission is to empower curious minds to explore new fields effortlessly by providing a personalized, gamified learning experience. We envision a future where learning is lightweight, joyful, and truly accessible for everyone starting from zero.

## Features

*   **Keyword Cards:** Bite-sized units of knowledge with clear explanations, examples, and resources.
*   **Personalized Learning Paths:** AI-generated learning routes tailored to user interests and goals.
*   **Gamified Feedback & Achievement System:** Visualize progress, collect milestones, and build a structured knowledge map.
*   **AI-Powered Content Generation:** Learning paths and cards are generated dynamically using AI agents.
*   **Conversational Path Building:** Users can interact with an AI dialogue agent to build their learning plan.

## Tech Stack

*   **Frontend:** React, Next.js (App Router), TypeScript, Tailwind CSS
*   **State Management:** React Context API (potentially Zustand/Redux for global state if needed)
*   **Backend:** FastAPI (Python) - **Note:** The backend runs as a separate service. See [Backend Setup](#backend-setup).
*   **Styling:** Tailwind CSS, CSS Modules
*   **API Communication:** Axios, Fetch API

## Getting Started

### Prerequisites

*   Node.js (Version specified in `package.json` or latest LTS)
*   npm, yarn, pnpm, or bun
*   A running instance of the [Zero AI Backend](link-to-backend-repo-if-available) service.

### Frontend Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd learn-par
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Configure Environment Variables:**
    *   This project might require environment variables (e.g., for API keys or backend URLs if not using the proxy). Create a `.env.local` file based on `.env.example` (if one exists) and fill in the necessary values.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Backend Setup

The frontend relies on the Zero AI backend API.

1.  Ensure the backend FastAPI server is running. By default, the frontend expects the backend API to be accessible.
2.  This Next.js application uses a proxy rewrite rule defined in `next.config.ts` to forward requests from `/api/*` to the backend service (currently configured for an Azure deployment). If running the backend locally, you might need to adjust the `destination` URL in `next.config.ts` or configure CORS on the backend accordingly.

    ```typescript:learn-par/next.config.ts
    startLine: 4
    endLine: 14
    ```

## API Documentation

The interaction between the frontend and backend is documented in the `/doc` directory:

*   **Learning Paths:** `doc/learing-path.md`, `doc/learning-path-course-section-cards.md`, `doc/learning_path_api_update01.md`
*   **Cards:** `doc/cards_api_update.md`
*   **Authentication:** `doc/user_login_doc.md`
*   **Background Tasks:** `doc/task_api.md`
*   **Dialogue Agent:** `doc/dialogue_planner_frontend_doc.md`
*   **Chat Generation:** `ai_chat.md`

## Code Generation & Styling

*   Frontend development follows guidelines outlined in `.cursor/rules/front-end-rule.mdc`.
*   Visual styling guidelines are available in `doc/visual_guide.md`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details. Remember to configure the backend API URL environment variable for your Vercel deployment.
