import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, Database, FileText, Layers3, Menu, Network, Play, Sparkles, X } from 'lucide-react';
import FoundryLogo from '../components/FoundryLogo.jsx';
import { Link } from 'react-router-dom';

const instruments = [
  { icon: FileText, name: 'Digest', label: 'A concise explanation that keeps the argument intact.' },
  { icon: Play, name: 'Listen', label: 'A narrated conversation for the commute, walk, or late-night review.' },
  { icon: Layers3, name: 'Recall', label: 'Flashcards built around the ideas you actually need to remember.' },
  { icon: Network, name: 'Map', label: 'A visual structure that shows how the ideas connect.' },
];

const pipeline = [
  { eyebrow: '01 / BRING THE SOURCE', title: 'Start with the material already in your world.', body: 'A lecture note, a chapter, a research paper, or the document you keep reopening. Reeky begins with what you already need to understand.', mark: 'SOURCE DESK' },
  { eyebrow: '02 / SHAPE THE KIT', title: 'Choose the depth, tone, and instruments that fit you.', body: 'Your kit is not a generic summary. It is a personal set of explanations, recall tools, maps, and practice surfaces shaped around your study rhythm.', mark: 'KIT BENCH' },
  { eyebrow: '03 / STUDY ANYWHERE', title: 'Leave with something you can use, not just something you read.', body: 'Move from orientation to active recall, then return to the places that still feel uncertain. Your instruments stay ready, even when the connection does not.', mark: 'REVIEW DESK' },
];

