import React, { useState, useEffect, useCallback } from 'react';
import HomeView from './components/HomeView';
import WorkoutView from './components/WorkoutView';
import MeasurementsView from './components/MeasurementsView';
import ProgressView from './components/ProgressView';
import SettingsView from './components/SettingsView';
import ExerciseManagement from './components/ExerciseManagement';
import EditWorkoutView from './components/EditWorkoutView';
import { useAppData } from './hooks/useAppData';
import { exerciseLibrary } from './data/exercises';
import './App.css';

const MUSCLE_GROUPS = Object.keys(exerciseLibrary);

function App() {
  const { appData, setAppData, saveData } = useAppData();
  const [currentWorkout, setCurrentWorkout] = useState({});
  const [view, setView] = useState('home');
  const [repsEntry, setRepsEntry] = useState(null);
  const [abandonConfirmation, setAbandonConfirmation] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState(null);
  const [editMeasurementIdx, setEditMeasurementIdx] = useState(null);
  const [editWorkoutIdx, setEditWorkoutIdx] = useState(null);
  const [exerciseManagement, setExerciseManagement] = useState({
    muscleGroup: null, newExerciseName: '', showAddForm: false, deleteConfirmation: null
  });
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [workoutStart, setWorkoutStart] = useState(null);

  // Auto-save
  useEffect(() => { saveData(appData); }, [appData, saveData]);

  // Restore in-progress workout
  useEffect(() => {
    try {
      const saved = localStorage.getItem('myTrackerCurrentWorkout');
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasData = Object.keys(parsed).some(k => k !== 'startTime' && parsed[k]);
        if (hasData) setCurrentWorkout(parsed);
      }
    } catch (e) {}
  }, []);

  // Persist current workout
  useEffect(() => {
    try {
      if (Object.keys(currentWorkout).length > 0) {
        localStorage.setItem('myTrackerCurrentWorkout', JSON.stringify(currentWorkout));
      } else {
        localStorage.removeItem('myTrackerCurrentWorkout');
      }
    } catch (e) {}
  }, [currentWorkout]);

  // Workout timer
  useEffect(() => {
    if (!workoutStart) return;
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - workoutStart) / 1000);
      setTimerDisplay(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [workoutStart]);

  // ── Helpers ──────────────────────────────────────────────
  const capitalizeFirst = str => str.charAt(0).toUpperCase() + str.slice(1);

  const getVisibleExercises = useCallback((muscle) => {
    const hidden = appData.settings.hiddenExercises?.[muscle] || [];
    const custom = appData.settings.customExercises[muscle] || [];
    const defaults = exerciseLibrary[muscle].filter(e => !hidden.includes(e));
    const all = [...defaults, ...custom];
    const order = appData.settings.exerciseOrder?.[muscle];
    if (order?.length) {
      const ordered = [], remaining = [...all];
      order.forEach(e => { const i = remaining.indexOf(e); if (i !== -1) { ordered.push(e); remaining.splice(i, 1); } });
      return [...ordered, ...remaining];
    }
    return all;
  }, [appData.settings]);

  const getAllVisibleExercises = useCallback(() => {
    return MUSCLE_GROUPS.flatMap(m => getVisibleExercises(m).map(e => ({ exercise: e, muscle: m })));
  }, [getVisibleExercises]);

  const getMuscleForExercise = useCallback((ex) => {
    return MUSCLE_GROUPS.find(m => getVisibleExercises(m).includes(ex)) || null;
  }, [getVisibleExercises]);

  const getCustomExercises = m => appData.settings.customExercises[m] || [];
  const getHiddenDefaultExercises = m => appData.settings.hiddenExercises?.[m] || [];
  const getArchivedExercises = m => appData.settings.archivedExercises?.[m] || [];

  const exerciseHasHistory = ex => appData.workouts.some(w => w.exercises?.[ex]);

  const hasActiveSets = () => Object.values(currentWorkout).some(v => Array.isArray(v) ? v.length > 0 : v > 0);

  const getLastReps = (ex) => {
    const cur = currentWorkout[ex];
    if (Array.isArray(cur) && cur.length) return cur[cur.length - 1].reps;
    for (let i = appData.workouts.length - 1; i >= 0; i--) {
      const d = appData.workouts[i].exercises?.[ex];
      if (Array.isArray(d) && d.length) return d[d.length - 1].reps || 10;
    }
    return 10;
  };

  const getLastWeight = (ex) => {
    const cur = currentWorkout[ex];
    if (Array.isArray(cur) && cur.length) return cur[cur.length - 1].weight;
    for (let i = appData.workouts.length - 1; i >= 0; i--) {
      const d = appData.workouts[i].exercises?.[ex];
      if (Array.isArray(d) && d.length) return d[d.length - 1].weight || 0;
    }
    return 0;
  };

  // ── Actions ──────────────────────────────────────────────
  const handleStartWorkout = () => {
    setWorkoutStart(Date.now());
    setCurrentWorkout({ startTime: new Date().toISOString() });
  };

  const incrementSet = (exercise) => {
    setRepsEntry({
      exercise,
      currentReps: getLastReps(exercise),
      currentWeight: getLastWeight(exercise)
    });
  };

  const saveSetWithData = (reps, weight, duration) => {
    if (!repsEntry) return;
    const { exercise } = repsEntry;
    const makeEntry = (setNum) => {
      const entry = { set: setNum };
      if (reps != null) entry.reps = reps;
      if (weight != null) entry.weight = weight;
      if (duration != null) entry.duration = duration;
      return entry;
    };
    setCurrentWorkout(prev => {
      const cur = prev[exercise];
      let newData;
      if (Array.isArray(cur)) {
        newData = [...cur, makeEntry(cur.length + 1)];
      } else if (typeof cur === 'number') {
        const existing = Array.from({ length: cur }, (_, i) => ({ set: i + 1, reps: getLastReps(exercise), weight: getLastWeight(exercise) }));
        newData = [...existing, makeEntry(cur + 1)];
      } else {
        newData = [makeEntry(1)];
      }
      return { ...prev, [exercise]: newData };
    });
    setRepsEntry(null);
  };

  const decrementSet = (exercise) => {
    setCurrentWorkout(prev => {
      const cur = prev[exercise];
      if (Array.isArray(cur)) {
        if (cur.length > 1) return { ...prev, [exercise]: cur.slice(0, -1) };
        const { [exercise]: _, ...rest } = prev; return rest;
      }
      const n = Math.max(0, (cur || 0) - 1);
      if (n === 0) { const { [exercise]: _, ...rest } = prev; return rest; }
      return { ...prev, [exercise]: n };
    });
  };

  const finishWorkout = () => {
    if (!hasActiveSets()) { alert('No sets logged yet!'); return; }
    const newWorkout = {
      date: new Date().toISOString().split('T')[0],
      startTime: currentWorkout.startTime || new Date().toISOString(),
      exercises: Object.fromEntries(Object.entries(currentWorkout).filter(([k]) => k !== 'startTime'))
    };
    setAppData(prev => ({ ...prev, workouts: [...prev.workouts, newWorkout] }));
    setCurrentWorkout({});
    setWorkoutStart(null);
    setAbandonConfirmation(false);
    setView('home');
  };

  const confirmAbandonWorkout = () => {
    setCurrentWorkout({});
    setWorkoutStart(null);
    setAbandonConfirmation(false);
    setView('home');
  };

  const saveMeasurement = (entry) => {
    setAppData(prev => ({ ...prev, measurements: [...(prev.measurements || []), entry] }));
  };

  const updateMeasurement = (idx, entry) => {
    setAppData(prev => {
      const updated = [...(prev.measurements || [])];
      updated[idx] = entry;
      return { ...prev, measurements: updated };
    });
  };

  const deleteWorkout = (idx) => {
    setAppData(prev => ({ ...prev, workouts: prev.workouts.filter((_, i) => i !== idx) }));
  };

  const updateWorkout = (idx, workout) => {
    setAppData(prev => {
      const updated = [...prev.workouts];
      updated[idx] = workout;
      return { ...prev, workouts: updated };
    });
  };

  const addCustomExercise = (muscle, name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (getVisibleExercises(muscle).includes(trimmed)) return false;
    setAppData(prev => ({
      ...prev,
      settings: { ...prev.settings, customExercises: { ...prev.settings.customExercises, [muscle]: [...(prev.settings.customExercises[muscle] || []), trimmed] } }
    }));
    return true;
  };

  const removeExercise = (muscle, exerciseName) => {
    const isDefault = exerciseLibrary[muscle].includes(exerciseName);
    if (isDefault) {
      setAppData(prev => ({
        ...prev,
        settings: { ...prev.settings, hiddenExercises: { ...prev.settings.hiddenExercises, [muscle]: [...(prev.settings.hiddenExercises?.[muscle] || []), exerciseName] } }
      }));
    } else {
      // Archive custom exercises instead of permanently deleting — preserves workout history
      setAppData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          customExercises: { ...prev.settings.customExercises, [muscle]: (prev.settings.customExercises[muscle] || []).filter(e => e !== exerciseName) },
          archivedExercises: { ...prev.settings.archivedExercises, [muscle]: [...(prev.settings.archivedExercises?.[muscle] || []), exerciseName] }
        }
      }));
    }
    setExerciseManagement(p => ({ ...p, deleteConfirmation: null }));
  };

  const restoreArchivedExercise = (muscle, exerciseName) => {
    setAppData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        archivedExercises: { ...prev.settings.archivedExercises, [muscle]: (prev.settings.archivedExercises?.[muscle] || []).filter(e => e !== exerciseName) },
        customExercises: { ...prev.settings.customExercises, [muscle]: [...(prev.settings.customExercises[muscle] || []), exerciseName] }
      }
    }));
  };

  const moveExerciseUp = (muscle, exerciseName) => {
    const order = appData.settings.exerciseOrder?.[muscle] || getVisibleExercises(muscle);
    const idx = order.indexOf(exerciseName);
    if (idx <= 0) return;
    const newOrder = [...order];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setAppData(prev => ({ ...prev, settings: { ...prev.settings, exerciseOrder: { ...prev.settings.exerciseOrder, [muscle]: newOrder } } }));
  };

  const moveExerciseDown = (muscle, exerciseName) => {
    const order = appData.settings.exerciseOrder?.[muscle] || getVisibleExercises(muscle);
    const idx = order.indexOf(exerciseName);
    if (idx === -1 || idx >= order.length - 1) return;
    const newOrder = [...order];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setAppData(prev => ({ ...prev, settings: { ...prev.settings, exerciseOrder: { ...prev.settings.exerciseOrder, [muscle]: newOrder } } }));
  };

  const restoreDefaultExercise = (muscle, exerciseName) => {
    setAppData(prev => ({
      ...prev,
      settings: { ...prev.settings, hiddenExercises: { ...prev.settings.hiddenExercises, [muscle]: (prev.settings.hiddenExercises?.[muscle] || []).filter(e => e !== exerciseName) } }
    }));
  };

  const executeReset = (type) => {
    if (type === 'factory') {
      setAppData({ workouts: [], measurements: [], settings: { repsTracking: true, weightTracking: true, weightIncrement: 1, customExercises: {}, hiddenExercises: {}, archivedExercises: {}, exerciseOrder: {} } });
      setCurrentWorkout({});
      setView('home');
    }
    setResetConfirmation(null);
  };

  const updateSettings = (key, value) => {
    setAppData(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
  };

  const exportToCSV = () => {
    if (!appData.workouts.length) { alert('No workout data to export'); return; }
    const rows = [['Date', 'Exercise', 'Muscle', 'Set', 'Reps', 'Weight']];
    appData.workouts.forEach(w => {
      Object.entries(w.exercises || {}).forEach(([ex, sets]) => {
        const m = getMuscleForExercise(ex) || '';
        if (Array.isArray(sets)) sets.forEach(s => rows.push([w.date, ex, m, s.set || '', s.reps || '', s.weight || '']));
        else for (let i = 1; i <= sets; i++) rows.push([w.date, ex, m, i, '', '']);
      });
    });
    if (appData.measurements?.length) {
      rows.push([]);
      rows.push(['--- MEASUREMENTS ---']);
      rows.push(['Date', 'Weight', 'Body Fat %', 'Waist', 'Hips', 'Arms', 'Thighs', 'Chest']);
      appData.measurements.forEach(m => rows.push([m.date, m.weight || '', m.bodyFat || '', m.waist || '', m.hips || '', m.arms || '', m.thighs || '', m.chest || '']));
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = `my-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const commonProps = {
    appData, setAppData, currentWorkout, setCurrentWorkout,
    muscleGroups: MUSCLE_GROUPS, capitalizeFirst,
    getVisibleExercises, getAllVisibleExercises, getMuscleForExercise,
    getCustomExercises, getHiddenDefaultExercises, getArchivedExercises,
    incrementSet, decrementSet, finishWorkout, confirmAbandonWorkout,
    hasActiveSets, exerciseHasHistory,
    addCustomExercise, removeExercise, restoreArchivedExercise, moveExerciseUp, moveExerciseDown, restoreDefaultExercise,
    updateSettings, exportToCSV, executeReset, deleteWorkout, updateWorkout, saveMeasurement, updateMeasurement,
    editMeasurementIdx, setEditMeasurementIdx,
    editWorkoutIdx, setEditWorkoutIdx,
    repsEntry, setRepsEntry, saveSetWithData,
    abandonConfirmation, setAbandonConfirmation,
    resetConfirmation, setResetConfirmation,
    exerciseManagement, setExerciseManagement,
    onStartWorkout: handleStartWorkout, timerDisplay,
    setView
  };

  switch (view) {
    case 'workout':         return <WorkoutView {...commonProps} />;
    case 'measurements':        return <MeasurementsView {...commonProps} mode="all" />;
    case 'measurements-scale':  return <MeasurementsView {...commonProps} mode="scale" />;
    case 'measurements-body':   return <MeasurementsView {...commonProps} mode="body" />;
    case 'progress':        return <ProgressView {...commonProps} />;
    case 'settings':        return <SettingsView {...commonProps} />;
    case 'exercise-management': return <ExerciseManagement {...commonProps} />;
    case 'edit-workout':        return <EditWorkoutView {...commonProps} />;
    default:                return <HomeView {...commonProps} />;
  }
}

export default App;
