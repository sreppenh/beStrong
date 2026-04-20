import React, { useState } from 'react';

export const WORKOUT_CATEGORIES = [
  { label: 'Arms',   emoji: '💪', color: '#E8A87C', textColor: '#7A3F10' },
  { label: 'Legs',   emoji: '🦵', color: '#7EB8F7', textColor: '#1A4B7A' },
  { label: 'Core',   emoji: '🔥', color: '#A78BFA', textColor: '#3B1FA8' },
  { label: 'Abs',    emoji: '✦',  color: '#F472B6', textColor: '#831843' },
  { label: 'Cardio', emoji: '🏃', color: '#34D399', textColor: '#065F46' },
];

const WorkoutTypeSelectorModal = ({ initialSelected = [], onConfirm }) => {
  const [selected, setSelected] = useState(initialSelected);

  const toggle = (label) => {
    setSelected(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const allSelected = selected.length === WORKOUT_CATEGORIES.length;

  return (
    <div className="modal-overlay">
      <div className="modal-sheet wts-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-title">WHAT ARE YOU<br />TRAINING TODAY?</div>

        <button
          className="select-all-link"
          onClick={() => setSelected(allSelected ? [] : WORKOUT_CATEGORIES.map(c => c.label))}
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>

        <div className="category-tile-grid">
          {WORKOUT_CATEGORIES.map(({ label, emoji, color }) => {
            const isSelected = selected.includes(label);
            return (
              <div
                key={label}
                className={`category-tile${label === 'Cardio' ? ' cardio-tile' : ''}${isSelected ? ' selected' : ''}`}
                style={isSelected ? { borderColor: color, background: `${color}28` } : {}}
                onClick={() => toggle(label)}
              >
                <div className="category-tile-emoji">{emoji}</div>
                <div
                  className="category-tile-label"
                  style={isSelected ? { color } : {}}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="primary-button"
          style={{ marginTop: 20, opacity: selected.length === 0 ? 0.4 : 1 }}
          disabled={selected.length === 0}
          onClick={() => onConfirm(selected)}
        >
          START
        </button>
      </div>
    </div>
  );
};

export default WorkoutTypeSelectorModal;
