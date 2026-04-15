import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';

const SettingsView = ({
  appData, setView, updateSettings, exportToCSV,
  resetConfirmation, setResetConfirmation, executeReset
}) => {
  return (
    <div className="app-container">
      <div className="app-header">
        <button className="back-button" onClick={() => setView('home')}><ArrowLeft size={20} /></button>
        <div className="app-title">SETTINGS</div>
        <div className="spacer" />
      </div>

      <div className="app-content">
        <div className="settings-section">
          <div className="settings-section-title">TRACKING</div>
          <div className="card">
            <div className="settings-row">
              <div>
                <div className="settings-row-name">Reps Tracking</div>
                <div className="settings-row-sub">Always on</div>
              </div>
              <span className="settings-badge">ON</span>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-row-name">Weight Tracking</div>
                <div className="settings-row-sub">Always on</div>
              </div>
              <span className="settings-badge">ON</span>
            </div>
            {appData.settings.weightTracking && (
              <div className="settings-row">
                <div>
                  <div className="settings-row-name">Weight Increment</div>
                  <div className="settings-row-sub">Weight adjustment per tap (lbs)</div>
                </div>
                <div className="increment-buttons">
                  {[1, 2.5, 5].map(increment => (
                    <button
                      key={increment}
                      onClick={() => updateSettings('weightIncrement', increment)}
                      className={`increment-button ${appData.settings.weightIncrement === increment ? 'active' : ''}`}
                    >
                      {increment === 2.5 ? '2.5' : increment}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <div>
                <div className="settings-row-name">Units</div>
                <div className="settings-row-sub">Weight &amp; measurements</div>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>lbs / inches</span>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">MANAGEMENT</div>
          <button className="settings-action-btn accent" onClick={() => setView('exercise-management')}>
            MANAGE EXERCISES
          </button>
          <button className="settings-action-btn" onClick={() => setView('progress')}>
            VIEW PROGRESS
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">DATA</div>
          <button className="settings-action-btn" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Download size={16} /> EXPORT CSV
          </button>
          <button className="settings-action-btn danger" onClick={() => setResetConfirmation({ step: 1 })}>
            FACTORY RESET
          </button>
        </div>

        <div className="settings-footer">
          <div style={{ fontWeight: 500, color: 'var(--text2)' }}>My Strength Tracker</div>
          <div>{appData.workouts.length} workouts · {appData.measurements?.length || 0} check-ins</div>
          <div>Data stored locally on this device</div>
        </div>
      </div>

      {/* Reset modal */}
      {resetConfirmation && (
        <div className="modal-overlay" onClick={() => setResetConfirmation(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            {resetConfirmation.step === 1 && (
              <>
                <div className="confirm-title">Factory Reset</div>
                <div className="confirm-sub">
                  This will permanently delete ALL your data — workouts, measurements, custom exercises, and settings. This cannot be undone.
                </div>
                <button className="danger-button" onClick={() => setResetConfirmation({ step: 2 })}>CONTINUE TO FINAL WARNING</button>
                <button className="secondary-button" onClick={() => setResetConfirmation(null)}>CANCEL</button>
              </>
            )}
            {resetConfirmation.step === 2 && (
              <>
                <div className="confirm-title">Are You Sure?</div>
                <div className="confirm-sub" style={{ fontSize: 15 }}>🚨 Last chance — this will wipe everything.</div>
                <button className="danger-button" onClick={() => executeReset('factory')}>YES, RESET EVERYTHING</button>
                <button className="secondary-button" onClick={() => setResetConfirmation(null)}>CANCEL</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
