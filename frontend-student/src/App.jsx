import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  HelpCircle, 
  TrendingUp, 
  Play, 
  Pause, 
  Volume2, 
  ArrowLeft, 
  ArrowRight, 
  UploadCloud, 
  Check, 
  Compass, 
  Layers, 
  RotateCw, 
  BookOpen, 
  VolumeX, 
  Music, 
  ChevronRight, 
  Sun, 
  Moon, 
  Menu, 
  X,
  FileCheck,
  Video,
  FileSpreadsheet,
  Network
} from 'lucide-react';

// Sample Mock Data
const MOCK_DATA = {
  biology: {
    title: "Biology 101: Cell Structure & Function.pdf",
    tagline: "Cellular Powerhouses & Energy Capture",
    flashcards: [
      { q: "What is the primary function of the Mitochondria?", a: "To generate most of the chemical energy needed to power the cell's biochemical reactions, stored as adenosine triphosphate (ATP)." },
      { q: "What is the key differences between eukaryotic and prokaryotic cells?", a: "Eukaryotic cells contain membrane-bound organelles, including a nucleus, while prokaryotic cells do not have a nucleus or membrane-bound organelles." },
      { q: "Explain the role of Ribosomes in the cell.", a: "Ribosomes serve as the site of protein synthesis in the cell, translating genetic information from mRNA into polypeptide chains." },
      { q: "What is the function of the cell wall in plant cells?", a: "To provide structural support, protection, and rigidity to the cell, preventing over-expansion when water enters." }
    ],
    quiz: [
      {
        q: "Which of the following organelles is responsible for cellular respiration and energy production?",
        options: ["Golgi Apparatus", "Lysosome", "Mitochondria", "Endoplasmic Reticulum"],
        correct: 2,
        explanation: "Mitochondria are often referred to as the powerhouses of the cell because they generate ATP through the process of cellular respiration."
      },
      {
        q: "What is the primary function of chloroplasts in plant cells?",
        options: ["Protein Synthesis", "Photosynthesis", "Lipid Storage", "Waste Disposal"],
        correct: 1,
        explanation: "Chloroplasts contain chlorophyll and carry out photosynthesis, converting solar energy into chemical energy (glucose)."
      }
    ],
    mindmap: {
      nodes: [
        { id: '1', label: 'Cell Biology', x: 200, y: 150, type: 'root' },
        { id: '2', label: 'Organelles', x: 80, y: 80, type: 'child' },
        { id: '3', label: 'Membranes', x: 320, y: 80, type: 'child' },
        { id: '4', label: 'Energy Capture', x: 80, y: 220, type: 'child' },
        { id: '5', label: 'Genetics', x: 320, y: 220, type: 'child' },
        { id: '6', label: 'Mitochondria', x: 20, y: 270, type: 'grandchild' },
        { id: '7', label: 'Chloroplast', x: 120, y: 290, type: 'grandchild' }
      ],
      connections: [
        { from: '1', to: '2' },
        { from: '1', to: '3' },
        { from: '1', to: '4' },
        { from: '1', to: '5' },
        { from: '4', to: '6' },
        { from: '4', to: '7' }
      ]
    },
    slides: [
      { title: "Introduction to Cellular Organelles", content: "Organelles are specialized sub-units within a cell that have specific functions. Similar to organs in a body, they keep the cell functioning, dividing, and processing energy." },
      { title: "The Mitochondria: Powering Life", content: "Mitochondria convert oxygen and nutrients into adenosine triphosphate (ATP). They contain their own ribosomes and DNA, supporting the endosymbiotic theory of origin." },
      { title: "Photosynthesis & The Chloroplast", content: "Exclusive to plants and algae, chloroplasts capture light energy to synthesize carbohydrates. This process releases oxygen as a vital byproduct, sustaining our atmosphere." }
    ],
    report: `### Executive Study Summary: Cell Biology Foundations

This module presents a comprehensive breakdown of basic cellular components, structural characteristics, and metabolic pathways. It explores the physiological mechanisms that govern cell division, energy conversion, and material transport across membranes.

#### 1. The Endomembrane System
The endomembrane system consists of the nuclear envelope, endoplasmic reticulum (ER), Golgi apparatus, lysosomes, vacuoles, and the plasma membrane. These components work in synthesis to produce, package, and transport lipids and proteins.
* **Rough ER**: Embedded with ribosomes; responsible for protein folding.
* **Smooth ER**: Key site for lipid synthesis, carbohydrate metabolism, and drug detoxification.
* **Golgi Complex**: The sorting and shipping center, adding molecular 'postage tags' to proteins.

#### 2. Bioenergetics & Metabolic Transfer
Energy synthesis occurs through cellular respiration in mitochondria and photosynthesis in chloroplasts. These pathways leverage electron transport chains (ETC) and proton gradients across inner membrane surfaces to generate ATP, driving anabolic cell functions.`
  },
  history: {
    title: "History 201: The French Revolution & Modern State.pdf",
    tagline: "Revolutions That Shaped the Modern World",
    flashcards: [
      { q: "What was the main cause of the French Revolution in 1789?", a: "Severe financial crisis, high taxes on the Third Estate, food shortages, and resentment against absolute royal authority and feudal privileges." },
      { q: "Who were the Jacobins?", a: "A radical political group during the French Revolution led by Maximilien Robespierre, responsible for the Reign of Terror." },
      { q: "What was the significance of the Storming of the Bastille?", a: "Occurring on July 14, 1789, it symbolized the fall of royal despotism and the rise of popular sovereignty, sparking the revolution." },
      { q: "What did the Declaration of the Rights of Man assert?", a: "That all men are born free and remain equal in rights, emphasizing liberty, property, security, and resistance to oppression." }
    ],
    quiz: [
      {
        q: "Who was the ruling monarch of France at the outbreak of the Revolution in 1789?",
        options: ["Louis XIV", "Louis XVI", "Napoleon Bonaparte", "Charles X"],
        correct: 1,
        explanation: "Louis XVI was the king of France when the revolution began, and he was executed by guillotine in 1793."
      },
      {
        q: "Which period is characterized by mass executions of suspected enemies of the revolution?",
        options: ["The Directory", "The Thermidorian Reaction", "The Reign of Terror", "The Consulate"],
        correct: 2,
        explanation: "Led by the Committee of Public Safety (including Robespierre), the Reign of Terror resulted in thousands of executions between 1793 and 1794."
      }
    ],
    mindmap: {
      nodes: [
        { id: '1', label: 'French Revolution', x: 200, y: 150, type: 'root' },
        { id: '2', label: 'Causes', x: 80, y: 80, type: 'child' },
        { id: '3', label: 'Key Phases', x: 320, y: 80, type: 'child' },
        { id: '4', label: 'Ideals', x: 80, y: 220, type: 'child' },
        { id: '5', label: 'Legacy', x: 320, y: 220, type: 'child' },
        { id: '6', label: 'Reign of Terror', x: 380, y: 20, type: 'grandchild' },
        { id: '7', label: 'Napoleon', x: 420, y: 250, type: 'grandchild' }
      ],
      connections: [
        { from: '1', to: '2' },
        { from: '1', to: '3' },
        { from: '1', to: '4' },
        { from: '1', to: '5' },
        { from: '3', to: '6' },
        { from: '5', to: '7' }
      ]
    },
    slides: [
      { title: "The Estates General & Social Unrest", content: "France was divided into three estates: the Clergy (1st), the Nobility (2nd), and the Commoners (3rd). Despite representing 98% of the population, the Third Estate was heavily taxed and politically outvoted." },
      { title: "The Reign of Terror (1793-1794)", content: "Under Maximilien Robespierre and the Jacobins, the revolutionary government arrested and executed over 17,000 political dissidents, creating a culture of fear to defend the republic." },
      { title: "Rise of Napoleon & Global Legacy", content: "The instability of the Directory paved the way for Napoleon Bonaparte's coup in 1799. While it ended the republic, the Napoleonic Code exported revolutionary ideals across Europe." }
    ],
    report: `### Historical Analysis: The French Revolution & Modernity

The transition of France from a feudal absolute monarchy to a modern state serves as a pivotal chapter in European history. This analysis reviews the intersection of economic crisis, Enlightenment philosophy, and popular mobilization.

#### 1. Socio-Economic Catalysts
By 1789, France was bankrupt, largely due to its participation in the American Revolutionary War. A succession of crop failures escalated bread prices, sparking agrarian revolts. The refusal of the nobility to accept fiscal reforms led to the assembly of the Estates General.

#### 2. The Shift to Radicalism
The moderate phase of the revolution (1789–1791) drafted the Civil Constitution of the Clergy and attempted a constitutional monarchy. However, foreign invasions and domestic counter-revolutions radicalized the movement, bringing Robespierre's Jacobins to power and initiating a dramatic social reorganization.`
  },
  economics: {
    title: "Economics 302: Monetary Policy & Inflation.pdf",
    tagline: "Central Banks, Inflation, & GDP Dynamics",
    flashcards: [
      { q: "What is Monetary Policy?", a: "The actions undertaken by a nation's central bank to control money supply and achieve sustainable economic growth, primarily through adjusting interest rates." },
      { q: "Define Quantitative Easing (QE).", a: "An unconventional monetary policy tool where a central bank purchases long-term government securities from the open market to inject liquidity and lower long-term interest rates." },
      { q: "What is the relationship between interest rates and inflation?", a: "Raising interest rates increases the cost of borrowing, which cools spending and demand, helping to lower inflation. Lowering interest rates stimulates borrowing and demand, which can increase inflation." },
      { q: "What is cost-push inflation?", a: "Inflation caused by an increase in prices of inputs like labor, raw materials, etc., which decreases aggregate supply and pushes up the final price of goods." }
    ],
    quiz: [
      {
        q: "What is the main tool used by the Federal Reserve to adjust interest rates?",
        options: ["Tax rate adjustments", "Federal funds rate target", "Direct wage control", "Import tariffs"],
        correct: 1,
        explanation: "The Federal Reserve primarily uses target adjustments to the federal funds rate (the rate banks charge each other for overnight loans) to steer economic interest rates."
      },
      {
        q: "If an economy is entering a recession, what action is a central bank most likely to take?",
        options: ["Increase reserve requirements", "Raise the discount rate", "Buy government bonds (Quantitative Easing)", "Sell government bonds"],
        correct: 2,
        explanation: "Buying government bonds injects cash into the banking system, increasing liquidity and lowering interest rates to stimulate business and consumer spending."
      }
    ],
    mindmap: {
      nodes: [
        { id: '1', label: 'Monetary Policy', x: 200, y: 150, type: 'root' },
        { id: '2', label: 'Objectives', x: 80, y: 80, type: 'child' },
        { id: '3', label: 'Fed Tools', x: 320, y: 80, type: 'child' },
        { id: '4', label: 'Key Indicators', x: 80, y: 220, type: 'child' },
        { id: '5', label: 'Types of Inflation', x: 320, y: 220, type: 'child' },
        { id: '6', label: 'Open Market Ops', x: 420, y: 40, type: 'grandchild' },
        { id: '7', label: 'Cost-Push vs Demand-Pull', x: 420, y: 290, type: 'grandchild' }
      ],
      connections: [
        { from: '1', to: '2' },
        { from: '1', to: '3' },
        { from: '1', to: '4' },
        { from: '1', to: '5' },
        { from: '3', to: '6' },
        { from: '5', to: '7' }
      ]
    },
    slides: [
      { title: "Understanding Inflation & GDP", content: "Inflation represents the rate at which prices rise, eroding purchasing power. Central banks seek a stable target (usually around 2%) to balance full employment with price stability." },
      { title: "The Dual Mandate of Central Banks", content: "Most central banks are tasked with a dual mandate: maintaining price stability (low inflation) and promoting maximum sustainable employment, which often conflict." },
      { title: "Unconventional Policies: QE & Guidance", content: "When standard interest rates hit zero (the zero-lower-bound), central banks pivot to Quantitative Easing and forward guidance to assure markets of long-term low borrowing costs." }
    ],
    report: `### Academic Analysis: Modern Macroeconomic Stabilisation

This paper examines the theoretical framework underlying Central Bank operations, focusing on inflation targeting, liquidity mechanisms, and transmission channels.

#### 1. Transmission Mechanisms of Monetary Policy
When a central bank alters its policy rate, the change ripples through commercial banks, capital markets, and currency exchanges.
* **Interest Rate Channel**: Lower rates reduce financing costs, increasing investment.
* **Exchange Rate Channel**: Lower domestic rates depreciate the local currency, boosting exports.
* **Asset Price Channel**: Lower rates boost equity and real estate markets, driving wealth-effects.

#### 2. The Challenges of Supply-Side Shocks
Standard monetary tools are optimized for demand-pull inflation. In cases of supply-side disruptions (e.g. energy shocks, supply chain blockages), raising interest rates to curb inflation can lead to stagflation—lowering economic activity without easily correcting global supply constraints.`
  }
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Interactive Hero 3D Rotation State
  const [heroRotation, setHeroRotation] = useState({ x: 0, y: 0 });

  // Sandbox state
  const [selectedFile, setSelectedFile] = useState(null); // 'biology', 'history', 'economics'
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeAsset, setActiveAsset] = useState('flashcards'); // active sandbox panel
  const [autoPlay, setAutoPlay] = useState(true); // Auto-play active by default

  // Sandbox Sub-component states
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Audio Player states
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(25);
  const [audioTime, setAudioTime] = useState('02:40');
  const visualizerInterval = useRef(null);
  const [visHeights, setVisHeights] = useState([10, 20, 30, 40, 35, 25, 15, 10, 20, 30, 35, 20, 10, 15, 25]);
  
  // Refs
  const audioIntervalRef = useRef(null);
  const activeData = selectedFile ? MOCK_DATA[selectedFile] : null;

  // Set theme on mount & changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Visualizer bar animation (Apple-style fluid sine-wave visualizer)
  useEffect(() => {
    if (audioPlaying) {
      let time = 0;
      visualizerInterval.current = setInterval(() => {
        time += 0.25;
        setVisHeights(prev => prev.map((_, i) => {
          // Combine two sine waves for a highly fluid undulating motion
          const wave1 = Math.sin(time + i * 0.4) * 16;
          const wave2 = Math.cos(time * 1.6 + i * 0.35) * 8;
          return Math.abs(wave1 + wave2) + 6;
        }));
      }, 75);
      
      // Simulate audio progress
      audioIntervalRef.current = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setAudioPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 500);
    } else {
      clearInterval(visualizerInterval.current);
      clearInterval(audioIntervalRef.current);
      setVisHeights([8, 12, 10, 14, 12, 10, 8, 10, 12, 14, 10, 8, 10, 12, 8]);
    }

    return () => {
      clearInterval(visualizerInterval.current);
      clearInterval(audioIntervalRef.current);
    };
  }, [audioPlaying]);

  // AUTO-PLAY CONTROLLER SYSTEM
  useEffect(() => {
    if (!autoPlay) return;

    const intervalTimer = setInterval(() => {
      if (loadingDemo) return;

      if (!selectedFile) {
        // Step 1: Auto-select Biology File
        handleSelectFile('biology');
      } else {
        // Step 2: Cycle through assets and interactions
        if (activeAsset === 'flashcards') {
          if (!flashcardFlipped) {
            setFlashcardFlipped(true); // Flip card
          } else {
            setActiveAsset('quiz'); // Go to Quiz
            setFlashcardFlipped(false);
          }
        } else if (activeAsset === 'quiz') {
          if (!quizAnswered) {
            setSelectedQuizOption(activeData.quiz[0].correct); // Auto-solve quiz
            setQuizAnswered(true);
          } else {
            setActiveAsset('mindmap'); // Go to Mindmap
          }
        } else if (activeAsset === 'mindmap') {
          setActiveAsset('podcast'); // Go to Podcast
          setAudioPlaying(true); // Start playing visualizer
        } else if (activeAsset === 'podcast') {
          setAudioPlaying(false);
          setActiveAsset('video'); // Go to Video Overview
        } else if (activeAsset === 'video') {
          setActiveAsset('slides'); // Go to Slide Deck
        } else if (activeAsset === 'slides') {
          if (currentSlide < activeData.slides.length - 1) {
            setCurrentSlide(prev => prev + 1); // Cycle through slide
          } else {
            setActiveAsset('report'); // Go to Study Report
          }
        } else if (activeAsset === 'report') {
          // End of cycle: switch topic or loop
          if (selectedFile === 'biology') {
            handleSelectFile('economics');
          } else if (selectedFile === 'economics') {
            handleSelectFile('history');
          } else {
            setSelectedFile(null); // Return to dropzone
          }
        }
      }
    }, 4500); // 4.5 seconds per step

    return () => clearInterval(intervalTimer);
  }, [autoPlay, selectedFile, loadingDemo, activeAsset, flashcardFlipped, quizAnswered, currentSlide, activeData]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Mouse move handler for Interactive 3D Hero dashboard
  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2; // Offset X from center
    const y = e.clientY - rect.top - rect.height / 2; // Offset Y from center
    
    // Calculate rotation angles (caps to max of 15 degrees)
    const factor = 12;
    setHeroRotation({
      x: -(y / rect.height) * factor,
      y: (x / rect.width) * factor
    });
  };

  const handleHeroMouseLeave = () => {
    // Reset to flat default smoothly
    setHeroRotation({ x: 0, y: 0 });
  };

  // Mock file parsing pipeline
  const handleSelectFile = (fileKey) => {
    setLoadingDemo(true);
    setLoadingStep(0);
    setSelectedFile(null);
    setQuizAnswered(false);
    setSelectedQuizOption(null);
    setCurrentFlashcard(0);
    setFlashcardFlipped(false);
    setCurrentSlide(0);
    setAudioPlaying(false);
    setAudioProgress(25);
    
    const steps = [
      "Extracting semantic content from pages...",
      "Analyzing document hierarchy and terminology...",
      "Structuring interactive flashcard pools...",
      "Drafting audio-conversational scripts...",
      "Compiling full multimedia study package..."
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current < steps.length) {
        setLoadingStep(current);
      } else {
        clearInterval(interval);
        setSelectedFile(fileKey);
        setLoadingDemo(false);
        setActiveAsset('flashcards');
      }
    }, 800);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* BACKGROUND DECORATIONS */}
      <div className="glow-blob blob-1"></div>
      <div className="glow-blob blob-2"></div>

      {/* BACKDROP BLUR OVERLAY */}
      <div className={`backdrop-blur-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>

      {/* HEADER / NAVBAR */}
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-container">
          <div className="logo" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--secondary)" />
                </linearGradient>
              </defs>
              <path d="M12 2L2 22H22L12 2Z" />
              <path d="M20 12L15 22H29L20 12Z" />
            </svg>
            Reeky Academic Hub
          </div>

          <ul className="nav-menu">
            <li><a href="#features" className="nav-link">Features</a></li>
            <li><a href="#demo" className="nav-link">Interactive Demo</a></li>
            <li><a href="#pipeline" className="nav-link">How It Works</a></li>
          </ul>

          <div className="nav-actions">
            <button className="btn-icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className="btn btn-secondary" style={{ display: 'flex' }} onClick={() => alert("Authentication and student dashboard features are currently in development by the engineering team. Try the interactive demo below!")}>
              Student Log In
            </button>
            <button className="btn-icon menu-toggle" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER NAV */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3 className="logo">Reeky Hub</h3>
          <button className="btn-icon" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <ul className="mobile-drawer-links">
          <li><a href="#features" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Features</a></li>
          <li><a href="#demo" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Interactive Demo</a></li>
          <li><a href="#pipeline" className="nav-link" onClick={() => setMobileMenuOpen(false)}>How It Works</a></li>
          <li style={{ marginTop: '2rem' }}>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setMobileMenuOpen(false); alert("Authentication features are in development."); }}>
              Sign Up
            </button>
          </li>
        </ul>
      </div>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-content">
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
              <button className="btn btn-secondary" onClick={() => { document.getElementById('pipeline').scrollIntoView({ behavior: 'smooth'}); }}>
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

          {/* 3D INTERACTIVE HERO DASHBOARD (Replacing Video 1) */}
          <div 
            className="hero-visual"
            onMouseMove={handleHeroMouseMove}
            onMouseLeave={handleHeroMouseLeave}
          >
            <div 
              className="hero-interactive-dashboard"
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

      {/* CORE FEATURES CATALOG */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-title">
            <h2>The Study <span>Media Suite</span></h2>
            <p>One document upload, eight interactive and downloadable study materials tailored to your exact learning preferences.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><Music size={24} /></div>
              <h3>Personal Study Podcast</h3>
              <p>Listen to an engaging, dialogue-style audio summary breaking down complex theories into simple concepts.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Network size={24} /></div>
              <h3>Interactive Mindmaps</h3>
              <p>Map and visualize conceptual nodes extracted from your textbook to build associative neural connections.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><BookOpen size={24} /></div>
              <h3>Smart Flashcards</h3>
              <p>Test your active recall with custom-generated digital flashcards covering key definitions and formulas.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><HelpCircle size={24} /></div>
              <h3>Self-Assessment Quizzes</h3>
              <p>Evaluate your retention with adaptive multiple-choice quizzes that provide immediate corrections and explanations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Video size={24} /></div>
              <h3>Video Overviews</h3>
              <p>Watch short video run-throughs explaining high-level concepts, ideal for visual learners.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Layers size={24} /></div>
              <h3>Slide Decks</h3>
              <p>Download clean, structured, presentation-ready slides summarizing chapters for study group review.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FileText size={24} /></div>
              <h3>Deep Study Reports</h3>
              <p>Read detailed structured reports detailing formulas, history, and structural core documentation.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><FileSpreadsheet size={24} /></div>
              <h3>Synthesized Data Tables</h3>
              <p>Review key variables, comparisons, dates, or study parameters structured in a digestible grid layout.</p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE SANDBOX DEMO */}
      <section className="demo-section" id="demo">
        <div className="container">
          <div className="section-title">
            <h2>Experience The <span>Study Sandbox</span></h2>
            <p>Select a sample document below to see our AI parser instantly construct a live, custom educational suite.</p>
          </div>

          <div className="demo-sandbox">
            <div className="sandbox-header">
              <div className="sandbox-title" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Sparkles size={20} color="var(--primary)" />
                  <span style={{ fontWeight: 700 }}>{selectedFile ? activeData.title : "Document Processor Sandbox"}</span>
                </div>
                
                {/* Auto-Play Indicator Badge / Control */}
                <button 
                  className="btn"
                  style={{
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.75rem',
                    borderRadius: '50px',
                    marginLeft: 'auto',
                    background: autoPlay ? 'var(--primary)' : 'var(--bg)',
                    color: autoPlay ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    boxShadow: autoPlay ? '0 4px 10px rgba(99, 102, 241, 0.25)' : 'none'
                  }}
                  onClick={() => setAutoPlay(!autoPlay)}
                >
                  {autoPlay ? (
                    <>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                      Auto-playing Demo
                    </>
                  ) : (
                    "▶ Resume Auto-play"
                  )}
                </button>
              </div>
              <div className="sandbox-window-dots" style={{ marginLeft: '1.5rem' }}>
                <span></span><span></span><span></span>
              </div>
            </div>

            <div className="sandbox-content">
              {/* NO FILE SELECTED: SHOW DROPZONE */}
              {!selectedFile && !loadingDemo && (
                <div className="dropzone">
                  <div className="dropzone-icon">
                    <UploadCloud size={32} />
                  </div>
                  <h3>Upload Your Academic Files</h3>
                  <p>Drop PDF, DOCX, or text files here to begin. Or, try out the demo with these sample documents:</p>
                  
                  <div className="sample-files">
                    <button className="sample-badge btn" onClick={() => { handleSelectFile('biology'); setAutoPlay(false); }}>
                      <FileText size={16} color="var(--primary)" /> Biology Cell Structure.pdf
                    </button>
                    <button className="sample-badge btn" onClick={() => { handleSelectFile('history'); setAutoPlay(false); }}>
                      <FileText size={16} color="var(--primary)" /> French Revolution.pdf
                    </button>
                    <button className="sample-badge btn" onClick={() => { handleSelectFile('economics'); setAutoPlay(false); }}>
                      <FileText size={16} color="var(--primary)" /> Monetary Policy & Inflation.pdf
                    </button>
                  </div>
                </div>
              )}

              {/* LOADING SCREEN SIMULATION */}
              {loadingDemo && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <div className="loading-text">Synthesizing Learning Assets</div>
                  <div className="loading-subtext">
                    {loadingStep === 0 && "Extracting semantic content from pages..."}
                    {loadingStep === 1 && "Analyzing document hierarchy and terminology..."}
                    {loadingStep === 2 && "Structuring interactive flashcard pools..."}
                    {loadingStep === 3 && "Drafting audio-conversational scripts..."}
                    {loadingStep === 4 && "Compiling full multimedia study package..."}
                  </div>
                </div>
              )}

              {/* DEMO DISPLAY WORKSPACE */}
              {selectedFile && !loadingDemo && (
                <div className="sandbox-workspace">
                  
                  {/* Left Sidebar Menu */}
                  <div className="sandbox-sidebar">
                    <button 
                      className={`sidebar-btn ${activeAsset === 'flashcards' ? 'active' : ''}`}
                      onClick={() => { setActiveAsset('flashcards'); setAutoPlay(false); }}
                    >
                      <BookOpen size={18} /> Flashcards
                    </button>
                    <button 
                      className={`sidebar-btn ${activeAsset === 'quiz' ? 'active' : ''}`}
                      onClick={() => { setActiveAsset('quiz'); setAutoPlay(false); }}
                    >
                      <HelpCircle size={18} /> Interactive Quiz
                    </button>
                    <button 
                      className={`sidebar-btn ${activeAsset === 'mindmap' ? 'active' : ''}`}
                      onClick={() => { setActiveAsset('mindmap'); setAutoPlay(false); }}
                    >
                      <Network size={18} /> Mindmap
                    </button>
                    <button 
                      className={`sidebar-btn ${activeAsset === 'podcast' ? 'active' : ''}`}
                      onClick={() => { setActiveAsset('podcast'); setAutoPlay(false); }}
                    >
                      <Music size={18} /> Audio Podcast
                    </button>
                    <button 
                      className={`sidebar-btn ${activeAsset === 'video' ? 'active' : ''}`}
                      onClick={() => { setActiveAsset('video'); setAutoPlay(false); }}
                    >
                      <Video size={18} /> Video Overview
                    </button>
                    <button 
                      className={`sidebar-btn ${activeAsset === 'slides' ? 'active' : ''}`}
                      onClick={() => { setActiveAsset('slides'); setAutoPlay(false); }}
                    >
                      <Layers size={18} /> Slide Deck
                    </button>
                    <button 
                      className={`sidebar-btn ${activeAsset === 'report' ? 'active' : ''}`}
                      onClick={() => { setActiveAsset('report'); setAutoPlay(false); }}
                    >
                      <FileText size={18} /> Study Report
                    </button>
                    
                    <button 
                      className="sidebar-btn" 
                      style={{ marginTop: 'auto', borderTop: '1px solid var(--divider)', color: 'var(--primary)' }}
                      onClick={() => { setSelectedFile(null); setAudioPlaying(false); setAutoPlay(false); }}
                    >
                      <ArrowLeft size={16} /> Reset Sandbox
                    </button>
                  </div>

                  {/* Main Viewer Area */}
                  <div className="sandbox-viewer">
                    
                    {/* FLASHCARDS VIEWER */}
                    {activeAsset === 'flashcards' && (
                      <div className="flashcard-demo">
                        <div 
                          className={`flashcard-inner ${flashcardFlipped ? 'flipped' : ''}`}
                          onClick={() => { setFlashcardFlipped(!flashcardFlipped); setAutoPlay(false); }}
                        >
                          <div className="flashcard">
                            <div className="card-face card-front">
                              <span className="card-category">Question {currentFlashcard + 1}</span>
                              <div className="card-text">{activeData.flashcards[currentFlashcard].q}</div>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2rem' }}>Click card to reveal answer</p>
                            </div>
                            <div className="card-face card-back">
                              <span className="card-category">Answer Explanation</span>
                              <div className="card-text" style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 }}>
                                {activeData.flashcards[currentFlashcard].a}
                              </div>
                              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '2rem' }}>Click card to return to question</p>
                            </div>
                          </div>
                        </div>

                        <div className="flashcard-controls">
                          <button 
                            className="btn-icon" 
                            disabled={currentFlashcard === 0}
                            onClick={() => { setCurrentFlashcard(prev => prev - 1); setFlashcardFlipped(false); setAutoPlay(false); }}
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                            {currentFlashcard + 1} of {activeData.flashcards.length}
                          </span>
                          <button 
                            className="btn-icon" 
                            disabled={currentFlashcard === activeData.flashcards.length - 1}
                            onClick={() => { setCurrentFlashcard(prev => prev + 1); setFlashcardFlipped(false); setAutoPlay(false); }}
                          >
                            <ArrowRight size={20} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* QUIZ VIEWER */}
                    {activeAsset === 'quiz' && (
                      <div className="quiz-demo">
                        <div className="quiz-question">
                          {activeData.quiz[0].q}
                        </div>
                        <div className="quiz-options">
                          {activeData.quiz[0].options.map((option, idx) => {
                            let optionClass = '';
                            if (quizAnswered) {
                              if (idx === activeData.quiz[0].correct) {
                                optionClass = 'correct';
                              } else if (idx === selectedQuizOption) {
                                optionClass = 'wrong';
                              }
                            }
                            return (
                              <button 
                                key={idx} 
                                className={`quiz-option ${optionClass}`}
                                disabled={quizAnswered}
                                onClick={() => {
                                  setSelectedQuizOption(idx);
                                  setQuizAnswered(true);
                                  setAutoPlay(false);
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        {quizAnswered && (
                          <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '1.5rem', marginTop: '1rem' }}>
                            <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: selectedQuizOption === activeData.quiz[0].correct ? '#27c93f' : '#ff5f56', marginBottom: '0.5rem' }}>
                              {selectedQuizOption === activeData.quiz[0].correct ? "Correct Answer!" : "Incorrect"}
                            </h4>
                            <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                              {activeData.quiz[0].explanation}
                            </p>
                            <button 
                              className="btn btn-secondary" 
                              style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                              onClick={() => {
                                setQuizAnswered(false);
                                setSelectedQuizOption(null);
                                setAutoPlay(false);
                              }}
                            >
                              Try Again
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SELF-DRAWING SVG MINDMAP (Sandbox) */}
                    {activeAsset === 'mindmap' && (
                      <div style={{ width: '100%' }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem' }}>Interactive Mindmap Graph</h3>
                        <div className="mindmap-demo">
                          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                            {/* Lines */}
                            {activeData.mindmap.connections.map((c, i) => {
                              const fromNode = activeData.mindmap.nodes.find(n => n.id === c.from);
                              const toNode = activeData.mindmap.nodes.find(n => n.id === c.to);
                              if (!fromNode || !toNode) return null;
                              return (
                                <line 
                                  key={i} 
                                  x1={fromNode.x} 
                                  y1={fromNode.y} 
                                  x2={toNode.x} 
                                  y2={toNode.y} 
                                  stroke={theme === 'dark' ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.2)'} 
                                  strokeWidth="3"
                                  className="mindmap-line"
                                />
                              );
                            })}
                          </svg>

                          {/* Nodes with spring pop animation */}
                          {activeData.mindmap.nodes.map((node) => {
                            let nodeBg = 'var(--card-bg)';
                            let nodeBorder = 'var(--card-border)';
                            let nodeColor = 'var(--text-main)';
                            
                            if (node.type === 'root') {
                              nodeBg = 'var(--primary)';
                              nodeColor = '#ffffff';
                              nodeBorder = 'transparent';
                            } else if (node.type === 'child') {
                              nodeBg = 'var(--accent-glow)';
                              nodeBorder = 'var(--primary)';
                            }

                            return (
                              <div 
                                key={node.id} 
                                className="mindmap-node-container"
                                style={{
                                  left: node.x,
                                  top: node.y,
                                  animationDelay: `${parseInt(node.id) * 0.15}s`
                                }}
                              >
                                <div 
                                  style={{
                                    background: nodeBg,
                                    border: `1px solid ${nodeBorder}`,
                                    color: nodeColor,
                                    borderRadius: '20px',
                                    padding: '0.4rem 1rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => { alert(`Node focus: "${node.label}"`); setAutoPlay(false); }}
                                >
                                  {node.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* PODCAST VIEWER */}
                    {activeAsset === 'podcast' && (
                      <div className="podcast-demo">
                        <div className={`podcast-disc ${audioPlaying ? 'playing' : ''}`}></div>
                        
                        <div className="podcast-info">
                          <h3>{activeData.tagline}</h3>
                          <p>Episode 1: Core Concept Breakdown</p>
                        </div>

                        {/* Animated Sound Wave visualizer */}
                        <div className="podcast-visualizer">
                          {visHeights.map((h, i) => (
                            <div 
                              key={i} 
                              className="vis-bar" 
                              style={{ 
                                height: `${h}px`,
                                background: i % 2 === 0 ? 'var(--primary)' : 'var(--secondary)'
                              }}
                            />
                          ))}
                        </div>

                        {/* Audio Controls bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '360px' }}>
                          <div style={{ display: 'flex', width: '100%', justify: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            <span>01:12</span>
                            <span>{audioTime}</span>
                          </div>
                          
                          {/* Simulated Slider Track */}
                          <div style={{ width: '100%', height: '6px', background: 'var(--divider)', borderRadius: '50px', position: 'relative', cursor: 'pointer' }}>
                            <div style={{ width: `${audioProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '50px' }}></div>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', position: 'absolute', top: '-3px', left: `calc(${audioProgress}% - 6px)` }}></div>
                          </div>

                          <div className="podcast-controls" style={{ marginTop: '0.5rem' }}>
                            <button className="btn-icon" onClick={() => { setAudioMuted(!audioMuted); setAutoPlay(false); }}>
                              {audioMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <button 
                              className="btn btn-primary" 
                              style={{ width: '56px', height: '56px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center' }}
                              onClick={() => { setAudioPlaying(!audioPlaying); setAutoPlay(false); }}
                            >
                              {audioPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
                            </button>
                            <button className="btn-icon" onClick={() => { alert("Rewinding 10 seconds"); setAutoPlay(false); }}>
                              <RotateCw size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIDEO OVERVIEW */}
                    {activeAsset === 'video' && (
                      <div className="video-demo">
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem' }}>Synthesized Video Overview</h3>
                        <div className="video-wrapper" style={{ border: '1px solid var(--card-border)', borderRadius: '20px' }}>
                          <video src="/video3.mp4" controls autoPlay loop muted playsInline />
                        </div>
                      </div>
                    )}

                    {/* SLIDES VIEWER */}
                    {activeAsset === 'slides' && (
                      <div className="slides-demo">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="slide-number">Slide {currentSlide + 1} of {activeData.slides.length}</span>
                          <span style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 700 }}>Reeky Hub Presentation</span>
                        </div>
                        
                        <div style={{ margin: '1.5rem 0' }}>
                          <h3 className="slide-title">{activeData.slides[currentSlide].title}</h3>
                          <p className="slide-content">{activeData.slides[currentSlide].content}</p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                            disabled={currentSlide === 0}
                            onClick={() => { setCurrentSlide(prev => prev - 1); setAutoPlay(false); }}
                          >
                            Previous
                          </button>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                            disabled={currentSlide === activeData.slides.length - 1}
                            onClick={() => { setCurrentSlide(prev => prev + 1); setAutoPlay(false); }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}

                    {/* REPORT VIEWER */}
                    {activeAsset === 'report' && (
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--divider)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem' }}>Study Synthesis Report</h3>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => { alert("Downloading PDF summary report..."); setAutoPlay(false); }}>
                            Download PDF
                          </button>
                        </div>
                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                          {activeData.report}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / PIPELINE SHOWCASE */}
      <section className="pipeline-section" id="pipeline">
        <div className="container">
          <div className="section-title">
            <h2>The <span>Synthesis Pipeline</span></h2>
            <p>From textbook to personalized study ecosystem in three seamless steps.</p>
          </div>

          <div className="pipeline-grid">
            {/* GLASSMORPHIC AI PIPELINE CORE (Replacing Video 2) */}
            <div className="pipeline-portal-visual">
              <div className="portal-container">
                <div className="portal-doc-input">
                  <FileText size={32} />
                </div>
                <div className="portal-core">
                  <div className="portal-core-ring"></div>
                  <div className="portal-core-inner">
                    <Sparkles size={32} />
                  </div>
                </div>
                <div className="portal-outputs">
                  <div className="portal-out-card"><Music size={20} /></div>
                  <div className="portal-out-card"><HelpCircle size={20} /></div>
                  <div className="portal-out-card"><Network size={20} /></div>
                </div>
              </div>
            </div>

            <div className="pipeline-steps">
              <div className="pipeline-step">
                <div className="step-num">1</div>
                <div className="step-content">
                  <h3>Document Upload</h3>
                  <p>Drop your lecture notes, textbook chapters, or academic papers into the platform. We support standard formats including PDF, DOCX, and plain text.</p>
                </div>
              </div>
              <div className="pipeline-step">
                <div className="step-num">2</div>
                <div className="step-content">
                  <h3>Tailored Generation</h3>
                  <p>Set custom learning preferences (e.g. "Focus on equations", "Explain in simple terms"). The engine parses headings, extracts context, and generates 8 study assets.</p>
                </div>
              </div>
              <div className="pipeline-step">
                <div className="step-num">3</div>
                <div className="step-content">
                  <h3>Interactive Portal</h3>
                  <p>Access your personal learning ecosystem. Flip flashcards, take quizzes, print slides, or listen to the AI-generated study podcast on your mobile device.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BOX */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-box">
            <h2>Transform Your Studying Today</h2>
            <p>Ready to synthesize your lecture notes and speed up your revision? Register your student account and begin generating your customized study suite immediately.</p>
            <button className="btn btn-primary" onClick={() => alert("Signing up is currently closed for preview. Feel free to play with the study sandbox!")}>
              Create Student Account <Sparkles size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col footer-about">
              <div className="logo" style={{ marginBottom: '1rem' }}>Reeky Academic Hub</div>
              <p>An AI-driven educational tool designed to transform static study materials into interactive, auditory, and visual media ecosystems.</p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#demo">Study Sandbox</a></li>
                <li><a href="#pipeline">The Pipeline</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Technology</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Running Express.js and MySQL on the core backend."); }}>Core API</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Powered by FastAPI, Celery, and custom scraping algorithms."); }}>Asset Engine</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Admin dashboard built with React + Cloudinary integration."); }}>Admin portal</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <ul>
                <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Contact: support@reekyhub.edu"); }}>Contact Email</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Terms of Service details."); }}>Terms of Service</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); alert("Privacy Policy guidelines."); }}>Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Reeky Academic Hub. All rights reserved.</p>
            <p style={{ display: 'flex', gap: '1rem' }}>
              <span>Made with ❤️ for students</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
