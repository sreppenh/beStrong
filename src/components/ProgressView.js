import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Chart, registerables } from 'chart.js';
import { exerciseLibrary } from '../data/exercises';

Chart.register(...registerables);

const MEASURES = [
  { key: 'weight',  label: 'Body Weight', unit: 'lbs' },
  { key: 'bodyFat', label: 'Body Fat',    unit: '%'   },
  { key: 'waist',   label: 'Waist',       unit: 'in'  },
  { key: 'hips',    label: 'Hips',        unit: 'in'  },
  { key: 'arms',    label: 'Arms (bicep)',unit: 'in'  },
  { key: 'thighs',  label: 'Thighs',      unit: 'in'  },
  { key: 'chest',   label: 'Chest',       unit: 'in'  },
];

const MUSCLES = Object.keys(exerciseLibrary);
const CHART_COLOR = '#C8F135';
const CHART_GRID = '#2E2E2E';
const CHART_TICK = '#888888';

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: CHART_TICK, font: { size: 11 } }, grid: { color: CHART_GRID } },
    y: { ticks: { color: CHART_TICK, font: { size: 11 } }, grid: { color: CHART_GRID } }
  }
};

const LineChart = ({ labels, data, id }) => {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    if (!ref.current) return;
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: CHART_COLOR,
          backgroundColor: 'rgba(200,241,53,0.08)',
          tension: 0.3,
          pointBackgroundColor: CHART_COLOR,
          pointRadius: 4,
          borderWidth: 2,
          fill: true,
          spanGaps: true
        }]
      },
      options: chartDefaults
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, data]); // eslint-disable-line
  return <canvas ref={ref} id={id} />;
};

const BarChart = ({ labels, data, id }) => {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    if (!ref.current) return;
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data, backgroundColor: CHART_COLOR, borderRadius: 6, borderSkipped: false }]
      },
      options: { ...chartDefaults, scales: { ...chartDefaults.scales, x: { ...chartDefaults.scales.x, grid: { display: false } } } }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, data]); // eslint-disable-line
  return <canvas ref={ref} id={id} />;
};

const BodyTab = ({ appData }) => {
  const meas = appData.measurements || [];
  if (meas.length < 2) return (
    <div className="empty-state">
      <div className="empty-title">NOT ENOUGH DATA</div>
      <p>Log at least 2 check-ins to see body trends.</p>
    </div>
  );
  const first = meas[0], last = meas[meas.length - 1];
  const recent8 = meas.slice(-8);
  const labels = recent8.map(m => new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

  return (
    <div>
      {MEASURES.map(m => {
        if (first[m.key] == null || last[m.key] == null) return null;
        const delta = last[m.key] - first[m.key];
        const sign = delta >= 0 ? '+' : '';
        const good = (m.key === 'weight' || m.key === 'bodyFat') ? delta <= 0 : false;
        return (
          <div key={m.key} className="body-measure-row">
            <div>
              <div className="body-measure-name">{m.label}</div>
              <div className="body-measure-start">Started: {first[m.key]} {m.unit}</div>
            </div>
            <div>
              <div className="body-measure-current">
                {last[m.key]} <span className="body-measure-unit">{m.unit}</span>
              </div>
              <div className={`body-measure-delta ${good ? 'delta-good' : 'delta-warn'}`}>
                {sign}{delta.toFixed(1)} {m.unit}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 24 }}>
        <div className="chart-label">Weight over time</div>
        <div className="chart-container">
          <LineChart labels={labels} data={recent8.map(m => m.weight || null)} id="chart-weight" />
        </div>
        <div className="chart-label">Body fat % over time</div>
        <div className="chart-container">
          <LineChart labels={labels} data={recent8.map(m => m.bodyFat || null)} id="chart-bf" />
        </div>
      </div>
    </div>
  );
};

const StrengthTab = ({ appData, getAllVisibleExercises }) => {
  const tracked = getAllVisibleExercises()
    .filter(({ exercise: ex }) => !ex.endsWith('General') && appData.workouts.some(w => w.exercises?.[ex]));

  if (!tracked.length) return (
    <div className="empty-state">
      <div className="empty-title">NO DATA YET</div>
      <p>Complete some workouts to see strength progress.</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Max weight lifted per exercise</p>
      {tracked.slice(0, 10).map(({ exercise: ex, muscle: m }) => {
        const allSets = [];
        appData.workouts.forEach(w => {
          const d = w.exercises?.[ex];
          if (Array.isArray(d)) d.forEach(s => allSets.push({ weight: s.weight || 0, reps: s.reps || 0 }));
        });
        if (!allSets.length) return null;
        const maxW = Math.max(...allSets.map(s => s.weight));
        const delta = allSets[allSets.length - 1].weight - allSets[0].weight;
        return (
          <div key={ex} className="strength-card">
            <div>
              <div className="strength-name">{ex}</div>
              <div className="strength-meta">{m} · {allSets.length} sets logged</div>
            </div>
            <div>
              <div className="strength-max">{maxW} lbs</div>
              <div className={`strength-delta ${delta >= 0 ? 'delta-good' : 'delta-warn'}`}>
                {delta >= 0 ? '+' : ''}{delta} lbs
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const VolumeTab = ({ appData, getVisibleExercises }) => {
  if (!appData.workouts.length) return (
    <div className="empty-state">
      <div className="empty-title">NO WORKOUTS YET</div>
    </div>
  );

  const last8 = appData.workouts.slice(-8);
  const labels = last8.map(w => new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const setData = last8.map(w => Object.values(w.exercises || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : (v || 0)), 0));

  const muscleData = MUSCLES.map(m => {
    const total = appData.workouts.reduce((a, w) =>
      a + getVisibleExercises(m).reduce((b, ex) => {
        const d = w.exercises?.[ex];
        return b + (Array.isArray(d) ? d.length : (d || 0));
      }, 0), 0);
    return { muscle: m, total };
  }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

  const maxTotal = Math.max(...muscleData.map(d => d.total));

  return (
    <div>
      <div className="chart-label">Sets per workout</div>
      <div className="chart-container" style={{ height: 180 }}>
        <BarChart labels={labels} data={setData} id="chart-vol" />
      </div>
      <div className="chart-label" style={{ marginTop: 16 }}>Total sets by muscle group</div>
      {muscleData.map(d => (
        <div key={d.muscle} className="volume-bar-row">
          <div className="volume-bar-header">
            <span className="volume-bar-label">{d.muscle.charAt(0).toUpperCase() + d.muscle.slice(1)}</span>
            <span className="volume-bar-val">{d.total} sets</span>
          </div>
          <div className="volume-bar-track">
            <div className="volume-bar-fill" style={{ width: `${Math.round((d.total / maxTotal) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const ProgressView = ({ setView, appData, getAllVisibleExercises, getVisibleExercises }) => {
  const [tab, setTab] = useState('body');

  return (
    <div className="app-container">
      <div className="app-header">
        <button className="back-button" onClick={() => setView('home')}><ArrowLeft size={20} /></button>
        <div className="app-title">PROGRESS</div>
        <div className="spacer" />
      </div>

      <div className="app-content">
        <div className="tab-bar">
          {['body', 'strength', 'volume'].map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === 'body' && <BodyTab appData={appData} />}
        {tab === 'strength' && <StrengthTab appData={appData} getAllVisibleExercises={getAllVisibleExercises} />}
        {tab === 'volume' && <VolumeTab appData={appData} getVisibleExercises={getVisibleExercises} />}
      </div>
    </div>
  );
};

export default ProgressView;
