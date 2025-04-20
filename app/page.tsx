import Image from "next/image";
import ZeroLandingPage, { RecommendationsResponse } from './landing-page/landing-page';

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

// Make the Page component async
export default async function Home() {
  // Fetch data on the server
  const initialRecommendations = await fetchRecommendations();

  // Pass the fetched data as props to the client component
  return (
    <ZeroLandingPage initialRecommendations={initialRecommendations} />
  );
}
