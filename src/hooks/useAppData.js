import { useState, useEffect, useCallback } from 'react';

export const useAppData = () => {
  const [appData, setAppData] = useState({
    workouts: [],
    measurements: [],
    settings: {
      repsTracking: true,
      weightTracking: true,
      weightIncrement: 2.5,
      customExercises: {},
      hiddenExercises: {},
      exerciseOrder: {}
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('myStrengthTracker');
      if (saved) {
        const parsed = JSON.parse(saved);
        // ensure measurements array exists for older saves
        if (!parsed.measurements) parsed.measurements = [];
        setAppData(parsed);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }, []);

  const saveData = useCallback((data) => {
    try {
      localStorage.setItem('myStrengthTracker', JSON.stringify(data));
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }, []);

  return { appData, setAppData, saveData };
};
