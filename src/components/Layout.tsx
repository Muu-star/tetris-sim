import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const modes = [
  { path: '/simulation', label: 'Simulation', icon: '🎮' },
  { path: '/ren', label: 'REN', icon: '⚡' },
  { path: '/tspin', label: 'T-Spin', icon: '🔄' },
  { path: '/drill', label: 'Drill', icon: '🎯' },
  { path: '/optimization', label: 'Optimization', icon: '⚡' },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>Tetris Trainer</h1>
          </div>
          <nav className="nav">
            {modes.map((mode) => (
              <Link
                key={mode.path}
                to={mode.path}
                className={`nav-item ${location.pathname === mode.path ? 'active' : ''}`}
              >
                <span className="nav-icon">{mode.icon}</span>
                <span className="nav-label">{mode.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">
        {children}
      </main>
    </div>
  );
};