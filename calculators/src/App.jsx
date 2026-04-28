import { HashRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { PrayerPage } from './pages/PrayerPage.jsx';
import { HerblorePage } from './pages/HerblorePage.jsx';
import { TrainingPage } from './pages/TrainingPage.jsx';
import { MAIN_SITE_INDEX } from './lib/sitePaths.js';

function Hub() {
  return (
    <div className="theme-training" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Source+Code+Pro:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <header className="calc-header">
        <a href={MAIN_SITE_INDEX} className="home-link">
          &larr; All tools
        </a>
        <div className="hr" />
        <h1 className="calc-hub-title">OSRS calculators</h1>
        <p>Unified training optimizers (hash routes for GitHub Pages)</p>
        <div className="hr" />
      </header>
      <nav className="calc-nav">
        <NavLink to="/prayer" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Prayer
        </NavLink>
        <NavLink to="/herblore" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Herblore
        </NavLink>
        <NavLink to="/training" className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Training
        </NavLink>
      </nav>
      <div className="container" style={{ maxWidth: 560, textAlign: 'center', marginTop: '1.5rem' }}>
        <p className="hint" style={{ fontSize: '0.9rem' }}>
          Choose a calculator above, or open the{' '}
          <a href={MAIN_SITE_INDEX} style={{ color: 'var(--accent)' }}>
            tools index
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/prayer" element={<PrayerPage />} />
        <Route path="/herblore" element={<HerblorePage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
