import React, { useEffect, useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { MUSCLE_COLORS, MUSCLE_GROUP_LABELS } from '../data/categories';
import WorkoutTypeSelectorModal, { WORKOUT_CATEGORIES } from './WorkoutTypeSelectorModal';

const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ── Set Entry Modal ────────────────────────────────────────────────────────────

const SetEntryModal = ({
  repsEntry, setRepsEntry, saveSetWithData,
  getMuscleForExercise, appData, capitalizeFirst
}) => {
  const muscle   = getMuscleForExercise(repsEntry.exercise) || '';
  const isCardio = muscle === 'cardio';
  const isTimed  = muscle === 'abs' || muscle === 'core';
  const hasTimer = isCardio || isTimed;

  const defaultDur = isCardio ? 300 : 60;
  const durStep    = isCardio ? 15  : 5;

  const [duration,      setDuration]      = useState(defaultDur);
  const [timeLeft,      setTimeLeft]      = useState(defaultDur);
  // timerPhase: 'idle' | 'countdown' | 'running' | 'finishing'
  const [timerPhase,    setTimerPhase]    = useState('idle');
  const [countdownNum,  setCountdownNum]  = useState(3);
  const [timerDone,     setTimerDone]     = useState(false);
  const [currentReps,   setCurrentReps]   = useState(repsEntry.currentReps);
  const [currentWeight, setCurrentWeight] = useState(repsEntry.currentWeight);

  const intervalRef   = useRef(null);
  const cTimers       = useRef([]);
  const wakeLockRef   = useRef(null);
  const audioCtxRef   = useRef(null);
  const timeLeftRef   = useRef(defaultDur);
  const durationRef   = useRef(defaultDur);
  const saveRef       = useRef(saveSetWithData);
  const isCardioRef   = useRef(isCardio);

  durationRef.current  = duration;
  saveRef.current      = saveSetWithData;
  isCardioRef.current  = isCardio;

  // Sync timeLeft display with duration picker when idle
  useEffect(() => {
    if (timerPhase === 'idle' && !timerDone) {
      setTimeLeft(duration);
      timeLeftRef.current = duration;
    }
  }, [duration]); // eslint-disable-line

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      cTimers.current.forEach(clearTimeout);
      releaseWakeLock();
    };
  }, []); // eslint-disable-line

  // ── Audio ──────────────────────────────────────────────────
  const createBeep = (frequency, durationMs, volume = 0.4) => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx  = audioCtxRef.current;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch (e) {}
  };

  // ── Wake lock ──────────────────────────────────────────────
  const requestWakeLock = async () => {
    try {
      if (navigator.wakeLock) wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch (e) {}
  };
  const releaseWakeLock = () => {
    try { if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; } } catch (e) {}
  };

  // ── Finish alarm ───────────────────────────────────────────
  const doFinish = () => {
    createBeep(660, 150, 0.6);
    setTimeout(() => createBeep(660, 150, 0.6), 350);
    setTimeout(() => createBeep(880, 600, 0.7), 700);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    releaseWakeLock();
    setTimerPhase('finishing');

    setTimeout(() => {
      const d = durationRef.current;
      if (isCardioRef.current) {
        saveRef.current(null, null, d);
      } else {
        setTimerDone(true);
        setCurrentReps(Math.round(d / 3));
        setTimerPhase('idle');
      }
    }, 2000);
  };

  // ── Running interval ───────────────────────────────────────
  useEffect(() => {
    if (timerPhase !== 'running') return;
    intervalRef.current = setInterval(() => {
      const next = timeLeftRef.current - 1;
      timeLeftRef.current = next;
      setTimeLeft(next);
      if (next > 0 && next <= 5) createBeep(440, 100, 0.3);
      if (next <= 0) {
        clearInterval(intervalRef.current);
        doFinish();
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timerPhase]); // eslint-disable-line

  // ── Handlers ───────────────────────────────────────────────
  const handleStart = () => {
    cTimers.current.forEach(clearTimeout);
    cTimers.current = [];
    timeLeftRef.current = durationRef.current;
    setTimeLeft(durationRef.current);
    setTimerDone(false);
    setCountdownNum(3);
    setTimerPhase('countdown');

    createBeep(440, 150, 0.4);                                                          // 3
    cTimers.current.push(setTimeout(() => { setCountdownNum(2); createBeep(440, 150, 0.4); }, 1000)); // 2
    cTimers.current.push(setTimeout(() => { setCountdownNum(1); createBeep(660, 300, 0.6); }, 2000)); // 1
    cTimers.current.push(setTimeout(() => setCountdownNum('GO!'), 3000));               // GO!
    cTimers.current.push(setTimeout(() => { setTimerPhase('running'); requestWakeLock(); }, 3500));
  };

  const handleCancelTimer = () => {
    clearInterval(intervalRef.current);
    cTimers.current.forEach(clearTimeout);
    cTimers.current = [];
    releaseWakeLock();
    setTimerPhase('idle');
    setTimeLeft(durationRef.current);
    timeLeftRef.current = durationRef.current;
  };

  const handleModalClose = () => {
    if (timerPhase === 'finishing') return;
    clearInterval(intervalRef.current);
    cTimers.current.forEach(clearTimeout);
    releaseWakeLock();
    setRepsEntry(null);
  };

  const handleSave = () => {
    if (isCardio) {
      saveSetWithData(null, null, duration);
    } else {
      saveSetWithData(currentReps, currentWeight, timerDone ? duration : undefined);
    }
  };

  const wi = appData.settings.weightIncrement || 1;

  return (
    <div className="modal-overlay" onClick={timerPhase === 'idle' ? handleModalClose : undefined}>
      <div className="modal-sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{repsEntry.exercise}</div>
        <div className="modal-subtitle">{capitalizeFirst(muscle)}</div>

        {/* ── Timer section ── */}
        {hasTimer && (
          <div className="timer-section">
            <div className="modal-label" style={{ marginBottom: 8 }}>TIMER</div>

            {/* Idle: duration picker + start button */}
            {timerPhase === 'idle' && (
              <>
                <div className="modal-val-row">
                  <button className="modal-ctrl-btn minus" onClick={() => setDuration(d => Math.max(durStep, d - durStep))}>−</button>
                  <div className="modal-val" style={{ color: timerDone ? 'var(--lime)' : undefined }}>
                    {fmtTime(duration)}
                  </div>
                  <button className="modal-ctrl-btn plus" onClick={() => setDuration(d => d + durStep)}>+</button>
                </div>
                <button className="timer-start-btn" onClick={handleStart}>
                  {timerDone ? 'RESTART' : 'START'}
                </button>
              </>
            )}

            {/* Running: pulsing countdown + cancel */}
            {timerPhase === 'running' && (
              <>
                <div className={`timer-countdown timer-pulse${timeLeft <= 10 ? ' timer-warn' : ''}`}>
                  {fmtTime(timeLeft)}
                </div>
                <button className="timer-stop-btn" onClick={handleCancelTimer}>CANCEL</button>
              </>
            )}

            {/* Finishing: DONE! flash */}
            {timerPhase === 'finishing' && (
              <div className="timer-countdown timer-done-flash">DONE!</div>
            )}
          </div>
        )}

        {/* ── 3-2-1 countdown overlay ── */}
        {timerPhase === 'countdown' && (
          <div className="countdown-overlay">
            <div key={String(countdownNum)} className={`countdown-number${countdownNum === 'GO!' ? ' countdown-go' : ''}`}>
              {countdownNum}
            </div>
          </div>
        )}

        {/* ── Reps / Weight (not cardio, only when idle) ── */}
        {!isCardio && timerPhase === 'idle' && (
          <>
            {hasTimer && <div className="modal-divider" />}

            <div className="modal-label" style={{ marginBottom: 8 }}>REPS</div>
            <div className="modal-val-row">
              <button className="modal-ctrl-btn minus" onClick={() => setCurrentReps(r => Math.max(1, r - 1))}>−</button>
              <div className="modal-val">{currentReps}</div>
              <button className="modal-ctrl-btn plus" onClick={() => setCurrentReps(r => Math.min(100, r + 1))}>+</button>
            </div>

            <div className="modal-divider" />

            <div className="modal-label" style={{ marginBottom: 8 }}>WEIGHT (lbs)</div>
            <div className="modal-val-row">
              <button className="modal-ctrl-btn minus" onClick={() => setCurrentWeight(w => Math.max(0, Math.round((w - wi) * 10) / 10))}>−</button>
              <div className="modal-val">{currentWeight}</div>
              <button className="modal-ctrl-btn plus" onClick={() => setCurrentWeight(w => Math.round((w + wi) * 10) / 10)}>+</button>
            </div>
          </>
        )}

        {/* ── Actions (idle only) ── */}
        {timerPhase === 'idle' && (
          <div className="modal-actions">
            <button className="primary-button" onClick={handleSave}>SAVE SET</button>
            <button className="secondary-button" onClick={handleModalClose}>CANCEL</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── WorkoutView ────────────────────────────────────────────────────────────────

const WorkoutView = ({
  muscleGroups, capitalizeFirst, getAllVisibleExercises,
  getMuscleForExercise, currentWorkout, setCurrentWorkout, incrementSet, decrementSet,
  setView, finishWorkout, hasActiveSets, appData,
  repsEntry, setRepsEntry, saveSetWithData,
  abandonConfirmation, setAbandonConfirmation, confirmAbandonWorkout,
  onStartWorkout, timerDisplay
}) => {
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  useEffect(() => {
    if (!currentWorkout.startTime) onStartWorkout();
  }, []); // eslint-disable-line

  const activeCategories = currentWorkout.categories || [];
  const allExercises = getAllVisibleExercises().filter(({ muscle }) =>
    activeCategories.length === 0 || activeCategories.includes(MUSCLE_GROUP_LABELS[muscle] || muscle)
  );
  const wk = currentWorkout;

  const getSets = (ex) => {
    const d = wk[ex];
    return Array.isArray(d) ? d.length : (d || 0);
  };

  const getLastDisplay = (ex) => {
    const d = wk[ex];
    if (!Array.isArray(d) || !d.length) return null;
    const last = d[d.length - 1];
    if (last.duration != null) return fmtTime(last.duration);
    return `${last.weight}lbs × ${last.reps}`;
  };

  // Muscle strip summary
  const muscleStrip = muscleGroups.map(m => {
    const exes  = allExercises.filter(({ muscle }) => muscle === m);
    const total = exes.reduce((a, { exercise: ex }) => a + getSets(ex), 0);
    return { m, total };
  }).filter(x => x.total > 0);

  return (
    <div className="app-container">
      <div className="app-header">
        <div style={{ width: 36 }} />
        <div>
          <div className="app-title">WORKOUT</div>
          <div className="app-subtitle">{timerDisplay}</div>
        </div>
        <div style={{ width: 36 }} />
      </div>

      <div className="app-content">
        {/* Selected category chips */}
        {activeCategories.length > 0 && (
          <div className="category-chips-row">
            <div className="category-chips-list">
              {activeCategories.map(cat => {
                const meta = WORKOUT_CATEGORIES.find(c => c.label === cat);
                if (!meta) return null;
                return (
                  <span
                    key={cat}
                    className="category-chip"
                    style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}55` }}
                  >
                    {meta.emoji} {cat}
                  </span>
                );
              })}
            </div>
            <button className="change-categories-btn" onClick={() => setShowCategorySelector(true)}>
              change
            </button>
          </div>
        )}

        {/* Muscle summary strip */}
        <div className="workout-strip">
          {muscleStrip.length === 0
            ? <span className="strip-empty">No sets yet — tap + to start</span>
            : muscleStrip.map(({ m, total }) => (
              <div key={m} className="strip-chip active">
                <span className="strip-chip-count">{total}</span>
                {capitalizeFirst(m)}
              </div>
            ))
          }
        </div>

        {/* Flat exercise list */}
        {allExercises.map(({ exercise: ex, muscle: m }) => {
          const sets       = getSets(ex);
          const lastDisplay = getLastDisplay(ex);
          return (
            <div key={ex} className={`exercise-row${sets > 0 ? ' worked' : ''}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="exercise-muscle-tag"
                  style={{ color: MUSCLE_COLORS[m] || 'var(--lime)', background: `${MUSCLE_COLORS[m] || '#C8F135'}1A` }}
                >
                  {MUSCLE_GROUP_LABELS[m] || m}
                </div>
                <div className="exercise-name">{ex}</div>
                <div className="exercise-meta">
                  {sets > 0 ? `${sets} sets · ` : ''}
                  {lastDisplay ? `last: ${lastDisplay}` : 'no history yet'}
                </div>
              </div>
              <div className="exercise-controls">
                {sets > 0 && (
                  <button className="round-btn minus" onClick={() => decrementSet(ex)}>−</button>
                )}
                {sets > 0 && (
                  <div className="exercise-set-count">{sets}</div>
                )}
                <button className="round-btn plus" onClick={() => incrementSet(ex)}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Actions */}
        <div className="workout-actions">
          {hasActiveSets() && (
            <button className="primary-button" onClick={finishWorkout}>FINISH WORKOUT</button>
          )}
          <button className="secondary-button" onClick={() => {
            if (hasActiveSets()) setAbandonConfirmation(true);
            else confirmAbandonWorkout();
          }}>ABANDON WORKOUT</button>
        </div>
      </div>

      {/* Set entry modal */}
      {repsEntry && (
        <SetEntryModal
          repsEntry={repsEntry}
          setRepsEntry={setRepsEntry}
          saveSetWithData={saveSetWithData}
          getMuscleForExercise={getMuscleForExercise}
          appData={appData}
          capitalizeFirst={capitalizeFirst}
        />
      )}

      {/* Category selector (mid-workout change) */}
      {showCategorySelector && (
        <WorkoutTypeSelectorModal
          initialSelected={activeCategories}
          onConfirm={(cats) => {
            setCurrentWorkout(prev => ({ ...prev, categories: cats }));
            setShowCategorySelector(false);
          }}
          onCancel={() => setShowCategorySelector(false)}
        />
      )}

      {/* Abandon confirmation */}
      {abandonConfirmation && (
        <div className="modal-overlay" onClick={() => setAbandonConfirmation(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">Abandon Workout?</div>
            <div className="confirm-sub">All progress will be lost. This cannot be undone.</div>
            <button className="danger-button" onClick={confirmAbandonWorkout}>YES, ABANDON</button>
            <button className="secondary-button" onClick={() => setAbandonConfirmation(false)}>KEEP GOING</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutView;
