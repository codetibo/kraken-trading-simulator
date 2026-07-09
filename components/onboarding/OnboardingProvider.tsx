'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { OnboardingTour, TOUR_COMPLETED_KEY } from './OnboardingTour';

interface OnboardingContextValue {
  restartTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  restartTour: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

const TOUR_SKIPPED_KEY = 'kraken-tour-skipped';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showTour, setShowTour] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Check first visit on mount
  useEffect(() => {
    if (!mounted) return;
    // Only auto-show if the tour hasn't been completed or skipped
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    const skipped = sessionStorage.getItem(TOUR_SKIPPED_KEY);
    if (!completed && !skipped) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setShowTour(false);
  }, []);

  const handleClose = useCallback(() => {
    sessionStorage.setItem(TOUR_SKIPPED_KEY, 'true');
    setShowTour(false);
  }, []);

  const restartTour = useCallback(() => {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    sessionStorage.removeItem(TOUR_SKIPPED_KEY);
    setShowTour(true);
  }, []);

  return (
    <OnboardingContext value={{ restartTour }}>
      {children}
      {mounted && (
        <OnboardingTour
          open={showTour}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      )}
    </OnboardingContext>
  );
}
