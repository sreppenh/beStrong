import React, { useEffect, useState, useRef } from 'react';
import { Plus } from 'lucide-react';

const fmtTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {}
};

// ── Set Entry Modal ────────────────────────────────────────────────────────────

const SetEntryModal = ({
  repsEntry, setRepsEntry, saveSetWithData,
  getMuscleForExercise, appData, capitalizeFirst
}) => {
  const muscle    = getMuscleForExercise(repsEntry.exercise) || '';
  const isCardio  = muscle === 'cardio';
  const isTimed   = muscle === 'abs' || muscle === 'core';
  const hasTimer  = isCardio || isTimed;

  const defaultDur  = isCardio ? 300 : 60;
  const durStep     = isCardio ? 15  : 5;

  const [duration,     setDuration]     = useState(defaultDur);
  const [timeLeft,     setTimeLeft]     = useState(defaultDur);
  const [running,      setRunning]      = useState(false);
  const [timerDone,    setTimerDone]    = useState(false);
  const [currentReps,  setCurrentReps]  = useState(repsEntry.currentReps);
  const [currentWeight,setCurrentWeight]= useState(repsEntry.currentWeight);

  const intervalRef  = useRef(null);
  const durationRef  = useRef(duration);
  const saveRef      = useRef(saveSetWithData);

  // Keep refs in sync
  durationRef.current = duration;
  saveRef.current     = saveSetWithData;

  // Sync timeLeft with duration changes when idle
  useEffect(() => {
    if (!running && !timerDone) setTimeLeft(duration);
  }, [duration]); // eslint-disable-line

  // Timer countdown
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          playBeep();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          const d = durationRef.current;
          if (isCardio) {
            saveRef.current(null, null, d);
          } else {
            setTimerDone(true);
            setCurrentReps(Math.round(d / 3));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]); // eslint-disable-line

  const handleStart = () => {
    setTimeLeft(duration);
    setTimerDone(false);
    setRunning(true);
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setTimeLeft(duration);
  };

  const handleCancel = () => {
    clearInterval(intervalRef.current);
    setRepsEntry(null);
  };

  const handleSave = () => {
    if (isCardio) {
      saveSetWithData(null, null, duration);
    } else {
      const dur = timerDone ? duration : undefined;
      saveSetWithData(currentReps, currentWeight, dur);
    }
  };

  const wi = appData.settings.weightIncrement || 1;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{repsEntry.exercise}</div>
        <div className="modal-subtitle">{capitalizeFirst(muscle)}</div>

        {/* ── Timer section ── */}
        {hasTimer && (
          <div className="timer-section">
            <div className="modal-label" style={{ marginBottom: 8 }}>TIMER</div>

            {running ? (
              <>
                <div className="timer-countdown">{fmtTime(timeLeft)}</div>
                <button className="timer-stop-btn" onClick={handleStop}>STOP</button>
              </>
            ) : (
              <>
                <div className="modal-val-row">
                  <button
                    className="modal-ctrl-btn minus"
                    onClick={() => setDuration(d => Math.max(durStep, d - durStep))}
                  >−</button>
                  <div className="modal-val" style={{ color: timerDone ? 'var(--lime)' : undefined }}>
                    {timerDone ? fmtTime(duration) : fmtTime(duration)}
                  </div>
                  <button
                    className="modal-ctrl-btn plus"
                    onClick={() => setDuration(d => d + durStep)}
                  >+</button>
                </div>
                <button className="timer-start-btn" onClick={handleStart}>
                  {timerDone ? 'RESTART' : 'START'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Reps / Weight (not cardio) ── */}
        {!isCardio && (
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

        {/* ── Actions ── */}
        {!running && (
          <div className="modal-actions">
            <button className="primary-button" onClick={handleSave}>SAVE SET</button>
            <button className="secondary-button" onClick={handleCancel}>CANCEL</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── WorkoutView ────────────────────────────────────────────────────────────────

const WorkoutView = ({
  muscleGroups, capitalizeFirst, getAllVisibleExercises,
  getMuscleForExercise, currentWorkout, incrementSet, decrementSet,
  setView, finishWorkout, hasActiveSets, appData,
  repsEntry, setRepsEntry, saveSetWithData,
  abandonConfirmation, setAbandonConfirmation, confirmAbandonWorkout,
  onStartWorkout, timerDisplay
}) => {

  useEffect(() => {
    if (!currentWorkout.startTime) onStartWorkout();
  }, []); // eslint-disable-line

  const allExercises = getAllVisibleExercises();
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
                <div className="exercise-muscle-tag">{m}</div>
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