export default function FoundryHome() {
  const [activeInstrument, setActiveInstrument] = useState(0);
  const [activePipeline, setActivePipeline] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveInstrument(current => (current + 1) % instruments.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, []);

  const currentInstrument = instruments[activeInstrument];
  const CurrentIcon = currentInstrument.icon;
  const currentStage = pipeline[activePipeline];

  return (
    <main className="foundry-entryway">
      <div className="entryway-noise" aria-hidden="true" />
      <header className="entryway-header">
        <Link to="/" className="entryway-brand" aria-label="Reeky Foundry home">
          <FoundryLogo />
        </Link>
        <nav className={`entryway-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <a href="#instruments" onClick={() => setMenuOpen(false)}>Instruments</a>
          <a href="#method" onClick={() => setMenuOpen(false)}>The method</a>
          <a href="#offline" onClick={() => setMenuOpen(false)}>Study offline</a>
          <Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link to="/signup" className="entryway-nav-cta" onClick={() => setMenuOpen(false)}>Open a bench <ArrowRight size={15} /></Link>
        </nav>
        <button type="button" className="entryway-menu" onClick={() => setMenuOpen(current => !current)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <section className="entryway-hero">
        <div className="entryway-hero-copy">
          <div className="entryway-kicker"><span /> PERSONAL LEARNING KITS / 001</div>
          <h1>Make knowledge<br /><i>work for you.</i></h1>
          <p className="entryway-lead">Reeky Foundry turns the sources you already have into a personal study bench—clear enough to enter, active enough to remember, and yours enough to return to.</p>
          <div className="entryway-hero-actions">
            <Link to="/signup" className="entryway-primary-cta">Forge your first kit <ArrowRight size={17} /></Link>
            <a href="#instruments" className="entryway-text-cta">See the instruments <ChevronRight size={16} /></a>
          </div>
          <div className="entryway-proof"><span><Check size={13} /> Built from your sources</span><span><Check size={13} /> Designed for active recall</span><span><Check size={13} /> Ready without Wi-Fi</span></div>
        </div>

        <div className="entryway-hero-visual" aria-label="A preview of a Reeky learning kit">
          <div className="entryway-visual-caption"><span>THE KIT / LIVE PREVIEW</span><span>01—04</span></div>
          <div className="entryway-plate">
            <div className="entryway-plate-top"><span className="plate-dot" /> PRODUCTION COMPLETE <span>09:42</span></div>
            <div className="entryway-source-slip">
              <span className="slip-label">SOURCE / BIOLOGY 101</span>
              <strong>Cellular Structure<br />&amp; Energy Capture</strong>
              <span className="slip-rule" /><span className="slip-lines" /><span className="slip-lines short" />
              <span className="slip-stamp">READY<br />TO STUDY</span>
            </div>
            <div className="entryway-kit-passport">
              <div className="passport-head"><span>PERSONAL KIT</span><span>RK—026</span></div>
              <div className="passport-title">A way into<br /><em>the material.</em></div>
              <div className="passport-route"><span className="route-active" /><span /><span /><span /><b>04 instruments ready</b></div>
              <div className="passport-meta"><span>STUDY PROGRESS</span><strong>68%</strong></div>
              <div className="passport-progress"><i /></div>
              <div className="passport-footer"><span>Last opened / 12 min ago</span><BookOpen size={14} /></div>
            </div>
            <div className="entryway-orbit orbit-one"><FileText size={16} /><span>DIGEST</span></div>
            <div className="entryway-orbit orbit-two"><Network size={16} /><span>MAP</span></div>
            <div className="entryway-orbit orbit-three"><Layers3 size={16} /><span>RECALL</span></div>
          </div>
        </div>
      </section>

      <div className="entryway-marquee" aria-hidden="true"><span>SOURCE DESK</span><i>✦</i><span>KIT BENCH</span><i>✦</i><span>REVIEW DESK</span><i>✦</i><span>LEARN IN YOUR OWN SHAPE</span><i>✦</i><span>SOURCE DESK</span></div>

      <section className="entryway-instruments" id="instruments">
        <div className="entryway-section-heading"><div><span className="entryway-kicker">A SMALL SET OF SERIOUS TOOLS</span><h2>One source.<br /><i>Many ways in.</i></h2></div><p>Good learning is not a single format. Reeky gives the same material more than one doorway, so you can move from first understanding to durable memory.</p></div>
        <div className="instrument-showcase">
          <div className="instrument-list">
            {instruments.map((instrument, index) => {
              const Icon = instrument.icon;
              return <button type="button" key={instrument.name} className={`instrument-list-item ${index === activeInstrument ? 'is-active' : ''}`} onClick={() => setActiveInstrument(index)}><span className="instrument-number">0{index + 1}</span><Icon size={18} /><span>{instrument.name}</span><ChevronRight size={15} /></button>;
            })}
          </div>
          <div className="instrument-card" key={currentInstrument.name}>
            <div className="instrument-card-grid" aria-hidden="true" />
            <div className="instrument-card-index">INSTRUMENT / 0{activeInstrument + 1}</div>
            <CurrentIcon size={28} className="instrument-card-icon" />
            <span className="instrument-card-label">{currentInstrument.name}</span>
            <h3>{currentInstrument.label}</h3>
            <div className="instrument-card-annotation"><span>START WITH THE IDEA</span><span>THEN TEST THE MEMORY</span></div>
          </div>
        </div>
      </section>

      <section className="entryway-method" id="method">
        <div className="entryway-section-heading method-heading"><div><span className="entryway-kicker">THE FOUNDRY METHOD</span><h2>From heavy source<br /><i>to usable knowledge.</i></h2></div><p>There is no black box between your document and your understanding. The Foundry makes the journey visible.</p></div>
        <div className="method-layout">
          <div className="method-tabs" role="tablist" aria-label="Foundry method steps">
            {pipeline.map((stage, index) => <button type="button" role="tab" aria-selected={index === activePipeline} key={stage.mark} className={index === activePipeline ? 'is-active' : ''} onClick={() => setActivePipeline(index)}><span>0{index + 1}</span><strong>{stage.mark}</strong><ChevronRight size={15} /></button>)}
          </div>
          <div className="method-stage" key={currentStage.mark}>
            <div className="method-stage-top"><span>{currentStage.eyebrow}</span><span>REEKY / 2026</span></div>
            <div className="method-stage-copy"><h3>{currentStage.title}</h3><p>{currentStage.body}</p></div>
            <div className="method-stage-schematic"><span className="schematic-core"><Sparkles size={20} /></span><span className="schematic-line line-a" /><span className="schematic-line line-b" /><span className="schematic-node node-a">SOURCE</span><span className="schematic-node node-b">SHAPE</span><span className="schematic-node node-c">RECALL</span></div>
          </div>
        </div>
      </section>

      <section className="entryway-offline" id="offline">
        <div className="offline-index">FIELD NOTE / 03</div>
        <div><span className="entryway-kicker">YOUR KNOWLEDGE, WITH YOU</span><h2>Keep the bench<br /><i>even when the signal drops.</i></h2></div>
        <p>Text instruments stay available in the PWA, media can be saved to your local shelf, and your study trail can pick up where you left it.</p>
        <Link to="/signup" className="entryway-arrow-link">Start with a source <ArrowRight size={18} /></Link>
      </section>

      <footer className="entryway-footer"><Link to="/" className="entryway-brand" aria-label="Reeky Foundry home"><FoundryLogo /></Link><span>Personal learning kits, forged from the sources that matter.</span><span>© {new Date().getFullYear()} Reeky Foundry</span></footer>
    </main>
  );
}
