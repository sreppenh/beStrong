import React, { useEffect } from 'react';
import { Plus } from 'lucide-react';

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

  const getLastRepsDisplay = (ex) => {
    const d = wk[ex];
    if (Array.isArray(d) && d.length) return `${d[d.length-1].weight}lbs × ${d[d.length-1].reps}`;
    return null;
  };

  // Muscle strip summary
  const muscleStrip = muscleGroups.map(m => {
    const exes = allExercises.filter(({ muscle }) => muscle === m);
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
          const sets = getSets(ex);
          const lastDisplay = getLastRepsDisplay(ex);
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
            const hasProgress = hasActiveSets();
            if (hasProgress) setAbandonConfirmation(true);
            else { confirmAbandonWorkout(); }
          }}>ABANDON WORKOUT</button>
        </div>
      </div>

      {/* Reps/Weight Modal */}
      {repsEntry && (
        <div className="modal-overlay" onClick={() => setRepsEntry(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{repsEntry.exercise}</div>
            <div className="modal-subtitle">{capitalizeFirst(getMuscleForExercise(repsEntry.exercise) || '')}</div>

            <div className="modal-label" style={{ marginBottom: 8 }}>REPS</div>
            <div className="modal-val-row">
              <button className="modal-ctrl-btn minus" onClick={() => setRepsEntry(p => ({ ...p, currentReps: Math.max(1, p.currentReps - 1) }))}>−</button>
              <div className="modal-val">{repsEntry.currentReps}</div>
              <button className="modal-ctrl-btn plus" onClick={() => setRepsEntry(p => ({ ...p, currentReps: Math.min(100, p.currentReps + 1) }))}>+</button>
            </div>

            <div className="modal-divider" />

            <div className="modal-label" style={{ marginBottom: 8 }}>WEIGHT (lbs)</div>
            <div className="modal-val-row">
              <button className="modal-ctrl-btn minus" onClick={() => setRepsEntry(p => ({ ...p, currentWeight: Math.max(0, Math.round((p.currentWeight - appData.settings.weightIncrement) * 10) / 10) }))}>−</button>
              <div className="modal-val">{repsEntry.currentWeight}</div>
              <button className="modal-ctrl-btn plus" onClick={() => setRepsEntry(p => ({ ...p, currentWeight: Math.round((p.currentWeight + appData.settings.weightIncrement) * 10) / 10 }))}>+</button>
            </div>

            <div className="modal-actions">
              <button className="primary-button" onClick={() => saveSetWithData(repsEntry.currentReps, repsEntry.currentWeight)}>SAVE SET</button>
              <button className="secondary-button" onClick={() => setRepsEntry(null)}>CANCEL</button>
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
