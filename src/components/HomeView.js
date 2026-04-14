import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { exerciseLibrary } from '../data/exercises';

const MUSCLE_GROUPS = Object.keys(exerciseLibrary);

const HomeView = ({ appData, setView, muscleGroups, capitalizeFirst, deleteWorkout }) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  const formatDate = (dateStr) => {
    const now = new Date();
    const d = new Date(dateStr);
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((todayOnly - dOnly) / 86400000);
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diff === 0) return `Today, ${dateLabel}, ${timeLabel}`;
    if (diff === 1) return `Yesterday, ${dateLabel}, ${timeLabel}`;
    return `${dayNames[d.getDay()]}, ${dateLabel} · ${timeLabel}`;
  };

  const getRecentWorkouts = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return [...appData.workouts]
      .filter(w => new Date(w.startTime || w.date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.startTime || b.date) - new Date(a.startTime || a.date))
      .slice(0, 7);
  };

  const getWeeklyTotals = () => {
    const totals = {};
    MUSCLE_GROUPS.forEach(m => totals[m] = 0);
    getRecentWorkouts().forEach(w => {
      if (!w.exercises) return;
      Object.entries(w.exercises).forEach(([ex, sets]) => {
        let muscle = MUSCLE_GROUPS.find(m => exerciseLibrary[m].includes(ex));
        if (!muscle) muscle = MUSCLE_GROUPS.find(m => (appData.settings.customExercises[m] || []).includes(ex));
        if (muscle) totals[muscle] += Array.isArray(sets) ? sets.length : (sets || 0);
      });
    });
    return totals;
  };

  const getWorkoutMuscles = (workout) => {
    if (!workout.exercises) return [];
    const muscles = new Set();
    Object.keys(workout.exercises).forEach(ex => {
      let m = MUSCLE_GROUPS.find(m => exerciseLibrary[m].includes(ex));
      if (!m) m = MUSCLE_GROUPS.find(m => (appData.settings.customExercises[m] || []).includes(ex));
      if (m) muscles.add(m);
    });
    return [...muscles];
  };

  const getTotalSets = (workout) => {
    if (!workout.exercises) return 0;
    return Object.values(workout.exercises).reduce((a, v) => a + (Array.isArray(v) ? v.length : (v || 0)), 0);
  };

  const getLastMeasurement = () => appData.measurements?.[appData.measurements.length - 1];
  const getPrevMeasurement = () => appData.measurements?.[appData.measurements.length - 2];

  const now = new Date();
  const recent = getRecentWorkouts();
  const weeklyTotals = getWeeklyTotals();
  const lastMeas = getLastMeasurement();
  const prevMeas = getPrevMeasurement();

  const wDelta = lastMeas && prevMeas && lastMeas.weight && prevMeas.weight
    ? (lastMeas.weight - prevMeas.weight) : null;
  const bfDelta = lastMeas && prevMeas && lastMeas.bodyFat && prevMeas.bodyFat
    ? (lastMeas.bodyFat - prevMeas.bodyFat) : null;

  const sevenDaysWorkouts = appData.workouts.filter(w => (now - new Date(w.startTime || w.date)) < 7 * 86400000).length;
  const sevenDaysSets = appData.workouts
    .filter(w => (now - new Date(w.startTime || w.date)) < 7 * 86400000)
    .reduce((a, w) => a + Object.values(w.exercises || {}).reduce((b, v) => b + (Array.isArray(v) ? v.length : (v || 0)), 0), 0);

  return (
    <div className="app-container">
      <div className="app-header">
        <button onClick={() => setView('settings')} className="icon-button">
          <Settings size={20} />
        </button>
        <div>
          <div className="app-title">MY TRACKER</div>
          <div className="app-subtitle">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
        <div className="spacer" />
      </div>

      <div className="app-content">
        {/* Metrics */}
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-val">{lastMeas?.weight ? lastMeas.weight.toFixed(1) : '—'}</div>
            <div className="metric-label">
              Body Weight (lbs)
              {wDelta !== null && <div className={wDelta <= 0 ? 'metric-delta-pos' : 'metric-delta-neg'}>{wDelta >= 0 ? '+' : ''}{wDelta.toFixed(1)} lbs</div>}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-val">{lastMeas?.bodyFat ? lastMeas.bodyFat.toFixed(1) + '%' : '—'}</div>
            <div className="metric-label">
              Body Fat
              {bfDelta !== null && <div className={bfDelta <= 0 ? 'metric-delta-pos' : 'metric-delta-neg'}>{bfDelta >= 0 ? '+' : ''}{bfDelta.toFixed(1)}%</div>}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-val">{sevenDaysWorkouts}</div>
            <div className="metric-label">Workouts this week</div>
          </div>
          <div className="metric-card">
            <div className="metric-val">{sevenDaysSets}</div>
            <div className="metric-label">Sets this week</div>
          </div>
        </div>

        {/* Streak */}
        <div className="section-title">THIS WEEK</div>
        <div className="streak-row">
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - (6 - i));
            const dStr = d.toISOString().split('T')[0];
            const has = appData.workouts.some(w => (w.startTime || w.date || '').startsWith(dStr));
            return (
              <div key={i} className={`streak-dot${has ? ' done' : ''}`}>
                {['S','M','T','W','T','F','S'][d.getDay()]}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="home-actions">
          <button className="primary-button" onClick={() => setView('workout')}>START WORKOUT</button>
          <button className="secondary-button" onClick={() => setView('measurements')}>LOG MEASUREMENTS</button>
        </div>

        {/* 7-day totals */}
        {recent.length > 0 && (
          <>
            <div className="section-title">7-DAY TOTALS</div>
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {MUSCLE_GROUPS.map(m => (
                  <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>{capitalizeFirst(m)}</span>
                    <span style={{ fontWeight: 500, color: weeklyTotals[m] > 0 ? 'var(--lime)' : 'var(--text2)' }}>{weeklyTotals[m]}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recent workouts */}
        {recent.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-title">LET'S GO!</div>
            <p className="welcome-text">Track your lifts, log your measurements, watch yourself improve.</p>
            <p className="welcome-tip">💡 Reps and weight tracking are already on for you</p>
          </div>
        ) : (
          <>
            <div className="section-title">RECENT WORKOUTS</div>
            {recent.map((w, wi) => {
              const muscles = getWorkoutMuscles(w);
              const totalSets = getTotalSets(w);
              const idx = appData.workouts.indexOf(w);
              return (
                <div key={wi} className="history-item">
                  <div className="history-item-header">
                    <div className="history-date">{formatDate(w.startTime || w.date)} · {totalSets} sets</div>
                    <button className="delete-history-btn" onClick={() => setDeleteConfirmation({ idx })} title="Delete workout">×</button>
                  </div>
                  <div className="history-muscles">
                    {muscles.map(m => <span key={m} className="muscle-tag">{capitalizeFirst(m)}</span>)}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmation && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmation(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">Delete Workout?</div>
            <div className="confirm-sub">This workout will be permanently removed. This cannot be undone.</div>
            <button className="danger-button" onClick={() => { deleteWorkout(deleteConfirmation.idx); setDeleteConfirmation(null); }}>DELETE WORKOUT</button>
            <button className="secondary-button" onClick={() => setDeleteConfirmation(null)}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;
