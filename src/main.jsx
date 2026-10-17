import React, { Component, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { samplePortfolio, parseResume, exportPortfolio, refinePortfolio } from './portfolio.js';
import { extractDocument } from './documents.js';
import OrbitWorld from './OrbitWorld.jsx';
import './styles.css';

const STORAGE_KEY = 'portfolioverse:draft:v1';
const themes = [
  { id: 'ember', name: 'Ember', color: '#ffad79', note: 'Warm & expressive' },
  { id: 'ocean', name: 'Ocean', color: '#9bdfea', note: 'Cool & considered' },
  { id: 'forest', name: 'Forest', color: '#a8d5a2', note: 'Grounded & natural' },
];
const templates = [
  { id: 'orbit', name: 'Orbit', note: 'Immersive 3D constellation', color: '#ffad79' },
  { id: 'editorial', name: 'Editorial', note: 'Quiet, typographic case study', color: '#d6c5ff' },
  { id: 'studio', name: 'Studio', note: 'Bold, compact project index', color: '#9bdfea' },
];
const emptyPortfolio = { name: '', role: '', bio: '', email: '', skills: [], projects: [] };

function normalize(value) {
  if (!value || typeof value !== 'object') throw new Error('This draft could not be read. Import your resume to start again.');
  return {
    ...emptyPortfolio,
    ...Object.fromEntries(['name', 'role', 'bio', 'email'].map(key => [key, typeof value[key] === 'string' ? value[key] : ''])),
    skills: Array.isArray(value.skills) ? value.skills.filter(item => typeof item === 'string') : [],
    projects: Array.isArray(value.projects) ? value.projects.map((project, i) => ({
      id: String(project.id || `project-${i}`), title: String(project.title || ''),
      description: String(project.description || ''), url: String(project.url || ''),
    })) : [],
  };
}

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw);
     return { portfolio: normalize(saved.portfolio), theme: themes.some(item => item.id === saved.theme) ? saved.theme : 'ember', template: templates.some(item => item.id === saved.template) ? saved.template : 'editorial', savedAt: saved.savedAt };
  } catch {
    return { restoreError: 'Your saved draft could not be restored. You can import a resume or start with the sample.' };
  }
}

function Icon({ name = 'arrow', size = 18, ...props }) {
  const paths = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    diagonal: <><path d="M6 18 18 6M6 6h12v12" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
    download: <><path d="M12 3v13m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    save: <><path d="M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-7h10v7" /></>,
    up: <path d="m6 15 6-6 6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    file: <><path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6" /></>,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}

function Brand() {
  return <a className="wordmark" href="#top" aria-label="PortfolioVerse home"><svg width="29" height="29" viewBox="0 0 32 32" fill="none" aria-hidden="true"><ellipse cx="16" cy="16" rx="15" ry="6.5" transform="rotate(-37 16 16)" stroke="currentColor" strokeWidth="1.5" /><circle cx="16" cy="16" r="6" fill="currentColor" /><circle cx="27" cy="9" r="2.5" fill="currentColor" /></svg><span>Portfolio<span className="brand-light">Verse</span><span className="brand-dot">.</span></span></a>;
}

class WorldBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="world-fallback"><svg viewBox="0 0 200 130" width="200" aria-hidden="true"><ellipse cx="100" cy="65" rx="90" ry="30" stroke="currentColor" fill="none" transform="rotate(-25 100 65)" /><circle cx="100" cy="65" r="30" fill="currentColor" /></svg><p>The 3D view is unavailable on this device.</p><span>Your portfolio is ready to explore in the project list below.</span></div>;
    return this.props.children;
  }
}

function World({ portfolio, theme, selectedId, onSelect }) {
  return <WorldBoundary><OrbitWorld portfolio={portfolio} theme={theme} selectedId={selectedId} onSelect={onSelect} /></WorldBoundary>;
}

