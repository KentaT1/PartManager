import React from 'react';
import './App.css';
import PartsManager from './components/PartsManager';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-section">
              <h1 className="team-name">Team 1538</h1>
              <h2 className="team-subtitle">The Holy Cows</h2>
            </div>
            <nav className="header-nav">
              <a href="https://team1538.com" target="_blank" rel="noopener noreferrer" className="nav-link">
                Main Site
              </a>
            </nav>
          </div>
        </div>
      </header>
      <main className="App-main">
        <div className="container">
          <PartsManager />
        </div>
      </main>
      <footer className="App-footer">
        <div className="container">
          <div className="footer-content">
            <p>&copy; {new Date().getFullYear()} Robotics Team 1538 / The Holy Cows</p>
            <div className="footer-links">
              <a href="https://team1538.com" target="_blank" rel="noopener noreferrer">Main Site</a>
              <span className="separator">|</span>
              <a href="https://github.com/KentaT1/PartManager" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

