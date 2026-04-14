# My Strength Tracker

A personal strength training app with body measurements tracking and progress charts.

---

## What's included

- Flat exercise list (no muscle group drill-down — one tap to log a set)
- Reps + weight tracking on by default
- Weekly body measurements check-in (weight, body fat %, waist, hips, arms, thighs, chest)
- Progress charts: body trends, strength gains, volume over time
- Full exercise management: add custom exercises, hide/reorder built-ins
- 7-day streak tracker and weekly set totals
- CSV export (includes both workouts and measurements)
- Data stored locally in the browser

---

## Setup

### 1. Prerequisites

Make sure you have **Node.js v16 or higher** installed.
Check with: `node --version`

Download from: https://nodejs.org

---

### 2. Get the code into GitHub

**Option A — GitHub Desktop (easiest)**
1. Download GitHub Desktop: https://desktop.github.com
2. Click **File → New Repository**
3. Name it `my-strength-tracker`, choose a local path, click **Create Repository**
4. Open the repo folder on your computer
5. Copy all files from this project into that folder (everything — `src/`, `public/`, `package.json`, `.gitignore`, `README.md`)
6. Back in GitHub Desktop, you'll see all the files listed. Add a message like "Initial commit" and click **Commit to main**
7. Click **Publish repository** → make it Private → click **Publish**

**Option B — Command line**
```bash
cd my-strength-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-strength-tracker.git
git push -u origin main
```

---

### 3. Deploy to Vercel

1. Go to https://vercel.com and sign up (use your GitHub account)
2. Click **Add New → Project**
3. Find and select your `my-strength-tracker` repository
4. Vercel will auto-detect it as a Create React App project
5. Leave all settings as default — just click **Deploy**
6. In ~60 seconds you'll have a live URL like `my-strength-tracker.vercel.app`

That's it. Every time you push a change to GitHub, Vercel will automatically redeploy.

---

### 4. Run locally (optional)

```bash
npm install
npm start
```

Opens at http://localhost:3000

---

## Folder structure

```
my-strength-tracker/
├── public/
│   ├── index.html
│   ├── icon.svg          ← app icon
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── HomeView.js
│   │   ├── WorkoutView.js
│   │   ├── MeasurementsView.js
│   │   ├── ProgressView.js
│   │   ├── SettingsView.js
│   │   └── ExerciseManagement.js
│   ├── data/
│   │   └── exercises.js
│   ├── hooks/
│   │   └── useAppData.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── .gitignore
├── package.json
└── README.md
```

---

## Notes

- All data is stored in your browser's `localStorage` — it stays on your device
- Your data is completely separate from your husband's app (different localStorage key)
- Use **Settings → Export CSV** to back up your data anytime
- The app works as a PWA — you can "Add to Home Screen" on iPhone/Android for a native app feel
