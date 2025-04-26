'use client'; // Make this a client component to use hooks

import { useAuth } from '../context/AuthContext'; // Import useAuth
import ZeroLandingPage, { RecommendationsResponse } from './home/home';
import { useEffect, useState } from 'react';
import LandingPage from './landing-page/landing-page'; // Import the new LandingPage component

// Define the fetch function (can be in a separate services file)
async function fetchRecommendations(): Promise<RecommendationsResponse | null> {
  try {
    // Use the full URL or environment variable for the API endpoint
    const response = await fetch('http://localhost:8000/api/recommendations', {
      // Optional: Add caching options if desired
      // cache: 'no-store', // To prevent caching during development/testing
      // next: { revalidate: 60 } // Revalidate every 60 seconds
    });

    if (!response.ok) {
      console.error(`Failed to fetch recommendations: ${response.status}`);
      // Return null or throw an error based on how you want to handle it
      return null;
    }

    const data: RecommendationsResponse = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    return null; // Return null on fetch error
  }
}

// Use client component
export default function Home() {
  const { user } = useAuth(); // Get user state
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);

  // Fetch recommendations only if the user is logged in
  useEffect(() => {
    if (user) {
      fetchRecommendations().then(setRecommendations);
    }
  }, [user]); // Dependency array includes user

  // If user is logged in, show the main app page (home/dashboard)
  if (user) {
    return <ZeroLandingPage initialRecommendations={recommendations} />;
  }

  // If user is not logged in, show the static landing page component
  return <LandingPage />;
}
