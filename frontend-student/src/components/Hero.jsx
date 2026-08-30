import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, FileText, Music, Network } from 'lucide-react';

export default function Hero() {
  const [cursor1, setCursor1] = useState({ x: 32, y: 35 });
  const [cursor2, setCursor2] = useState({ x: 68, y: 55 });
  const [heroRotation, setHeroRotation] = useState({ x: 0, y: 0 });

  // FIGMA COLLABORATIVE CURSORS DRIFT SIMULATOR
  useEffect(() => {
    const driftInterval = setInterval(() => {
      // Walk path inside bounds
      setCursor1(prev => ({
        x: Math.max(15, Math.min(85, prev.x + (Math.random() - 0.5) * 22)),
        y: Math.max(20, Math.min(80, prev.y + (Math.random() - 0.5) * 22))
      }));
      setCursor2(prev => ({
        x: Math.max(15, Math.min(85, prev.x + (Math.random() - 0.5) * 22)),
        y: Math.max(20, Math.min(80, prev.y + (Math.random() - 0.5) * 22))
      }));
    }, 2800);

    return () => clearInterval(driftInterval);
  }, []);

  // Mouse move handler for Interactive 3D Hero dashboard
  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2; 
    const y = e.clientY - rect.top - rect.height / 2; 
    
    const factor = 12;
    setHeroRotation({
      x: -(y / rect.height) * factor,
      y: (x / rect.width) * factor
    });
  };

  const handleHeroMouseLeave = () => {
    setHeroRotation({ x: 0, y: 0 });
  };

  return (
    <section className="hero-section">
      <div className="container hero-grid">
        <div className="hero-content" style={{ position: 'relative' }}>
          
          {/* FIGMA COLLABORATIVE FLOATING CURSORS */}
          <div className="collaborative-cursor" style={{ left: `${cursor1.x}%`, top: `${cursor1.y}%` }}>
            <svg width="14" height="20" viewBox="0 0 14 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1V17.5L5.5 13L10.5 20L13 18.5L8 11.5L13.5 11.5L1 1Z" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <div className="cursor-label" style={{ background: 'var(--primary)' }}>Dr. Aris</div>
          </div>

          <div className="collaborative-cursor" style={{ left: `${cursor2.x}%`, top: `${cursor2.y}%` }}>
            <svg width="14" height="20" viewBox="0 0 14 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1V17.5L5.5 13L10.5 20L13 18.5L8 11.5L13.5 11.5L1 1Z" fill="var(--secondary)" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <div className="cursor-label" style={{ background: 'var(--secondary)' }}>Sophia</div>
          </div>

          <div className="badge">
            <span></span> Tailored AI Study Suites
          </div>
          <h1 className="hero-title">
            Turn Raw PDFs Into <br />
            <span>Interactive Study Suites</span>
          </h1>
          <p className="hero-subtitle">
            Upload textbook chapters, syllabi, or research papers. Our engine instantly processes your source material into customized study podcasts, adaptive quizzes, slide decks, interactive mindmaps, and study guides.
          </p>
          <div className="hero-buttons">
            <a href="#demo" className="btn btn-primary">
              Try the Sandbox <Sparkles size={18} />
            </a>
            <button className="btn btn-secondary" onClick={() => { document.getElementById('comparison').scrollIntoView({ behavior: 'smooth'}); }}>
              How It Works <ChevronRight size={18} />
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <h3>8+</h3>
              <p>Study Formats</p>
            </div>
            <div className="stat-item">
              <h3>100%</h3>
              <p>Tailored Content</p>
            </div>
            <div className="stat-item">
              <h3>2 min</h3>
              <p>Average Processing</p>
            </div>
          </div>
        </div>

        {/* 3D INTERACTIVE HERO DASHBOARD WITH SWEEPING NEON BORDERS */}
        <div 
          className="hero-visual"
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
        >
          <div 
            className="hero-interactive-dashboard sweeping-border"
            style={{
              transform: `rotateX(${heroRotation.x}deg) rotateY(${heroRotation.y}deg)`
            }}
          >
            <div className="dashboard-base">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--divider)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} color="var(--primary)" />
                  <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Personalized Study Portal</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status: Active</span>
              </div>

              <div style={{ padding: '1rem 0' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Biology_Cellular_Powerhouse.pdf</h4>
                <div style={{ height: '8px', width: '70%', background: 'var(--divider)', borderRadius: '10px' }} />
                <div style={{ height: '8px', width: '45%', background: 'var(--divider)', borderRadius: '10px', marginTop: '0.4rem' }} />
              </div>

              <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>Generated: 8 modules</span>
                <span>100% completed</span>
              </div>
            </div>

            {/* Floating Dashboard Elements */}
            <div className="floating-sub-card card-doc">
              <h4><FileText size={16} color="var(--primary)" /> Lectures.pdf</h4>
              <p>Biology Core Syllabus</p>
            </div>

            <div className="floating-sub-card card-podcast">
              <h4>
                <Music size={16} color="var(--secondary)" /> 
                Podcast Audio
                <span style={{ marginLeft: 'auto', display: 'flex' }}>
                  <span className="mini-wave-bar"></span>
                  <span className="mini-wave-bar"></span>
                  <span className="mini-wave-bar"></span>
                  <span className="mini-wave-bar"></span>
                </span>
              </h4>
              <p>Episode 1: Powerhouse dynamics</p>
            </div>

            <div className="floating-sub-card card-mindmap">
              <h4><Network size={16} color="var(--primary)" /> Concept Node</h4>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Active links <span className="mini-node-pulse"></span>
              </p>
            </div>

            <div className="floating-sub-card card-flashcard">
              <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>Flashcard</span>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.15rem' }}>What is ATP?</h4>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
