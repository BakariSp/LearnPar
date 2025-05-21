'use client'; // Make this a client component to use hooks

import { useAuth } from '../../context/AuthContext'; // Import useAuth
import ZeroLandingPage from './home/page';
import { ZeroLandingPageContent, RecommendationsResponse } from './home/home-content';
import { useEffect, useState } from 'react';
import LandingPage from './landing-page/landing-page'; // Import the new LandingPage component

export default function Page() {
  return <LandingPage />;
}