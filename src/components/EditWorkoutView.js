import React, { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';

const EditWorkoutView = ({
  appData, setView, editWorkoutIdx, setEditWorkoutIdx,
  updateWorkout, getMuscleForExercise, capitalizeFirst
}) => {
  const workout = appData.workouts[editWorkoutIdx];

  const [exercises, setExercises] = useState(() => {
    const copy = {};
    Object.entries(workout.exercises || {}).forEach(([k, v]) => {
      copy[k] = Array.isArray(v) ? v.map(s => ({ ...s })) : v;
    });
    return copy;
  });

  const [editingSet, setEditingSet] = useState(null);
  // { exercise, setIdx (null = new), reps, weight }

  const weightIncrement = appData.settings?.weightIncrement || 1;

  const handleBack = () => {
    setEditWorkoutIdx(null);
    setView('home');
  };

  const handleSave = () => {
    updateWorkout(editWorkoutIdx, { ...workout, exercises });
    setEditWorkoutIdx(null);
    setView('home');
  };

  const openEditSet = (exercise, setIdx) => {
    const s = exercises[exercise][setIdx];
    setEditingSet({ exercise, setIdx, reps: s.reps || 10, weight: s.weight || 0 });
  };

  const openAddSet = (exercise) => {
    const sets = exercises[exercise];
    const last = Array.isArray(sets) && sets.length ? sets[sets.length - 1] : null;
    setEditingSet({ exercise, setIdx: null, reps: last?.reps || 10, weight: last?.weight || 0 });
  };

  const saveEditingSet = () => {
    const { exercise, setIdx, reps, weight } = editingSet;
    setExercises(prev => {
      const sets = [...(Array.isArray(prev[exercise]) ? prev[exercise] : [])];
      if (setIdx === null) {
        sets.push({ set: sets.length + 1, reps, weight });
      } else {
        sets[setIdx] = { ...sets[setIdx], reps, weight };
      }
      return { ...prev, [exercise]: sets };
    });
    setEditingSet(null);
  };

  const deleteSet = (exercise, setIdx) => {
    setExercises(prev => {
      const sets = prev[exercise].filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, set: i + 1 }));
      if (sets.length === 0) {
        const { [exercise]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [exercise]: sets };
    });
  };

  const dateLabel = new Date(workout.startTime || workout.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  });

  const exerciseEntries = Object.entries(exercises).filter(([, v]) => Array.isArray(v));

  return (
    <div className="app-container">
      <div className="app-header">
        <button className="back-button" onClick={handleBack}><ArrowLeft size={20} /></button>
        <div>
          <div className="app-title">EDIT WORKOUT</div>
          <div className="app-subtitle">{dateLabel}</div>
        </div>
        <div className="spacer" />
      </div>

      <div className="app-content">
        {exerciseEntries.length === 0 && (
          <div className="empty-state">No sets in this workout.</div>
        )}

        {exerciseEntries.map(([ex, sets]) => {
          const muscle = getMuscleForExercise(ex);
          return (
            <div key={ex} className="edit-exercise-block">
              <div className="exercise-muscle-tag">{muscle ? capitalizeFirst(muscle) : ''}</div>
              <div className="exercise-name">{ex}</div>

              {sets.map((s, si) => (
                <div key={si} className="edit-set-row">
                  <span className="edit-set-num">Set {s.set}</span>
                  <button className="edit-set-values" onClick={() => openEditSet(ex, si)}>
                    {s.reps} reps · {s.weight} lbs
                  </button>
                  <button className="edit-set-delete" onClick={() => deleteSet(ex, si)}>×</button>
                </div>
              ))}

              <button className="edit-add-set-btn" onClick={() => openAddSet(ex)}>
                <Plus size={13} style={{ marginRight: 4 }} />ADD SET
              </button>
            </div>
          );
        })}

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="primary-button" onClick={handleSave}>SAVE CHANGES</button>
          <button className="secondary-button" onClick={handleBack}>CANCEL</button>
        </div>
      </div>

      {/* Edit / Add Set Modal */}
      {editingSet && (
        <div className="modal-overlay" onClick={() => setEditingSet(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editingSet.exercise}</div>
            <div className="modal-subtitle">
              {editingSet.setIdx === null ? 'New Set' : `Set ${editingSet.setIdx + 1}`}
            </div>

            <div className="modal-label" style={{ marginBottom: 8 }}>REPS</div>
            <div className="modal-val-row">
              <button className="modal-ctrl-btn minus" onClick={() => setEditingSet(p => ({ ...p, reps: Math.max(1, p.reps - 1) }))}>−</button>
              <div className="modal-val">{editingSet.reps}</div>
              <button className="modal-ctrl-btn plus" onClick={() => setEditingSet(p => ({ ...p, reps: Math.min(100, p.reps + 1) }))}>+</button>
            </div>

            <div className="modal-divider" />

            <div className="modal-label" style={{ marginBottom: 8 }}>WEIGHT (lbs)</div>
            <div className="modal-val-row">
              <button className="modal-ctrl-btn minus" onClick={() => setEditingSet(p => ({ ...p, weight: Math.max(0, Math.round((p.weight - weightIncrement) * 10) / 10) }))}>−</button>
              <div className="modal-val">{editingSet.weight}</div>
              <button className="modal-ctrl-btn plus" onClick={() => setEditingSet(p => ({ ...p, weight: Math.round((p.weight + weightIncrement) * 10) / 10 }))}>+</button>
            </div>

            <div className="modal-actions">
              <button className="primary-button" onClick={saveEditingSet}>
                {editingSet.setIdx === null ? 'ADD SET' : 'UPDATE SET'}
              </button>
              <button className="secondary-button" onClick={() => setEditingSet(null)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditWorkoutView;
