import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const projects = [
  { index: '01', title: 'Lumen House', type: 'Brand system', color: '#ffb17a' },
  { index: '02', title: 'Kite / 04', type: 'Product launch', color: '#91c8ff' },
  { index: '03', title: 'Quiet Signal', type: 'Digital experience', color: '#c4a5ff' },
];

function App() {
  const [uploaded, setUploaded] = useState(false);

  return (
    <main>
      <nav className="nav">
        <a className="wordmark" href="#top"><span>✦</span> PORTFOLIOVERSE</a>
        <div className="nav-links"><a href="#how">How it works</a><a href="#preview">Preview</a><button className="nav-cta">Start building <span>↗</span></button></div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="pulse" /> AI-POWERED PORTFOLIOS / 001</p>
          <h1>Your work,<br /><em>in orbit.</em></h1>
          <p className="lede">PortfolioVerse turns the raw material of your career into a living 3D world — authored by you, shaped by AI.</p>
          <button className="primary" onClick={() => setUploaded(true)}>{uploaded ? 'Draft generated ✓' : 'Build my portfolio'} <span>↗</span></button>
          <p className="microcopy">Upload a resume. Get a first draft in seconds.</p>
        </div>
        <div className="orbital-stage" aria-label="Abstract orbital portfolio preview">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
          <div className="core"><span>PV</span><small>YOUR<br />UNIVERSE</small></div>
          {projects.map((project, i) => <div className={`project-node node-${i + 1}`} style={{ '--node-color': project.color }} key={project.index}><b>{project.index}</b><span>{project.title}</span></div>)}
          <div className="stage-label">SCROLL TO EXPLORE <span>↓</span></div>
        </div>
      </section>

      <section className="ticker"><span>RESUME → STRUCTURE → STORY → SPACE</span><span>RESUME → STRUCTURE → STORY → SPACE</span></section>

      <section className="manifesto" id="how">
        <p className="section-kicker">01 / THE IDEA</p>
        <div><h2>A portfolio should feel like <em>a point of view.</em></h2><p>Not another grid of thumbnails. PortfolioVerse finds the signal in your experience, then gives it a world people want to explore.</p></div>
      </section>

      <section className="workflow" id="preview">
        <div className="workflow-heading"><p className="section-kicker">02 / THE LOOP</p><h2>From evidence<br />to <em>presence.</em></h2></div>
        <div className="steps"><div><span>01</span><h3>Drop in your resume</h3><p>Start with the work you already have. Local-first for the demo.</p></div><div><span>02</span><h3>Let AI find the shape</h3><p>Projects, skills, outcomes, and a story — structured into a draft.</p></div><div><span>03</span><h3>Make it yours</h3><p>Refine the voice, orbit the projects, and publish your universe.</p></div></div>
      </section>

      <footer><a className="wordmark" href="#top"><span>✦</span> PORTFOLIOVERSE</a><p>Upload → generate → refine → publish</p><span className="footer-mark">BUILDATHON / 2026</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
