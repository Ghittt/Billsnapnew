import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '@/types/analytics';

// Analytics component to track page views and other events
const Analytics: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view when route changes
    if (typeof gtag !== 'undefined') {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: location.pathname,
      });
    }
  }, [location]);

  return null; // This component doesn't render anything
};

export const trackEvent = (eventName: string, parameters?: {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
}) => {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, parameters);
  }
};

export default Analytics;