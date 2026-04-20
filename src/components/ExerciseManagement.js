import React from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { exerciseLibrary } from '../data/exercises';

const ExerciseManagement = ({
  exerciseManagement, setExerciseManagement, setView,
  muscleGroups, capitalizeFirst,
  getCustomExercises, getHiddenDefaultExercises, getArchivedExercises, getVisibleExercises,
  addCustomExercise, removeExercise, restoreArchivedExercise, moveExerciseUp, moveExerciseDown,
  restoreDefaultExercise, exerciseHasHistory
}) => {

  if (!exerciseManagement.muscleGroup) {
    return (
      <div className="app-container">
        <div className="app-header">
          <button className="back-button" onClick={() => setView('settings')}><ArrowLeft size={20} /></button>
          <div className="app-title">MANAGE</div>
          <div className="spacer" />
        </div>
        <div className="app-content">
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            Select a muscle group to add, remove, or reorder exercises.
          </p>
          <div className="muscle-sel-grid">
            {muscleGroups.map(m => {
              const custom   = getCustomExercises(m).length;
              const hidden   = getHiddenDefaultExercises(m).length;
              const archived = getArchivedExercises(m).length;
              const visible  = getVisibleExercises(m).length;
              return (
                <button
                  key={m}
                  className="muscle-sel-btn"
                  onClick={() => setExerciseManagement(p => ({ ...p, muscleGroup: m }))}
                >
                  <div className="muscle-sel-name">{capitalizeFirst(m)}</div>
                  <div className="muscle-sel-stats">
                    {visible} active{custom ? ` · ${custom} custom` : ''}{hidden ? ` · ${hidden} hidden` : ''}{archived ? ` · ${archived} archived` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const m = exerciseManagement.muscleGroup;
  const visible  = getVisibleExercises(m);
  const hidden   = getHiddenDefaultExercises(m);
  const archived = getArchivedExercises(m);

  return (
    <div className="app-container">
      <div className="app-header">
        <button className="back-button" onClick={() => setExerciseManagement(p => ({ ...p, muscleGroup: null, showAddForm: false, newExerciseName: '' }))}>
          <ArrowLeft size={20} />
        </button>
        <div className="app-title">{capitalizeFirst(m).toUpperCase()}</div>
        <div className="spacer" />
      </div>

      <div className="app-content">
        {/* Add exercise */}
        <div className="section-title">ADD EXERCISE</div>
        {!exerciseManagement.showAddForm ? (
          <button
            className="secondary-button"
            style={{ borderColor: 'var(--lime)', color: 'var(--lime)', marginBottom: 24 }}
            onClick={() => setExerciseManagement(p => ({ ...p, showAddForm: true }))}
          >
            <Plus size={16} style={{ marginRight: 6 }} /> ADD CUSTOM EXERCISE
          </button>
        ) : (
          <div className="add-ex-form" style={{ marginBottom: 24 }}>
            <input
              className="add-ex-input"
              type="text"
              placeholder="Exercise name..."
              value={exerciseManagement.newExerciseName}
              onChange={e => setExerciseManagement(p => ({ ...p, newExerciseName: e.target.value }))}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const ok = addCustomExercise(m, exerciseManagement.newExerciseName);
                  if (ok) setExerciseManagement(p => ({ ...p, showAddForm: false, newExerciseName: '' }));
                  else alert('Exercise name already exists or is invalid');
                }
              }}
            />
            <div className="add-ex-actions">
              <button className="add-ex-save" onClick={() => {
                const ok = addCustomExercise(m, exerciseManagement.newExerciseName);
                if (ok) setExerciseManagement(p => ({ ...p, showAddForm: false, newExerciseName: '' }));
                else alert('Exercise name already exists or is invalid');
              }}>SAVE</button>
              <button className="add-ex-cancel" onClick={() => setExerciseManagement(p => ({ ...p, showAddForm: false, newExerciseName: '' }))}>CANCEL</button>
            </div>
          </div>
        )}

        {/* Exercise order */}
        <div className="section-title">EXERCISE ORDER</div>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Arrows to reorder · × to remove</p>

        {visible.map((ex, i) => {
          const isDefault = exerciseLibrary[m].includes(ex);
          const hasHist = exerciseHasHistory(ex);
          return (
            <div key={ex} className="ex-mgmt-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ex-mgmt-name">{ex}</div>
                <div className="ex-mgmt-meta">
                  {isDefault ? 'Built-in' : 'Custom'}{hasHist ? ' · has history' : ''}
                </div>
              </div>
              <div className="ex-mgmt-controls">
                <button className="order-btn" onClick={() => moveExerciseUp(m, ex)} disabled={i === 0}>↑</button>
                <button className="order-btn" onClick={() => moveExerciseDown(m, ex)} disabled={i === visible.length - 1}>↓</button>
                <button className="ex-del-btn" onClick={() => setExerciseManagement(p => ({
                  ...p,
                  deleteConfirmation: { exerciseName: ex, muscleGroup: m, hasHistory: hasHist, isDefault }
                }))}>×</button>
              </div>
            </div>
          );
        })}

        {/* Hidden exercises */}
        {hidden.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>HIDDEN</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Tap + to restore to your workout list.</p>
            {hidden.map(ex => (
              <div key={ex} className="hidden-ex-row">
                <div>
                  <div className="ex-mgmt-name" style={{ color: 'var(--text2)' }}>{ex}</div>
                  <div className="ex-mgmt-meta">Hidden{exerciseHasHistory(ex) ? ' · has history' : ''}</div>
                </div>
                <button className="ex-restore-btn" onClick={() => restoreDefaultExercise(m, ex)}>+</button>
              </div>
            ))}
          </>
        )}

        {/* Archived custom exercises */}
        {archived.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>ARCHIVED CUSTOM EXERCISES</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>Tap + to restore to your custom list.</p>
            {archived.map(ex => (
              <div key={ex} className="hidden-ex-row">
                <div>
                  <div className="ex-mgmt-name" style={{ color: 'var(--text2)' }}>{ex}</div>
                  <div className="ex-mgmt-meta">Archived{exerciseHasHistory(ex) ? ' · has history' : ''}</div>
                </div>
                <button className="ex-restore-btn" onClick={() => restoreArchivedExercise(m, ex)}>+</button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Delete confirmation */}
      {exerciseManagement.deleteConfirmation && (
        <div className="modal-overlay" onClick={() => setExerciseManagement(p => ({ ...p, deleteConfirmation: null }))}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">Remove Exercise?</div>
            <div className="confirm-sub">
              "{exerciseManagement.deleteConfirmation.exerciseName}" —{' '}
              {exerciseManagement.deleteConfirmation.isDefault
                ? exerciseManagement.deleteConfirmation.hasHistory
                  ? 'History preserved. It will be hidden from future workouts and can be restored.'
                  : 'It will be hidden from future workouts and can be restored later.'
                : 'History preserved. It will be archived and can be restored from the Archived section.'}
            </div>
            <button className="danger-button" onClick={() => {
              removeExercise(
                exerciseManagement.deleteConfirmation.muscleGroup,
                exerciseManagement.deleteConfirmation.exerciseName
              );
            }}>REMOVE EXERCISE</button>
            <button className="secondary-button" onClick={() => setExerciseManagement(p => ({ ...p, deleteConfirmation: null }))}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseManagement;