function safeURL(value) {
  if (!/^https?:\/\//i.test(value) || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}

function download(contents, filename, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Field({ label, id, multiline, hint, ...props }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{multiline ? <textarea id={id} {...props} /> : <input id={id} {...props} />}{hint && <span className="field-hint">{hint}</span>}</div>;
}

function PortfolioImprove({ portfolio, template, onTemplate, onImprove }) {
  const improvements = [
    ['clear', 'Clarify the story', 'Make the introduction more direct.'],
    ['warm', 'Make it warmer', 'Add a more personal opening without changing facts.'],
    ['tighten', 'Tighten projects', 'Clean up project descriptions and remove empty space.'],
  ];
  return <section className="improve-section" aria-labelledby="improve-heading"><div className="improve-copy"><span className="section-kicker">Shape the output</span><h3 id="improve-heading">Make the portfolio feel finished.</h3><p>Choose a visual language, then apply a focused improvement. Every change stays editable and local.</p></div><div className="template-choices" role="radiogroup" aria-label="Portfolio template">{templates.map(item => <button type="button" role="radio" aria-checked={template === item.id} className={`template-choice ${template === item.id ? 'is-selected' : ''}`} key={item.id} onClick={() => onTemplate(item.id)}><span className={`template-glyph glyph-${item.id}`} aria-hidden="true"><i /><i /><i /></span><strong>{item.name}</strong><small>{item.note}</small></button>)}</div><div className="improvement-actions"><span>Improve with local rules</span>{improvements.map(([id, label, note]) => <button type="button" className="improve-action" key={id} onClick={() => onImprove(id)}><strong>{label}</strong><small>{note}</small><span>↗</span></button>)}</div></section>;
}

function App() {
  const [initial] = useState(readSaved);
  const [portfolio, setPortfolio] = useState(initial.portfolio || null);
  const [theme, setTheme] = useState(initial.theme || 'ember');
  const [template, setTemplate] = useState(initial.template || 'editorial');
  const [savedSnapshot, setSavedSnapshot] = useState(initial.portfolio ? JSON.stringify({ portfolio: initial.portfolio, theme: initial.theme, template: initial.template || 'editorial' }) : '');
  const [savedAt, setSavedAt] = useState(initial.savedAt || null);
  const [sourceText, setSourceText] = useState('');
  const [sourceMode, setSourceMode] = useState('file');
  const [activeTab, setActiveTab] = useState('story');
  const [tone, setTone] = useState('professional');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(initial.restoreError || '');
  const [message, setMessage] = useState(initial.portfolio ? 'Saved draft restored. Resume text is not stored.' : '');
  const [selectedId, setSelectedId] = useState(initial.portfolio?.projects[0]?.id || null);
  const [preview, setPreview] = useState(false);
  const [filename, setFilename] = useState('');
  const fileInput = useRef(null);
  const builderRef = useRef(null);
  const previewHeading = useRef(null);
  const editorHeading = useRef(null);
  const importRef = useRef(0);
  const demo = normalize(typeof samplePortfolio === 'function' ? samplePortfolio() : samplePortfolio);
  const displayPortfolio = portfolio || demo;
   const dirty = Boolean(portfolio && JSON.stringify({ portfolio, theme, template }) !== savedSnapshot);

  useEffect(() => {
    document.title = preview ? `${portfolio?.name || 'Your portfolio'} — PortfolioVerse` : 'PortfolioVerse — Your work, in orbit';
    if (preview) { window.scrollTo(0, 0); previewHeading.current?.focus(); }
  }, [preview, portfolio?.name]);

  function notify(text) { setMessage(text); setError(''); }
  function startBuilder() { builderRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }
  function canReplace() { return !dirty || window.confirm('Replace your unsaved draft? Export or save it first if you want to keep it.'); }
  function loadPortfolio(next, text) {
    const normalized = normalize(next);
    setPortfolio(normalized);
    setSelectedId(normalized.projects[0]?.id || null);
    setActiveTab('story');
    notify(text);
  }
  async function importFile(file) {
    if (!file || busy || !canReplace()) return;
    const request = ++importRef.current;
    setBusy(true); setError(''); setMessage('Reading your resume locally…');
    try {
      if (/\.json$/i.test(file.name)) {
        if (file.size > 8 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 8 MB.');
        const backup = JSON.parse(await file.text());
        if (!backup.portfolio || !Array.isArray(backup.portfolio.projects)) throw new Error('This is not a PortfolioVerse backup. Choose the JSON file downloaded from the studio.');
        loadPortfolio(backup.portfolio, 'JSON backup restored. Save draft to keep it in this browser.');
         if (themes.some(item => item.id === backup.theme)) setTheme(backup.theme);
        if (templates.some(item => item.id === backup.template)) setTemplate(backup.template);
        setFilename(file.name); setSourceText('');
        return;
      }
      const text = await extractDocument(file);
      const next = parseResume(text);
      if (request !== importRef.current) return;
      loadPortfolio(next, `Your first draft is ready. ${next.warnings?.length ? `${next.warnings.length} detail${next.warnings.length === 1 ? '' : 's'} need your review — check the placeholders below.` : 'Review the extracted details and make them yours.'}`);
      setFilename(file.name); setSourceText('');
    } catch (err) {
      setError(err.message || 'We could not read this file. Try a text-based PDF or paste your resume text.');
      setMessage('');
    } finally { if (request === importRef.current) setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  function importText() {
    if (!sourceText.trim()) { setError('Paste your resume text first, then create your draft.'); return; }
    if (!canReplace()) return;
    try { loadPortfolio(parseResume(sourceText), 'Draft created from your text. Review the details before exporting.'); setFilename('Pasted resume'); } catch (err) { setError(err.message || 'This text could not be parsed. Add your name, experience, and skills, then try again.'); }
  }
  function loadSample() {
    if (!canReplace()) return;
    loadPortfolio(demo, 'Sample loaded. This is illustrative content — replace it with your own work.');
    setFilename('Sample portfolio'); setSourceText(''); startBuilder();
  }
  function update(key, value) { setPortfolio(current => ({ ...current, [key]: value })); }
  function updateProject(id, key, value) { setPortfolio(current => ({ ...current, projects: current.projects.map(project => project.id === id ? { ...project, [key]: value } : project) })); }
  function addProject() {
    const id = globalThis.crypto?.randomUUID?.() || `project-${Date.now()}`;
    setPortfolio(current => ({ ...current, projects: [...current.projects, { id, title: '', description: '', url: '' }] }));
    setSelectedId(id); notify('Project added. Give it a title and a short description.');
  }
  function removeProject(id) {
    const next = portfolio.projects.filter(project => project.id !== id);
    update('projects', next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
    notify('Project removed. Save your draft to keep this change.');
  }
  function moveProject(index, delta) {
    const next = [...portfolio.projects];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    update('projects', next); notify('Project order updated.');
  }
  function save() {
    try {
      const date = new Date().toISOString();
       localStorage.setItem(STORAGE_KEY, JSON.stringify({ portfolio, theme, template, savedAt: date }));
       setSavedSnapshot(JSON.stringify({ portfolio, theme, template })); setSavedAt(date);
      notify('Draft saved on this browser. Your original resume text was not saved.');
    } catch { setError('This browser could not save your draft. Download a JSON backup or export your website instead.'); }
  }
  function clearDraft() {
    if (!window.confirm('Clear your portfolio and remove the saved draft from this browser? This cannot be undone.')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { setError('The saved draft could not be removed. Check your browser storage settings and try again.'); return; }
    setPortfolio(null); setSavedSnapshot(''); setSavedAt(null); setSourceText(''); setFilename(''); setSelectedId(null); setPreview(false);
    notify('Draft cleared from this browser.');
  }
  function refine() {
    try { setPortfolio(normalize(refinePortfolio(portfolio, tone))); notify(`Applied a ${tone} tone using local writing rules. Review the revised copy.`); } catch (err) { setError(err.message || 'The tone could not be updated. Your draft is still available to edit.'); }
  }
  function improve(kind) {
    if (kind === 'clear') { setPortfolio(normalize(refinePortfolio(portfolio, 'professional'))); notify('The story was clarified with local writing rules. Review the revised copy.'); return; }
    if (kind === 'warm') { setPortfolio(normalize(refinePortfolio(portfolio, 'friendly'))); notify('A warmer voice was applied without adding new facts.'); return; }
    const projects = portfolio.projects.map(project => ({ ...project, description: project.description.trim().replace(/\s+/g, ' ').replace(/\s*([.!?])?$/, (match, punctuation) => punctuation ? match : '.') }));
    setPortfolio({ ...portfolio, projects }); notify('Project descriptions were tightened without changing their meaning.');
  }
  function exportSite() {
    try {
      const slug = (portfolio.name || 'my-portfolio').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-portfolio';
       download(exportPortfolio(portfolio, theme, template), `${slug}.html`, 'text/html;charset=utf-8');
      notify('Website exported as HTML. Open the downloaded file in your browser to view it.');
    } catch (err) { setError(err.message || 'Export failed. Your draft is still here; please try again.'); }
  }
  function exportJSON() {
     download(JSON.stringify({ portfolio, theme, template }, null, 2), 'portfolioverse-draft.json', 'application/json');
    notify('JSON backup downloaded.');
  }

   if (preview && portfolio) return <div className={`app preview-page theme-${theme} template-${template}`} id="top">
    <a className="skip-link" href="#preview-main">Skip to portfolio</a>
    <header className="preview-toolbar"><Brand /><span className="preview-mode-label">Portfolio preview</span><div className="toolbar-actions"><button className="button subtle" onClick={() => { setPreview(false); requestAnimationFrame(() => editorHeading.current?.focus()); }}><Icon name="back" />Back to editor</button><button className="button primary" onClick={exportSite}><Icon name="download" />Export website</button></div></header>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="sr-only" role="status">{message}</div>
    <main id="preview-main">
      <section className="portfolio-hero"><div className="portfolio-intro"><span className="portfolio-avatar">{(portfolio.name || '?').split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('')}</span><h1 ref={previewHeading} tabIndex="-1">{portfolio.name || 'Your name'}</h1><p className="portfolio-role">{portfolio.role || 'Your professional role'}</p><p className="portfolio-bio">{portfolio.bio || 'Tell visitors about your experience and the work you love.'}</p><div className="skill-list">{portfolio.skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}</div><a className="text-link" href="#portfolio-projects">Explore my work <Icon name="down" /></a></div><div className="portfolio-world"><World portfolio={portfolio} theme={theme} selectedId={selectedId} onSelect={id => { setSelectedId(id); document.getElementById(`preview-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} /><p>Every project, part of a bigger picture.</p></div></section>
      <section className="portfolio-work" id="portfolio-projects"><div className="section-title"><h2>Selected work</h2><span>{portfolio.projects.length} project{portfolio.projects.length === 1 ? '' : 's'}</span></div>{portfolio.projects.length ? <div className="portfolio-projects">{portfolio.projects.map(project => <article id={`preview-${project.id}`} className={`portfolio-project ${selectedId === project.id ? 'is-selected' : ''}`} key={project.id}><button className="project-select" aria-pressed={selectedId === project.id} onClick={() => setSelectedId(project.id)}><span className="project-orb" /><h3>{project.title || 'Untitled project'}</h3><Icon name="diagonal" /></button><p>{project.description || 'Add a description in the editor to tell the story behind this project.'}</p>{safeURL(project.url) && <a className="text-link" href={safeURL(project.url)} target="_blank" rel="noopener noreferrer">View project <Icon name="diagonal" /></a>}</article>)}</div> : <div className="empty-projects">Your next chapter starts here. Add your first project in the editor.</div>}</section>
      <section className="portfolio-contact"><h2>Let’s make<br />something matter.</h2>{portfolio.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portfolio.email) ? <a href={`mailto:${encodeURIComponent(portfolio.email).replace(/%40/g, '@')}`} className="contact-link">{portfolio.email}<Icon name="diagonal" size={30} /></a> : <p>Add your email in the editor so people can get in touch.</p>}</section>
    </main><footer className="site-footer"><Brand /><p>Made with PortfolioVerse. Authored by {portfolio.name || 'you'}.</p><a href="#top">Back to top <Icon name="up" /></a></footer>
  </div>;

  return <div className={`app theme-${theme}`} id="top">
    <a className="skip-link" href="#builder">Skip to portfolio builder</a>
    <header className="site-header"><Brand /><nav aria-label="Main navigation"><a href="#builder">The studio</a><a href="#how-it-works">How it works</a><button className="button header-button" onClick={portfolio ? () => setPreview(true) : startBuilder}>{portfolio ? 'View portfolio' : 'Start creating'}<Icon name="diagonal" size={16} /></button></nav></header>

    {!portfolio && <section className="landing-hero" aria-labelledby="hero-heading"><div className="hero-copy"><h1 id="hero-heading">Your work,<br />in orbit.</h1><p className="hero-description">You’re more than a document.<br />Turn your resume into a portfolio with a world of its own.</p><div className="hero-actions"><button className="button primary large" onClick={startBuilder}>Build my portfolio <Icon name="diagonal" /></button><button className="button text-button" onClick={loadSample}>Explore a sample <Icon name="arrow" /></button></div><p className="hero-note"><span className="status-dot" />Local-first. Yours to shape. Free to export.</p></div><div className="hero-world"><div className="world-caption"><span>One person. A world of possibilities.</span><span className="sample-label">Sample universe</span></div><World portfolio={demo} theme={theme} selectedId={selectedId} onSelect={id => setSelectedId(id)} /><div className="hero-project-links" aria-label="Sample projects">{demo.projects.slice(0, 3).map(project => <button key={project.id} aria-pressed={selectedId === project.id} onClick={() => setSelectedId(project.id)}><span className="mini-orb" />{project.title}<Icon name="diagonal" size={13} /></button>)}</div><p className="world-instruction">Drag to orbit · Select a project to explore</p></div></section>}

     <main>
       {portfolio && <PortfolioImprove portfolio={portfolio} template={template} onTemplate={setTemplate} onImprove={improve} />}
      <section id="builder" ref={builderRef} className={`builder-section ${portfolio ? 'has-draft' : ''}`} aria-labelledby="builder-heading" aria-busy={busy}>
        <div className="studio-heading"><div><h2 id="builder-heading" tabIndex="-1" ref={editorHeading}>{portfolio ? 'Your portfolio studio.' : 'A new world starts here.'}</h2><p>{portfolio ? 'Shape the story. Make the space your own.' : 'Bring your experience. We’ll give you a starting point.'}</p></div><span className="local-indicator"><span className="status-dot" />Local extraction · no AI service connected</span></div>
        <div className="feedback-area">{error && <div className="notice error" role="alert"><span>{error}</span><button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}<div className={`notice status ${message ? '' : 'notice-empty'}`} role="status" aria-live="polite">{message && <><Icon name={busy ? 'file' : 'check'} size={16} /><span>{message}</span></>}</div></div>

        <div className={`studio-layout ${portfolio ? 'with-draft' : ''}`}>
          <aside className="source-panel" aria-labelledby="source-heading"><div className="panel-heading"><h3 id="source-heading">Your starting point</h3><Icon name="file" /></div><p className="panel-description">A resume becomes a first draft.<br />You make it a point of view.</p>
            <div className="segmented" role="group" aria-label="Resume input method"><button aria-pressed={sourceMode === 'file'} onClick={() => setSourceMode('file')}>Upload a file</button><button aria-pressed={sourceMode === 'text'} onClick={() => setSourceMode('text')}>Paste text</button></div>
            {sourceMode === 'file' ? <><input ref={fileInput} className="sr-only" type="file" id="resume-file" accept=".pdf,.txt,.md,text/plain,application/pdf" onChange={event => importFile(event.target.files?.[0])} disabled={busy} /><div className={`drop-zone ${dragging ? 'is-dragging' : ''} ${busy ? 'is-busy' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); importFile(event.dataTransfer.files[0]); }}><span className={`upload-symbol ${busy ? 'loading' : ''}`}><Icon name="upload" size={27} /></span><strong>{busy ? 'Reading your resume…' : dragging ? 'Drop it here' : 'Drop your resume here'}</strong><span>{busy ? 'Extracting on your device' : 'PDF or text · Text-based PDFs work best'}</span><button className="button secondary" onClick={() => fileInput.current?.click()} disabled={busy}>{busy ? 'Reading file' : 'Choose a file'}{!busy && <Icon name="plus" size={16} />}</button></div>{filename && <p className="file-caption"><Icon name="file" size={14} /><span>{filename}</span></p>}</> : <div className="paste-input"><label htmlFor="resume-text">Resume text</label><textarea id="resume-text" placeholder={'Your name\nYour role\n\nExperience, projects, skills…'} value={sourceText} onChange={event => setSourceText(event.target.value)} rows={9} /><button className="button primary" onClick={importText} disabled={busy || !sourceText.trim()}>Create my draft <Icon name="arrow" size={16} /></button><span className="field-hint">{sourceText.length.toLocaleString()} characters · Kept in memory only</span></div>}
            <div className="sample-option"><span>Just looking around?</span><button className="text-link" onClick={loadSample} disabled={busy}>Try the sample portfolio <Icon name="arrow" size={15} /></button></div>
            <label className="field-hint" htmlFor="restore-backup">Restore a PortfolioVerse JSON backup</label>
            <input id="restore-backup" type="file" accept=".json,application/json" disabled={busy} onChange={event => { importFile(event.target.files?.[0]); event.target.value = ''; }} />
            <p className="privacy-note"><svg width="15" height="17" viewBox="0 0 20 22" fill="none" aria-hidden="true"><path d="m10 1 8 3v7c0 5-8 10-8 10S2 16 2 11V4l8-3Z" stroke="currentColor" strokeWidth="1.4" /><path d="m6 10 3 3 5-5" stroke="currentColor" strokeWidth="1.4" /></svg><span>Your resume stays in memory. Nothing is stored until you choose <strong>Save draft</strong>. Only the edited draft is saved to this browser.</span></p>
          </aside>

          {portfolio ? <div className="draft-workspace"><div className="editor-panel"><div className="editor-tabs" role="tablist" aria-label="Portfolio editor">{[['story', 'Your story'], ['projects', `Projects (${portfolio.projects.length})`], ['style', 'Look & feel']].map(([id, label]) => <button role="tab" id={`tab-${id}`} aria-selected={activeTab === id} aria-controls={`panel-${id}`} tabIndex={activeTab === id ? 0 : -1} key={id} onClick={() => setActiveTab(id)} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const ids = ['story', 'projects', 'style']; const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (ids.indexOf(activeTab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3; setActiveTab(ids[index]); document.getElementById(`tab-${ids[index]}`)?.focus(); } }}>{label}</button>)}</div>
            <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="editor-content">
              {activeTab === 'story' && <><div className="editor-section-heading"><h3>The person behind the work.</h3><p>Start with the essentials. Every edit updates your universe.</p></div><div className="field-row"><Field label="Full name" id="name" value={portfolio.name} onChange={event => update('name', event.target.value)} autoComplete="name" placeholder="Your name" /><Field label="Professional role" id="role" value={portfolio.role} onChange={event => update('role', event.target.value)} placeholder="What do you do?" /></div><Field label="Your introduction" id="bio" multiline rows={4} value={portfolio.bio} onChange={event => update('bio', event.target.value)} placeholder="The work you do, the things you care about, and what comes next." /><Field label="Contact email" id="email" type="email" value={portfolio.email} onChange={event => update('email', event.target.value)} placeholder="hello@example.com" autoComplete="email" hint={portfolio.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(portfolio.email) ? 'Enter a complete email address to show a contact link.' : 'Displayed on your portfolio. Leave blank to keep it private.'} /><Field label="Skills" id="skills" value={portfolio.skills.join(', ')} onChange={event => update('skills', event.target.value.split(',').map(skill => skill.trimStart()))} onBlur={() => update('skills', portfolio.skills.map(skill => skill.trim()).filter(Boolean))} placeholder="Design, strategy, React" hint="Separate each skill with a comma." /><div className="refine-section"><div><h4>Find your voice</h4><p>A light rewrite using local rules. Your facts stay yours.</p></div><div className="refine-controls"><label className="sr-only" htmlFor="tone">Writing tone</label><select id="tone" value={tone} onChange={event => setTone(event.target.value)}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="concise">Concise</option></select><button className="button secondary" onClick={refine}>Refine copy <Icon name="arrow" size={15} /></button></div></div></>}
              {activeTab === 'projects' && <><div className="editor-section-heading project-section-heading"><div><h3>Give your work a place.</h3><p>Select a project to find it in orbit.</p></div><button className="button secondary compact" onClick={addProject}><Icon name="plus" size={16} />Add project</button></div>{portfolio.projects.length === 0 && <div className="empty-projects"><h4>Your first project belongs here.</h4><p>A case study, a side project, an idea you brought to life.</p><button className="button secondary" onClick={addProject}><Icon name="plus" />Add your first project</button></div>}<div className="project-edit-list">{portfolio.projects.map((project, index) => <article className={`project-editor ${selectedId === project.id ? 'is-selected' : ''}`} key={project.id}><div className="project-editor-header"><button className="project-name" onClick={() => setSelectedId(project.id)} aria-pressed={selectedId === project.id}><span className="mini-orb" />{project.title || 'Untitled project'}</button><div className="project-tools"><button className="icon-button" disabled={index === 0} aria-label={`Move ${project.title || 'project'} up`} onClick={() => moveProject(index, -1)}><Icon name="up" size={16} /></button><button className="icon-button" disabled={index === portfolio.projects.length - 1} aria-label={`Move ${project.title || 'project'} down`} onClick={() => moveProject(index, 1)}><Icon name="down" size={16} /></button><button className="icon-button remove-button" aria-label={`Remove ${project.title || 'project'}`} onClick={() => removeProject(project.id)}><Icon name="close" size={16} /></button></div></div><Field label="Project title" id={`title-${project.id}`} value={project.title} onChange={event => updateProject(project.id, 'title', event.target.value)} /><Field label="Description" id={`description-${project.id}`} multiline rows={3} value={project.description} onChange={event => updateProject(project.id, 'description', event.target.value)} /><Field label="Project URL" id={`url-${project.id}`} type="url" placeholder="https://your-project.com" value={project.url} onChange={event => updateProject(project.id, 'url', event.target.value)} hint={project.url && !safeURL(project.url) ? 'Use a complete http:// or https:// address to enable this link.' : 'Optional. Opens in a new tab.'} /></article>)}</div></>}
              {activeTab === 'style' && <><div className="editor-section-heading"><h3>A different atmosphere.</h3><p>One universe. Three ways to make it feel like you.</p></div><fieldset className="theme-picker"><legend>Portfolio theme</legend>{themes.map(item => <label className={`theme-option ${theme === item.id ? 'is-selected' : ''}`} key={item.id}><input type="radio" name="theme" value={item.id} checked={theme === item.id} onChange={() => setTheme(item.id)} /><span className="theme-swatch" style={{ '--swatch': item.color }} /><span><strong>{item.name}</strong><small>{item.note}</small></span>{theme === item.id && <Icon name="check" />}</label>)}</fieldset><div className="style-note"><h4>Built to be explored.</h4><p>Your interactive orbit sits alongside a readable project list. The exported HTML works as a standalone website — no account or hosting service required to open it.</p><button className="text-link" onClick={() => setPreview(true)}>See your full portfolio <Icon name="diagonal" size={16} /></button></div></>}
            </div></div>
            <aside className="live-preview" aria-label="Live portfolio preview"><div className="live-heading"><span><span className="status-dot" />Live universe</span><button className="icon-button" aria-label="Open full portfolio preview" onClick={() => setPreview(true)}><Icon name="diagonal" /></button></div><div className="mini-identity"><h3>{portfolio.name || 'Your name'}</h3><p>{portfolio.role || 'Your professional role'}</p></div><div className="studio-world"><World portfolio={portfolio} theme={theme} selectedId={selectedId} onSelect={setSelectedId} /></div><div className="accessible-projects"><h4>Your constellation</h4>{portfolio.projects.length ? <ul>{portfolio.projects.map(project => <li key={project.id}><button aria-pressed={selectedId === project.id} onClick={() => setSelectedId(project.id)}><span className="mini-orb" /><span>{project.title || 'Untitled project'}</span><Icon name="diagonal" size={14} /></button>{selectedId === project.id && <p>{project.description || 'Add a description in the Projects tab.'}</p>}</li>)}</ul> : <p>Add a project to begin your constellation.</p>}</div><button className="button secondary preview-button" onClick={() => setPreview(true)}><Icon name="eye" />Open full preview</button></aside>
          </div> : <div className="empty-workspace"><div className="empty-graphic" aria-hidden="true"><div className="empty-orbit" /><span className="empty-core" /><span className="empty-satellite" /></div><h3>Room for your next chapter.</h3><p>Upload a resume or paste your experience.<br />Your editable portfolio will take shape right here.</p><div className="empty-feature-list"><span><Icon name="check" size={15} />Editable story & projects</span><span><Icon name="check" size={15} />Interactive 3D universe</span><span><Icon name="check" size={15} />A website you can take with you</span></div><button className="text-link" onClick={() => { loadPortfolio(emptyPortfolio, 'Blank draft created. Start with your name and the work you want to share.'); }}>Or start with a blank canvas <Icon name="arrow" size={16} /></button></div>}
        </div>
        {portfolio && <div className="draft-actions"><div className="draft-save-status"><span className={`status-dot ${dirty ? 'unsaved' : ''}`} /><span>{dirty ? 'Unsaved changes' : 'Saved on this browser'}{savedAt && <small>Last saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>}</span></div><div className="draft-action-buttons"><button className="button text-button danger" onClick={clearDraft}>Clear draft</button><button className="button subtle json-button" onClick={exportJSON}>Download JSON</button><button className="button secondary" onClick={save}><Icon name="save" size={17} />Save draft</button><button className="button primary" onClick={exportSite}><Icon name="download" size={17} />Export website</button></div></div>}
      </section>

      <section className="how-section" id="how-it-works"><div className="how-heading"><h2>From experience<br />to expression.</h2><p>A little structure.<br />A lot of you.</p></div><ol className="how-steps"><li><h3>Bring your story.</h3><p>Upload a text-based PDF, add a text file, or paste your resume. Extraction runs locally, right in your browser.</p></li><li><h3>Make it feel like you.</h3><p>Edit every detail, shape the voice, and choose your atmosphere. Your projects become an explorable constellation.</p></li><li><h3>Take your world with you.</h3><p>Preview your portfolio and export a standalone HTML website. Save a draft on this browser whenever you choose.</p></li></ol></section>
    </main><footer className="site-footer"><Brand /><p>A space for the work only you could make.</p><a href="#top">Back to top <Icon name="up" size={15} /></a></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
