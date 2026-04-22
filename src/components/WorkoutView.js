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
  const isTimed  = muscle === 'core';
  const hasTimer = isCardio || isTimed;

  const defaultDur = isCardio ? 300 : 60;
  const durStep    = isCardio ? 15  : 5;

  // cardio: default to manual; core: timer only
  const [cardioMode,    setCardioMode]    = useState('manual'); // 'manual' | 'timer'
  const [manualDur,     setManualDur]     = useState(1800);     // manual cardio duration (s), default 30min
  const [note,          setNote]          = useState('');
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
        saveRef.current(null, null, d, undefined, true); // skipRestTimer for timer-based cardio
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

  const handleManualSave = () => {
    saveSetWithData(null, null, manualDur, note.trim() || undefined);
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

        {/* ── Cardio mode toggle ── */}
        {isCardio && timerPhase === 'idle' && (
          <div className="tab-bar" style={{ marginBottom: 16 }}>
            <button
              className={`tab-btn${cardioMode === 'manual' ? ' active' : ''}`}
              onClick={() => setCardioMode('manual')}
            >
              LOG MANUALLY
            </button>
            <button
              className={`tab-btn${cardioMode === 'timer' ? ' active' : ''}`}
              onClick={() => setCardioMode('timer')}
            >
              USE TIMER
            </button>
          </div>
        )}

        {/* ── Cardio manual mode ── */}
        {isCardio && cardioMode === 'manual' && timerPhase === 'idle' && (
          <>
            <div className="modal-label" style={{ marginBottom: 8 }}>DURATION</div>
            <div className="modal-val-row">
              <button className="modal-ctrl-btn minus" onClick={() => setManualDur(d => Math.max(60, d - 60))}>−</button>
              <div className="modal-val">{fmtTime(manualDur)}</div>
              <button className="modal-ctrl-btn plus" onClick={() => setManualDur(d => d + 60)}>+</button>
            </div>

            <div className="modal-divider" />

            <div className="modal-label" style={{ marginBottom: 8 }}>NOTES <span style={{ color: 'var(--text2)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></div>
            <input
              className="add-ex-input"
              style={{ marginBottom: 0 }}
              placeholder="e.g. outdoor walk, slight incline"
              value={note}
              onChange={e => setNote(e.target.value)}
            />

            <div className="modal-actions">
              <button className="primary-button" onClick={handleManualSave}>SAVE SET</button>
              <button className="secondary-button" onClick={handleModalClose}>CANCEL</button>
            </div>
          </>
        )}

        {/* ── Timer section (core always; cardio when timer mode) ── */}
        {hasTimer && (!isCardio || cardioMode === 'timer') && (
          <div className="timer-section">
            {!isCardio && <div className="modal-label" style={{ marginBottom: 8 }}>TIMER</div>}

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

        {/* ── Reps / Weight (core only, when idle) ── */}
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

        {/* ── Actions for non-cardio (idle only) ── */}
        {!isCardio && timerPhase === 'idle' && (
          <div className="modal-actions">
            <button className="primary-button" onClick={handleSave}>SAVE SET</button>
            <button className="secondary-button" onClick={handleModalClose}>CANCEL</button>
          </div>
        )}

        {/* ── Cancel for cardio timer mode when idle ── */}
        {isCardio && cardioMode === 'timer' && timerPhase === 'idle' && (
          <div className="modal-actions">
            <button className="secondary-button" onClick={handleModalClose}>CANCEL</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── WorkoutView ────────────────────────────────────────────────────────────────

// Category label → muscle key for saving custom exercises
const CATEGORY_TO_MUSCLE = { Arms: 'chest', Legs: 'legs', Core: 'core', Cardio: 'cardio' };

const WorkoutView = ({
  muscleGroups, capitalizeFirst, getAllVisibleExercises, getVisibleExercises,
  getMuscleForExercise, currentWorkout, setCurrentWorkout, incrementSet, decrementSet,
  setView, finishWorkout, hasActiveSets, appData, addCustomExercise,
  repsEntry, setRepsEntry, saveSetWithData,
  abandonConfirmation, setAbandonConfirmation, confirmAbandonWorkout,
  onStartWorkout, timerDisplay, isPaused, togglePause,
  restTimer, dismissRestTimer,
  weightFlags, setWeightFlag
}) => {
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showAddExercise,      setShowAddExercise]      = useState(false);
  const [newExName,            setNewExName]            = useState('');
  const [newExCategory,        setNewExCategory]        = useState('');
  const [addExError,           setAddExError]           = useState('');
  const exerciseRefs = useRef({});

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
    if (last.duration != null) {
      return last.note ? `${fmtTime(last.duration)} · ${last.note}` : fmtTime(last.duration);
    }
    return `${last.weight}lbs × ${last.reps}`;
  };

  const handleAddExercise = () => {
    const name = newExName.trim();
    if (!name) { setAddExError('Please enter an exercise name.'); return; }
    const muscle = CATEGORY_TO_MUSCLE[newExCategory];
    if (!muscle) { setAddExError('Please select a category.'); return; }
    const existing = getVisibleExercises(muscle);
    if (existing.map(e => e.toLowerCase()).includes(name.toLowerCase())) {
      setAddExError('That exercise already exists in this category.');
      return;
    }
    addCustomExercise(muscle, name);
    setShowAddExercise(false);
    setNewExName('');
    setNewExCategory('');
    setAddExError('');
    // Scroll to new row after render
    setTimeout(() => {
      const el = exerciseRefs.current[name];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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
        <div style={{ textAlign: 'center' }}>
          <div className="app-title">WORKOUT</div>
          <div className="app-subtitle" style={{ color: isPaused ? 'var(--text2)' : undefined }}>
            {timerDisplay}
          </div>
          {isPaused && <div className="timer-paused-label">paused</div>}
        </div>
        <button className="icon-button" onClick={togglePause} title={isPaused ? 'Resume' : 'Pause'}>
          {isPaused ? '▶' : '⏸'}
        </button>
      </div>

      {isPaused && <div className="paused-banner">WORKOUT PAUSED</div>}

      <div className="app-content" style={restTimer?.active ? { paddingBottom: 72 } : undefined}>
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
            <div key={ex} ref={el => { exerciseRefs.current[ex] = el; }} className={`exercise-row${sets > 0 ? ' worked' : ''}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="exercise-muscle-tag"
                  style={{ color: MUSCLE_COLORS[m] || 'var(--lime)', background: `${MUSCLE_COLORS[m] || '#C8F135'}1A` }}
                >
                  {MUSCLE_GROUP_LABELS[m] || m}
                </div>
                <div className="exercise-name">{ex}</div>
                {weightFlags[ex] && (
                  <div className={`weight-flag-badge ${weightFlags[ex]}`}>
                    {weightFlags[ex] === 'up' ? '↑ increase weight' : '↓ reduce weight'}
                  </div>
                )}
                <div className="exercise-meta">
                  {sets > 0 ? `${sets} sets · ` : ''}
                  {lastDisplay ? `last: ${lastDisplay}` : 'no history yet'}
                </div>
              </div>
              <div className="exercise-controls">
                {sets > 0 && (
                  <>
                    <button
                      className={`weight-flag-btn up${weightFlags[ex] === 'up' ? ' active' : ''}`}
                      onClick={() => setWeightFlag(ex, 'up')}
                      title="Flag: increase weight next session"
                    >↑</button>
                    <button
                      className={`weight-flag-btn down${weightFlags[ex] === 'down' ? ' active' : ''}`}
                      onClick={() => setWeightFlag(ex, 'down')}
                      title="Flag: reduce weight next session"
                    >↓</button>
                  </>
                )}
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

        {/* Add exercise */}
        <button
          className="secondary-button add-exercise-btn"
          onClick={() => {
            setNewExName('');
            setNewExCategory(activeCategories.length === 1 ? activeCategories[0] : '');
            setAddExError('');
            setShowAddExercise(true);
          }}
        >
          + ADD EXERCISE
        </button>

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

      {/* Rest timer bar */}
      {restTimer?.active && (() => {
        const catMeta = WORKOUT_CATEGORIES.find(c => c.label === restTimer.category);
        const barColor = catMeta?.color || 'var(--lime)';
        const pct = restTimer.total > 0 ? (restTimer.remaining / restTimer.total) * 100 : 0;
        return (
          <div className="rest-timer-bar">
            <div className="rest-timer-fill" style={{ width: `${pct}%`, background: barColor }} />
            <div className="rest-timer-content">
              <span className="rest-timer-icon">💤</span>
              <span className="rest-timer-label">REST</span>
              <span className={`rest-timer-time${restTimer.remaining <= 10 ? ' warn' : ''}`}>
                {fmtTime(restTimer.remaining)}
              </span>
              <button className="rest-timer-skip" onClick={dismissRestTimer}>SKIP</button>
            </div>
          </div>
        );
      })()}

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

      {/* Add exercise modal */}
      {showAddExercise && (
        <div className="modal-overlay" onClick={() => setShowAddExercise(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-title">ADD EXERCISE</div>

            <input
              className="add-ex-input"
              placeholder="Exercise name"
              value={newExName}
              onChange={e => { setNewExName(e.target.value); setAddExError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAddExercise()}
              autoFocus
            />

            {/* Category chips — only show categories active in this workout */}
            <div className="modal-label" style={{ marginBottom: 8 }}>CATEGORY</div>
            <div className="add-ex-category-chips">
              {(activeCategories.length > 0 ? activeCategories : Object.keys(CATEGORY_TO_MUSCLE)).map(cat => {
                const muscle = CATEGORY_TO_MUSCLE[cat];
                const color  = muscle ? MUSCLE_COLORS[muscle] : 'var(--lime)';
                const active = newExCategory === cat;
                return (
                  <button
                    key={cat}
                    className={`add-ex-cat-chip${active ? ' active' : ''}`}
                    style={active
                      ? { background: `${color}28`, color, border: `1.5px solid ${color}` }
                      : { border: '1.5px solid var(--surface3)' }
                    }
                    onClick={() => { setNewExCategory(cat); setAddExError(''); }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {addExError && <div className="add-ex-error">{addExError}</div>}

            <div className="modal-actions">
              <button className="primary-button" onClick={handleAddExercise}>SAVE</button>
              <button className="secondary-button" onClick={() => setShowAddExercise(false)}>CANCEL</button>
            </div>
          </div>
        </div>
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
