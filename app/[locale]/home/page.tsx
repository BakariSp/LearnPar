'use client';

import { useEffect, useState } from 'react';
import { ZeroLandingPageContent, RecommendationsResponse } from './home-content';
import styles from './home.module.css';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation('common');


  return <ZeroLandingPageContent />;
}