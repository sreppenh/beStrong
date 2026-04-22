import { useState, useEffect, useCallback } from 'react';

// Merge any 'abs' entries in a settings sub-object into 'core'
const mergeAbsIntoCore = (obj) => {
  if (!obj || !('abs' in obj)) return obj;
  const { abs, core, ...rest } = obj;
  const merged = [...(core || [])];
  (abs || []).forEach(item => { if (!merged.includes(item)) merged.push(item); });
  return merged.length > 0 ? { ...rest, core: merged } : rest;
};

const migrateWorkoutDates = (workouts) => {
  return workouts.map(workout => {
    if (!workout.startTime) return workout;
    const startDate = new Date(workout.startTime);
    const localDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    if (workout.date !== localDate) {
      return { ...workout, date: localDate };
    }
    return workout;
  });
};

const migrateAbsToCore = (data) => {
  if (!data?.settings) return data;
  return {
    ...data,
    settings: {
      ...data.settings,
      customExercises:  mergeAbsIntoCore(data.settings.customExercises),
      hiddenExercises:  mergeAbsIntoCore(data.settings.hiddenExercises),
      archivedExercises: mergeAbsIntoCore(data.settings.archivedExercises),
      exerciseOrder:    mergeAbsIntoCore(data.settings.exerciseOrder),
    },
  };
};

export const useAppData = () => {
  const [appData, setAppData] = useState({
    workouts: [],
    measurements: [],
    settings: {
      repsTracking: true,
      weightTracking: true,
      weightIncrement: 1,
      customExercises: {},
      hiddenExercises: {},
      archivedExercises: {},
      exerciseOrder: {},
      restTimerEnabled: true,
      restTimerArmsLegs: 90,
      restTimerCoreCardio: 45,
      weightFlags: {}
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('myStrengthTracker');
      if (saved) {
        let parsed = JSON.parse(saved);
        if (!parsed.measurements) parsed.measurements = [];
        parsed = migrateAbsToCore(parsed);
        parsed.workouts = migrateWorkoutDates(parsed.workouts || []);
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
