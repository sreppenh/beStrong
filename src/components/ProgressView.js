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

const fmtDuration = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const StrengthTab = ({ appData, getAllVisibleExercises }) => {
  // Only show exercises that have at least one set with real weight data
  const hasWeight = (ex) => appData.workouts.some(w => {
    const d = w.exercises?.[ex];
    return Array.isArray(d) && d.some(s => s.weight != null && s.weight > 0);
  });

  const tracked = getAllVisibleExercises()
    .filter(({ exercise: ex }) => !ex.endsWith('General') && hasWeight(ex));

  // Timed exercises: any exercise with duration data across all sets
  const timedExercises = getAllVisibleExercises()
    .map(({ exercise: ex, muscle: m }) => {
      let totalSecs = 0;
      appData.workouts.forEach(w => {
        const d = w.exercises?.[ex];
        if (Array.isArray(d)) d.forEach(s => { if (s.duration) totalSecs += s.duration; });
      });
      return { exercise: ex, muscle: m, totalSecs };
    })
    .filter(({ totalSecs }) => totalSecs > 0)
    .sort((a, b) => b.totalSecs - a.totalSecs);

  if (!tracked.length && !timedExercises.length) return (
    <div className="empty-state">
      <div className="empty-title">NO DATA YET</div>
      <p>Complete some workouts to see strength progress.</p>
    </div>
  );

  return (
    <div>
      {tracked.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Max weight lifted per exercise</p>
          {tracked.slice(0, 10).map(({ exercise: ex, muscle: m }) => {
            const allSets = [];
            appData.workouts.forEach(w => {
              const d = w.exercises?.[ex];
              if (Array.isArray(d)) d.forEach(s => { if (s.weight > 0) allSets.push({ weight: s.weight, reps: s.reps || 0 }); });
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
        </>
      )}

      {timedExercises.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text2)', marginTop: tracked.length ? 24 : 0, marginBottom: 12 }}>
            CARDIO &amp; TIMED SETS
          </p>
          {timedExercises.map(({ exercise: ex, muscle: m, totalSecs }) => (
            <div key={ex} className="strength-card">
              <div>
                <div className="strength-name">{ex}</div>
                <div className="strength-meta">{m} · total time logged</div>
              </div>
              <div className="strength-max">{fmtDuration(totalSecs)}</div>
            </div>
          ))}
        </>
      )}
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

// ── Insight helpers ──────────────────────────────────────────────────────────

const weekStart = (d) => {
  const day = new Date(d);
  day.setDate(day.getDate() - day.getDay());
  day.setHours(0, 0, 0, 0);
  return day;
};

const InsightCard = ({ headline, value, desc, flagged = false, compact = false }) => (
  <div className={`insight-card${compact ? ' compact' : ''}`}>
    <div className="insight-card-inner">
      <div className="insight-headline">{headline}</div>
      {value != null && <div className={`insight-value${flagged ? ' flagged' : ''}`}>{value}</div>}
    </div>
    {desc && <div className="insight-desc">{desc}</div>}
  </div>
);

const InsightSection = ({ title, placeholder, children }) => (
  <div className="insight-section">
    <div className="insight-section-title">{title}</div>
    {placeholder
      ? <div className="insight-placeholder">{placeholder}</div>
      : children}
  </div>
);

const InsightsTab = ({ appData, getVisibleExercises, getMuscleForExercise }) => {
  const workouts  = appData.workouts      || [];
  const meas      = appData.measurements  || [];
  const cap       = s => s.charAt(0).toUpperCase() + s.slice(1);

  const hasWorkouts = workouts.length >= 3;
  const hasMeas     = meas.length >= 3;

  // ── Shared helper: total sets per muscle from a workout list ────────────
  const muscleCounts = (wks) => {
    const c = {};
    MUSCLES.forEach(m => { c[m] = 0; });
    wks.forEach(w => {
      Object.entries(w.exercises || {}).forEach(([ex, sets]) => {
        const m = getMuscleForExercise(ex);
        if (m) c[m] += Array.isArray(sets) ? sets.length : (typeof sets === 'number' ? sets : 0);
      });
    });
    return c;
  };

  // ── Per-exercise session history ─────────────────────────────────────────
  const exSessions = {};
  workouts.forEach(w => {
    const wDate = new Date(w.startTime || w.date);
    Object.entries(w.exercises || {}).forEach(([ex, sets]) => {
      if (!Array.isArray(sets) || !sets.length) return;
      const maxW = Math.max(...sets.map(s => s.weight || 0));
      if (!exSessions[ex]) exSessions[ex] = [];
      exSessions[ex].push({ date: wDate, maxWeight: maxW });
    });
  });
  Object.values(exSessions).forEach(s => s.sort((a, b) => a.date - b.date));

  // ── WORKOUT PATTERNS ─────────────────────────────────────────────────────

  const streak = (() => {
    if (!workouts.length) return 0;
    let week = weekStart(new Date()); let count = 0;
    while (true) {
      const next = new Date(week); next.setDate(next.getDate() + 7);
      if (workouts.some(w => { const d = new Date(w.startTime || w.date); return d >= week && d < next; })) {
        count++; week.setDate(week.getDate() - 7);
      } else break;
    }
    return count;
  })();

  const allCounts   = muscleCounts(workouts);
  const mostTrained = Object.entries(allCounts).sort((a, b) => b[1] - a[1]).find(([, v]) => v > 0);

  const fourWksAgo     = new Date(); fourWksAgo.setDate(fourWksAgo.getDate() - 28);
  const recentWks      = workouts.filter(w => new Date(w.startTime || w.date) >= fourWksAgo);
  const recentCounts   = muscleCounts(recentWks);
  const untrainedMuscles = MUSCLES.filter(m => (recentCounts[m] || 0) === 0);
  const leastTrained   = untrainedMuscles[0] ||
    Object.entries(recentCounts).filter(([,v]) => v > 0).sort((a, b) => a[1] - b[1])[0]?.[0];

  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayCounts = Array(7).fill(0);
  workouts.forEach(w => dayCounts[new Date(w.startTime || w.date).getDay()]++);
  const maxDayCount = Math.max(...dayCounts);
  const topDays = dayCounts.map((c, i) => ({ day: DAY_NAMES[i], count: c }))
    .filter(d => d.count === maxDayCount && d.count > 0).map(d => d.day);

  const avgPerWeek = recentWks.length / 4;

  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cardioSecsThisWeek = workouts
    .filter(w => new Date(w.startTime || w.date) >= sevenDaysAgo)
    .reduce((total, w) =>
      total + Object.entries(w.exercises || {}).reduce((sum, [ex, sets]) => {
        if (getMuscleForExercise(ex) !== 'cardio' || !Array.isArray(sets)) return sum;
        return sum + sets.reduce((s, set) => s + (set.duration || 0), 0);
      }, 0), 0);
  const cardioMinsThisWeek = Math.round(cardioSecsThisWeek / 60);

  const longestGap = (() => {
    if (workouts.length < 2) return null;
    const sorted = [...workouts].sort((a, b) => new Date(a.startTime || a.date) - new Date(b.startTime || b.date));
    let max = 0, gapDate = null;
    for (let i = 1; i < sorted.length; i++) {
      const a = new Date(sorted[i-1].startTime || sorted[i-1].date);
      const b = new Date(sorted[i].startTime  || sorted[i].date);
      const gap = (b - a) / 86400000;
      if (gap > max) { max = gap; gapDate = a; }
    }
    if (max < 2) return null;
    return { days: Math.round(max), month: gapDate.toLocaleDateString('en-US', { month: 'long' }) };
  })();

  // ── STRENGTH PROGRESS ────────────────────────────────────────────────────

  const mostImproved = (() => {
    let best = null, bestDiff = 0;
    Object.entries(exSessions).forEach(([ex, sessions]) => {
      if (sessions.length < 2) return;
      const maxW = Math.max(...sessions.map(s => s.maxWeight));
      if (maxW === 0) return; // skip duration-only exercises
      const diff = maxW - sessions[0].maxWeight;
      if (diff > bestDiff) { bestDiff = diff; best = { exercise: ex, diff }; }
    });
    return best;
  })();

  const exWorkoutCount = {};
  workouts.forEach(w => {
    const seen = new Set();
    Object.entries(w.exercises || {}).forEach(([ex, sets]) => {
      if (Array.isArray(sets) && sets.length && !seen.has(ex)) {
        exWorkoutCount[ex] = (exWorkoutCount[ex] || 0) + 1; seen.add(ex);
      }
    });
  });
  const prs = Object.entries(exSessions)
    .filter(([ex]) => (exWorkoutCount[ex] || 0) >= 3)
    .filter(([, sessions]) => Math.max(...sessions.map(s => s.maxWeight)) > 0) // exclude duration-only
    .map(([ex, sessions]) => ({ exercise: ex, pr: Math.max(...sessions.map(s => s.maxWeight)) }))
    .sort((a, b) => b.pr - a.pr);

  const declining = Object.entries(exSessions)
    .filter(([, s]) => s.length >= 3)
    .filter(([, s]) => { const l = s.slice(-3); return l[0].maxWeight > l[1].maxWeight && l[1].maxWeight >= l[2].maxWeight; })
    .map(([ex, s]) => ({ exercise: ex, from: s[s.length-3].maxWeight, to: s[s.length-1].maxWeight }));

  const hasStrengthData = mostImproved || prs.length > 0;

  // ── BODY COMPOSITION ─────────────────────────────────────────────────────

  const firstM = meas[0], lastM = meas[meas.length - 1];

  const weightRate = (() => {
    if (!firstM?.weight || !lastM?.weight) return null;
    const weeks = (new Date(lastM.date) - new Date(firstM.date)) / (7 * 86400000);
    return weeks >= 1 ? (lastM.weight - firstM.weight) / weeks : null;
  })();

  const bodyChanges = ['waist','hips','arms','thighs','chest']
    .map(k => {
      const lbl = MEASURES.find(m => m.key === k)?.label || k;
      if (firstM?.[k] == null || lastM?.[k] == null) return null;
      return { key: k, label: lbl, change: lastM[k] - firstM[k] };
    }).filter(Boolean);

  const measStreak = (() => {
    if (!meas.length) return 0;
    let week = weekStart(new Date()); let count = 0;
    while (true) {
      const next = new Date(week); next.setDate(next.getDate() + 7);
      if (meas.some(m => { const d = new Date(m.date); return d >= week && d < next; })) {
        count++; week.setDate(week.getDate() - 7);
      } else break;
    }
    return count;
  })();

  // ── GENERAL ──────────────────────────────────────────────────────────────

  const totalWorkouts = workouts.length;
  const totalSets     = workouts.reduce((a, w) =>
    a + Object.values(w.exercises || {}).reduce((b, v) => b + (Array.isArray(v) ? v.length : (v || 0)), 0), 0);

  const firstEver = (() => {
    const dates = [
      workouts.length   ? new Date(workouts[0].startTime || workouts[0].date)  : null,
      meas.length       ? new Date(meas[0].date)                                : null,
    ].filter(Boolean);
    return dates.length ? dates.reduce((a, b) => a < b ? a : b) : null;
  })();
  const totalWeeks = firstEver ? Math.floor((new Date() - firstEver) / (7 * 86400000)) : 0;

  const hasAnyData = totalWorkouts > 0 || meas.length > 0;

  // ── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingBottom: 16 }}>

      <InsightSection
        title="WORKOUT PATTERNS"
        placeholder={!hasWorkouts ? 'Log at least 3 workouts to unlock workout patterns.' : null}
      >
        {streak > 0 && (
          <InsightCard
            headline="Current Streak"
            value={`${streak} ${streak === 1 ? 'week' : 'weeks'}`}
            desc={`You've logged at least one workout every week for ${streak} ${streak === 1 ? 'week' : 'weeks'} in a row.`}
          />
        )}
        {mostTrained && (
          <InsightCard
            headline="Most Trained Muscle"
            value={cap(mostTrained[0])}
            desc={`${cap(mostTrained[0])} has the highest total volume across all your workouts — ${mostTrained[1]} sets.`}
          />
        )}
        {leastTrained && recentWks.length > 0 && (
          <InsightCard
            headline="Least Trained (Last 4 Weeks)"
            value={cap(leastTrained)}
            flagged={untrainedMuscles.length > 0}
            desc={untrainedMuscles.length > 0
              ? `${cap(leastTrained)} has had zero sets in the last 4 weeks — might be worth adding some.`
              : `${cap(leastTrained)} has the fewest sets in the last 4 weeks (${recentCounts[leastTrained]} sets).`}
          />
        )}
        {topDays.length > 0 && workouts.length >= 5 && (
          <InsightCard
            headline="Favourite Training Days"
            value={topDays.slice(0, 2).join(' & ')}
            desc={`You most often train on ${topDays.slice(0, 2).join(' and ')}.`}
          />
        )}
        {recentWks.length > 0 && (
          <InsightCard
            headline="Weekly Frequency"
            value={`${avgPerWeek.toFixed(1)}× / week`}
            desc={`You've averaged ${avgPerWeek.toFixed(1)} workouts per week over the last 4 weeks.`}
          />
        )}
        {longestGap && (
          <InsightCard
            headline="Longest Rest Period"
            value={`${longestGap.days} days`}
            desc={`Your longest gap between workouts was ${longestGap.days} days, starting in ${longestGap.month}.`}
          />
        )}
        {cardioMinsThisWeek > 0 && (
          <InsightCard
            headline="Cardio This Week"
            value={`${cardioMinsThisWeek} min`}
            desc={`You've logged ${cardioMinsThisWeek} minutes of cardio in the last 7 days.`}
          />
        )}
      </InsightSection>

      <InsightSection
        title="STRENGTH PROGRESS"
        placeholder={!hasWorkouts ? 'Log at least 3 workouts to unlock strength insights.'
          : !hasStrengthData ? 'Keep logging sets with weight data to unlock strength insights.'
          : null}
      >
        {mostImproved && (
          <InsightCard
            headline="Most Improved Exercise"
            value={`+${mostImproved.diff} lbs`}
            desc={`${mostImproved.exercise}: up ${mostImproved.diff} lbs since you first logged it.`}
          />
        )}
        {prs.length > 0 && (
          <>
            <div className="insight-subheader">Personal records (3+ sessions logged)</div>
            {prs.slice(0, 6).map(({ exercise, pr }) => (
              <InsightCard key={exercise} headline={exercise} value={`${pr} lbs`} compact />
            ))}
          </>
        )}
        {declining.length > 0 && (
          <>
            <div className="insight-subheader">Worth checking in on</div>
            {declining.map(({ exercise, from, to }) => (
              <InsightCard
                key={exercise}
                headline={exercise}
                value={`${from} → ${to} lbs`}
                flagged
                desc="Weight has been decreasing over the last 3 sessions — worth reviewing."
              />
            ))}
          </>
        )}
      </InsightSection>

      <InsightSection
        title="BODY COMPOSITION"
        placeholder={!hasMeas ? 'Log at least 3 check-ins to unlock body composition insights.' : null}
      >
        {firstM?.weight != null && lastM?.weight != null && (
          <InsightCard
            headline="Weight Change"
            value={`${lastM.weight - firstM.weight >= 0 ? '+' : ''}${(lastM.weight - firstM.weight).toFixed(1)} lbs`}
            flagged={lastM.weight > firstM.weight}
            desc={`From ${firstM.weight} lbs at your first check-in to ${lastM.weight} lbs today.`}
          />
        )}
        {firstM?.bodyFat != null && lastM?.bodyFat != null && (
          <InsightCard
            headline="Body Fat Change"
            value={`${lastM.bodyFat - firstM.bodyFat >= 0 ? '+' : ''}${(lastM.bodyFat - firstM.bodyFat).toFixed(1)}%`}
            flagged={lastM.bodyFat > firstM.bodyFat}
            desc={`Body fat has changed by ${(lastM.bodyFat - firstM.bodyFat).toFixed(1)}% since your first check-in.`}
          />
        )}
        {weightRate != null && (
          <InsightCard
            headline="Rate of Change"
            value={`${weightRate >= 0 ? '+' : ''}${weightRate.toFixed(2)} lbs/week`}
            desc={`Your weight has been changing at an average of ${Math.abs(weightRate).toFixed(2)} lbs per week.`}
          />
        )}
        {bodyChanges.length > 0 && (
          <>
            <div className="insight-subheader">Measurements since first check-in</div>
            {bodyChanges.map(({ key, label, change }) => (
              <InsightCard
                key={key}
                headline={label}
                value={`${change >= 0 ? '+' : ''}${change.toFixed(1)} in`}
                compact
              />
            ))}
          </>
        )}
        {measStreak > 0 && (
          <InsightCard
            headline="Check-in Streak"
            value={`${measStreak} ${measStreak === 1 ? 'week' : 'weeks'}`}
            desc={`You've logged at least one check-in every week for ${measStreak} ${measStreak === 1 ? 'week' : 'weeks'} in a row.`}
          />
        )}
      </InsightSection>

      <InsightSection
        title="GENERAL"
        placeholder={!hasAnyData ? 'Start logging workouts and check-ins to see your stats.' : null}
      >
        {totalWorkouts > 0 && (
          <InsightCard headline="Total Workouts" value={totalWorkouts} compact />
        )}
        {totalSets > 0 && (
          <InsightCard headline="Total Sets" value={totalSets.toLocaleString()} compact />
        )}
        {totalWeeks > 0 && (
          <InsightCard headline="Weeks Tracked" value={totalWeeks} compact />
        )}
      </InsightSection>

    </div>
  );
};

const ProgressView = ({ setView, appData, getAllVisibleExercises, getVisibleExercises, getMuscleForExercise }) => {
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
          {['body', 'strength', 'volume', 'insights'].map(t => (
            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === 'body'     && <BodyTab appData={appData} />}
        {tab === 'strength' && <StrengthTab appData={appData} getAllVisibleExercises={getAllVisibleExercises} />}
        {tab === 'volume'   && <VolumeTab appData={appData} getVisibleExercises={getVisibleExercises} />}
        {tab === 'insights' && <InsightsTab appData={appData} getVisibleExercises={getVisibleExercises} getMuscleForExercise={getMuscleForExercise} />}
      </div>
    </div>
  );
};

export default ProgressView;
