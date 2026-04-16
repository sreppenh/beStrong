import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const ALL_MEASURES = [
  { key: 'weight',  label: 'Body Weight', unit: 'lbs' },
  { key: 'bodyFat', label: 'Body Fat',    unit: '%'   },
  { key: 'waist',   label: 'Waist',       unit: 'in'  },
  { key: 'hips',    label: 'Hips',        unit: 'in'  },
  { key: 'arms',    label: 'Arms (bicep)',unit: 'in'  },
  { key: 'thighs',  label: 'Thighs',      unit: 'in'  },
  { key: 'chest',   label: 'Chest',       unit: 'in'  },
];

const SCALE_KEYS = ['weight', 'bodyFat'];
const BODY_KEYS  = ['waist', 'hips', 'arms', 'thighs', 'chest'];

const MeasurementsView = ({ setView, appData, saveMeasurement, updateMeasurement, editMeasurementIdx, setEditMeasurementIdx, mode = 'all' }) => {
  const isEditing = editMeasurementIdx !== null && editMeasurementIdx !== undefined;
  const source = isEditing
    ? (appData.measurements?.[editMeasurementIdx] || {})
    : (appData.measurements?.[appData.measurements.length - 1] || {});

  const activeKeys = isEditing || mode === 'all' ? null
    : mode === 'scale' ? SCALE_KEYS
    : BODY_KEYS;
  const MEASURES = activeKeys ? ALL_MEASURES.filter(m => activeKeys.includes(m.key)) : ALL_MEASURES;

  const [values, setValues] = useState(() => {
    const init = {};
    ALL_MEASURES.forEach(m => { init[m.key] = source[m.key] !== undefined ? String(source[m.key]) : ''; });
    return init;
  });

  const handleBack = () => {
    setEditMeasurementIdx(null);
    setView('home');
  };

  const handleSave = () => {
    let hasAny = false;
    MEASURES.forEach(m => { if (!isNaN(parseFloat(values[m.key]))) hasAny = true; });
    if (!hasAny) { alert('Please enter at least one measurement'); return; }

    if (isEditing) {
      const entry = { ...appData.measurements[editMeasurementIdx] };
      MEASURES.forEach(m => {
        const v = parseFloat(values[m.key]);
        if (!isNaN(v)) entry[m.key] = v; else delete entry[m.key];
      });
      updateMeasurement(editMeasurementIdx, entry);
      setEditMeasurementIdx(null);
    } else {
      const entry = { date: new Date().toISOString() };
      MEASURES.forEach(m => {
        const v = parseFloat(values[m.key]);
        if (!isNaN(v)) entry[m.key] = v;
      });
      saveMeasurement(entry);
    }
    setView('home');
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <button className="back-button" onClick={handleBack}><ArrowLeft size={20} /></button>
        <div className="app-title">{mode === 'scale' ? 'WEIGHT & BODY FAT' : mode === 'body' ? 'MEASUREMENTS' : 'CHECK-IN'}</div>
        <div className="spacer" />
      </div>

      <div className="app-content">
        {isEditing ? (
          <p style={{ fontSize: 13, color: 'var(--lime)', marginBottom: 16, fontWeight: 500 }}>
            Editing check-in from {new Date(source.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
            {mode === 'scale' ? 'Log your weight and body fat.' : 'Log your body measurements. Skip any you don\'t want to track.'}
          </p>
        )}

        {MEASURES.map(m => (
          <div key={m.key} className="measure-field">
            <div>
              <div className="measure-field-label">{m.label}</div>
              <div className="measure-field-unit">{m.unit}</div>
            </div>
            <input
              className="measure-input"
              type="number"
              step="0.1"
              placeholder="—"
              value={values[m.key]}
              onChange={e => setValues(p => ({ ...p, [m.key]: e.target.value }))}
            />
          </div>
        ))}

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="primary-button" onClick={handleSave}>{isEditing ? 'UPDATE CHECK-IN' : 'SAVE CHECK-IN'}</button>
          <button className="secondary-button" onClick={handleBack}>CANCEL</button>
        </div>
      </div>
    </div>
  );
};

export default MeasurementsView;
