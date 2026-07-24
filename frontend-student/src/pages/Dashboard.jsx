import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import OnboardingForm from './OnboardingForm';
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
  RotateCw, 
  BookOpen, 
  VolumeX, 
  Music, 
  ChevronRight, 
  Download, 
  Compass, 
  Layers, 
  Network,
  Grid
} from 'lucide-react';

export default function Dashboard() {
  const { user, token, logout, updatePreferences, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [uploadMode, setUploadMode] = useState('file');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [userAssets, setUserAssets] = useState([]);
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Selective Generation configurations
  const [customInstructions, setCustomInstructions] = useState('');
  const [showGenerationOptions, setShowGenerationOptions] = useState(false);
  const [assetsRequested, setAssetsRequested] = useState({
    podcast: true,
    flashcards: true,
    quiz: true,
    mindmap: true,
    slides: true,
    report: true
  });

  // Sandbox Workspace States
  const [activeAsset, setActiveAsset] = useState('podcast');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioTime, setAudioTime] = useState('00:00');
  const [visHeights, setVisHeights] = useState([12, 28, 42, 21, 35, 49, 28, 14, 35, 42, 21, 30, 45, 15, 25]);
  const [activeTranscriptIndex, setActiveTranscriptIndex] = useState(0);

  // Flashcards States
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [deckMastery, setDeckMastery] = useState(0);

  // Quiz States
  const [quizStep, setQuizStep] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);

  // Slides States
  const [currentSlide, setCurrentSlide] = useState(0);

  const activeLineRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/');
    }
  };

  const fetchUserAssets = useCallback(async () => {
    if (!token) return;
    setFetchingAssets(true);
    try {
      const assets = await api.getAssets(token);
      setUserAssets(assets || []);
    } catch {
      // silently fail
    } finally {
      setFetchingAssets(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) fetchUserAssets();
  }, [isAuthenticated, fetchUserAssets]);

  // Handle Synced Audio Simulation
  useEffect(() => {
    if (audioPlaying) {
      timerRef.current = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setAudioPlaying(false);
            clearInterval(timerRef.current);
            return 0;
          }
          const nextVal = prev + 1;
          
          // Animate visualizer bars
          setVisHeights(prevBar => prevBar.map(() => Math.floor(Math.random() * 40) + 10));

          // Set time format
          const totalSeconds = Math.floor((nextVal / 100) * 124); // mock 2m 04s total
          const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
          const secs = (totalSeconds % 60).toString().padStart(2, '0');
          setAudioTime(`${mins}:${secs}`);

          // Transcript line offset mapper
          const percentSegment = 100 / (activeData?.transcript?.length || 1);
          const currentIdx = Math.floor(nextVal / percentSegment);
          setActiveTranscriptIndex(Math.min(currentIdx, (activeData?.transcript?.length || 1) - 1));

          return nextVal;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [audioPlaying]);

  // Scroll transcript index into focus
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeTranscriptIndex]);

  const handlePdfUrlSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!pdfUrl.trim() || !token) return;
    setIsSubmittingUrl(true);
    try {
      const title = pdfUrl.split('/').pop() || 'Untitled Document';
      const requested = Object.keys(assetsRequested).filter(k => assetsRequested[k]);
      await api.generateAssets(title, pdfUrl.trim(), customInstructions, requested, token);
      setPdfUrl('');
      setCustomInstructions('');
      await fetchUserAssets();
      alert('Assets successfully requested! Wait for Aris and the Admin to complete synthesis.');
    } catch (err) {
      alert('Failed to queue: ' + err.message);
    } finally {
      setIsSubmittingUrl(false);
    }
  }, [pdfUrl, token, assetsRequested, customInstructions, fetchUserAssets]);

  const openUploadWidget = () => {
    if (!window.cloudinary) return;
    setIsUploading(true);
    setUploadProgress('Opening upload dialog...');
    window.cloudinary.createUploadWidget(
      {
        cloudName: 'x9lbk1ea',
        uploadPreset: 'Reeky Academic Hub',
        sources: ['local', 'url', 'camera'],
        multiple: false,
        maxFileSize: 50000000,
        accept: 'application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      (error, result) => {
        if (error) {
          setIsUploading(false);
          setUploadProgress(null);
          console.error('Upload error', error);
          return;
        }
        if (result.event === 'close') {
          setIsUploading(false);
          setUploadProgress(null);
          return;
        }
        if (result.event === 'success') {
          const fileUrl = result.info.secure_url;
          const fileName = result.info.original_filename || 'Uploaded Document';
          setUploadProgress('File uploaded. Queuing generation...');
          const requested = Object.keys(assetsRequested).filter(k => assetsRequested[k]);
          api.generateAssets(fileName, fileUrl, customInstructions, requested, token)
            .then(() => {
              setUploadProgress(null);
              setIsUploading(false);
              setCustomInstructions('');
              fetchUserAssets();
              alert('Uploaded successfully! Process is queued.');
            })
            .catch(err => {
              setUploadProgress(null);
              setIsUploading(false);
              alert('Failed to queue: ' + err.message);
            });
        }
      }
    ).open();
  };

  const completedAssets = userAssets.filter(a => a.status === 'COMPLETED');
  const pendingAssets = userAssets.filter(a => a.status !== 'COMPLETED');

  const parseDataTable = (tableStr) => {
    if (!tableStr || typeof tableStr !== 'string') return null;
    const lines = tableStr.trim().split('\n');
    if (lines.length === 0) return null;

    // Detect markdown table
    if (lines[0].includes('|')) {
      const parseRow = (line) => line.split('|').map(cell => cell.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      const headers = parseRow(lines[0]);
      // Skip formatting row (e.g. |---|---|)
      const dataLines = lines.slice(1).filter(line => !line.match(/^[|:\s-]+$/) && line.trim() !== '');
      const rows = dataLines.map(parseRow);
      return { headers, rows };
    }

    // Detect CSV
    const parseCSVRow = (line) => line.split(',').map(cell => cell.trim());
    const headers = parseCSVRow(lines[0]);
    const rows = lines.slice(1).filter(line => line.trim() !== '').map(parseCSVRow);
    return { headers, rows };
  };

  const buildActiveData = (asset) => {
    if (!asset || !asset.assets) return null;
    let a = typeof asset.assets === 'string' ? JSON.parse(asset.assets) : asset.assets;
    
    // Unwrap from Python backend nested structure if it exists
    if (a.interactive_assets) {
      a = { ...a, ...a.interactive_assets };
    }
    
    // Parse slides dynamically if it's a string pasted by the admin
    let parsedSlides = [];
    if (Array.isArray(a.slides) && a.slides.length > 0) {
      parsedSlides = a.slides;
    } else if (a.slide_deck && typeof a.slide_deck === 'string') {
      const parts = a.slide_deck.split(/(?:^|\n)---(?:\n|$)/);
      parsedSlides = parts.map((p, idx) => {
        const lines = p.trim().split('\n');
        const title = lines[0]?.replace(/^#+\s*/, '') || `Slide ${idx + 1}`;
        const content = lines.slice(1).join('\n');
        return { title, content };
      }).filter(s => s.content.trim() !== '' || s.title.trim() !== '');
    } else if (typeof a.slide_deck === 'object' && Array.isArray(a.slide_deck)) {
      parsedSlides = a.slide_deck;
    }

    return {
      title: asset.title || 'Untitled Document',
      tagline: a.tagline || 'AI-Generated Study Suite',
      flashcards: Array.isArray(a.flashcards) ? a.flashcards : [],
      quiz: Array.isArray(a.quizzes?.quiz) ? a.quizzes.quiz : (Array.isArray(a.quiz) ? a.quiz : []),
      mindmap: a.mindmap || { nodes: [], connections: [] },
      slides: parsedSlides,
      report: a.study_report || a.report || '',
      data_table: a.data_table || null,
      transcript: Array.isArray(a.transcript) ? a.transcript : [],
    };
  };

  const activeData = selectedAsset ? buildActiveData(selectedAsset) : null;

  const downloadReportPdf = () => {
    if (!activeData?.report) return;
    const doc = new jsPDF();
    const title = activeData.title || 'Study Report';
    doc.setFontSize(18);
    doc.text(title, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(activeData.report, 180);
    let y = 35;
    for (const line of lines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, 15, y);
      y += 7;
    }
    doc.save(`${title.replace(/\.[^/.]+$/, '')}-report.pdf`);
  };

  const handleSpacedRepetition = (rating) => {
    let weight = 0;
    if (rating === 'easy') weight = 25;
    else if (rating === 'medium') weight = 15;
    else weight = 5;

    setDeckMastery(prev => Math.min(100, prev + weight));
    if (currentFlashcard < activeData.flashcards.length - 1) {
      setCurrentFlashcard(prev => prev + 1);
      setFlashcardFlipped(false);
    } else {
      alert('Congratulations! You finished studying all flashcards in this deck! 🎉');
      setCurrentFlashcard(0);
      setFlashcardFlipped(false);
    }
  };

  // If user has not completed onboarding preferences form, block dashboard and show it!
  if (user && !user.preferences) {
    return <OnboardingForm token={token} onComplete={updatePreferences} />;
  }

  if (!isAuthenticated) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Mini Navbar */}
      <header className="navbar" style={{ position: 'sticky' }}>
        <div className="container nav-container">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M12 2L2 22H22L12 2Z" stroke="var(--primary)" fill="none" />
              <path d="M20 12L15 22H29L20 12Z" stroke="var(--secondary)" fill="none" />
            </svg>
            Reeky Academic Hub
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
              Tutee: {user?.preferences?.name || user?.name}
            </span>
            <button className="btn btn-secondary" style={{ display: 'flex' }} onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
        
        {/* Upload & Preference Form */}
        <div className="dashboard-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>
            Start A New Chapter
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              className={uploadMode === 'file' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.4rem 1.25rem' }}
              onClick={() => setUploadMode('file')}
            >
              Upload from Device
            </button>
            <button
              className={uploadMode === 'url' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.4rem 1.25rem' }}
              onClick={() => setUploadMode('url')}
            >
              Paste URL
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 1.25rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => setShowGenerationOptions(!showGenerationOptions)}
            >
              {showGenerationOptions ? 'Hide Custom Options' : 'Configure Formats & Topics'}
            </button>
          </div>

          {/* Selective Options Dropdown Drawer */}
          {showGenerationOptions && (
            <div style={{
              background: 'var(--bg)',
              border: '1.5px solid var(--card-border)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
                Selective Formats (Uncheck what you don't need)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { id: 'podcast', label: 'Audio Podcast' },
                  { id: 'flashcards', label: 'Flashcards Decks' },
                  { id: 'quiz', label: 'Adaptive Quizzes' },
                  { id: 'mindmap', label: 'Concept Mindmaps' },
                  { id: 'slides', label: 'Slide Presentations' },
                  { id: 'report', label: 'Study Reports' }
                ].map(item => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assetsRequested[item.id]}
                      onChange={e => setAssetsRequested(prev => ({ ...prev, [item.id]: e.target.checked }))}
                      style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                    />
                    {item.label}
                  </label>
                ))}
              </div>

              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                Additional Notes / Topic Focus
              </h4>
              <textarea
                className="auth-input"
                placeholder="E.g. Focus on Section 3, explain in ELIF5 style, emphasize formulas, or ignore pages 10-15..."
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                style={{
                  minHeight: '80px',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          )}

          {/* File dropzone upload */}
          {uploadMode === 'file' && (
            <div
              onClick={!isUploading ? openUploadWidget : undefined}
              style={{
                border: '2px dashed var(--card-border)',
                borderRadius: '20px',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                cursor: isUploading ? 'wait' : 'pointer',
                transition: 'border-color 0.25s',
                background: 'var(--card-bg)',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
            >
              {!isUploading && !uploadProgress && (
                <>
                  <UploadCloud size={48} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '1rem' }}>Click to drop textbook file</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, DOCX, or TXT (Max 50MB)</p>
                </>
              )}
              {isUploading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {uploadProgress || 'Uploading...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* URL input */}
          {uploadMode === 'url' && (
            <form onSubmit={handlePdfUrlSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="auth-input"
                type="url"
                placeholder="Paste literature PDF URL to customize and generate..."
                value={pdfUrl}
                onChange={e => setPdfUrl(e.target.value)}
                style={{ flex: 1, padding: '0.75rem 1rem' }}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={isSubmittingUrl || !pdfUrl.trim()}>
                {isSubmittingUrl ? 'Queuing...' : 'Generate Suite'}
              </button>
            </form>
          )}
        </div>

        {/* Assets Overview Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3.2fr', gap: '2rem' }}>
          
          {/* Sidebar selector */}
          <div>
            <div className="dashboard-card" style={{ padding: '1.25rem', minHeight: '400px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', borderBottom: '1px solid var(--divider)', paddingBottom: '0.5rem' }}>
                Study Cabinets
              </h4>

              {fetchingAssets && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading...</p>}

              {!fetchingAssets && userAssets.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Your cabinets are empty! Paste a PDF URL or drop a document to build one.
                </p>
              )}

              {completedAssets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>DIGESTED</p>
                  {completedAssets.map(asset => (
                    <button
                      key={asset.id}
                      className="sample-badge btn"
                      style={{
                        borderColor: selectedAsset?.id === asset.id ? 'var(--primary)' : 'var(--card-border)',
                        background: selectedAsset?.id === asset.id ? 'var(--accent-glow)' : 'var(--card-bg)',
                        color: selectedAsset?.id === asset.id ? 'var(--primary)' : 'var(--text-main)',
                        width: '100%', justifyContent: 'flex-start', textAlign: 'left',
                        fontSize: '0.8rem', fontWeight: 700, padding: '0.6rem 0.8rem',
                        borderRadius: '12px'
                      }}
                      onClick={() => {
                        setSelectedAsset(asset);
                        setCurrentFlashcard(0);
                        setFlashcardFlipped(false);
                        setQuizStep(0);
                        setQuizScore(0);
                        setQuizFinished(false);
                        setQuizAnswered(false);
                        setSelectedQuizOption(null);
                        setAudioPlaying(false);
                        setAudioProgress(0);
                        setAudioTime('00:00');
                        const data = buildActiveData(asset);
                        const available = [
                          { id: 'podcast', show: data?.transcript?.length > 0 },
                          { id: 'flashcards', show: data?.flashcards?.length > 0 },
                          { id: 'quiz', show: data?.quiz?.length > 0 },
                          { id: 'mindmap', show: data?.mindmap?.nodes?.length > 0 },
                          { id: 'slides', show: data?.slides?.length > 0 },
                          { id: 'table', show: !!data?.data_table },
                          { id: 'report', show: !!data?.report }
                        ].find(t => t.show);
                        
                        setActiveAsset(available ? available.id : 'podcast');
                      }}
                    >
                      📚 {asset.title.length > 22 ? asset.title.slice(0, 22) + '...' : asset.title}
                    </button>
                  ))}
                </div>
              )}

              {pendingAssets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>PROCESSING / QUEUED</p>
                  {pendingAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="sample-badge btn"
                      style={{
                        borderColor: 'var(--card-border)',
                        width: '100%',
                        justifyContent: 'flex-start',
                        opacity: 0.6,
                        cursor: 'default',
                        fontSize: '0.8rem',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '12px'
                      }}
                    >
                      ⏳ {asset.title.length > 18 ? asset.title.slice(0, 18) + '...' : asset.title}
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--primary)' }}>
                        {asset.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Study Sandbox Workspace */}
          <div>
            {!selectedAsset && (
              <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center', opacity: 0.8 }}>
                <Sparkles size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  Open A Study Cabinet
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '340px', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  Select one of your completed documents in the left cabinet to load your custom interactive flashcards, quizzes, podcasts, and mindmaps.
                </p>
              </div>
            )}

            {selectedAsset && activeData && (
              <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                
                {/* Header Sandbox Bar */}
                <div style={{
                  padding: '1.25rem 2rem',
                  borderBottom: '1px solid var(--divider)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--card-bg)'
                }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>
                      {activeData.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {activeData.tagline}
                    </p>
                  </div>

                  {/* Tab Selector Toolbar */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {[
                      { id: 'podcast', label: 'Podcast', icon: <Music size={14} />, show: activeData.transcript && activeData.transcript.length > 0 },
                      { id: 'flashcards', label: 'Flashcards', icon: <Layers size={14} />, show: activeData.flashcards && activeData.flashcards.length > 0 },
                      { id: 'quiz', label: 'Quiz', icon: <HelpCircle size={14} />, show: activeData.quiz && activeData.quiz.length > 0 },
                      { id: 'mindmap', label: 'Mindmap', icon: <Network size={14} />, show: activeData.mindmap && activeData.mindmap.nodes && activeData.mindmap.nodes.length > 0 },
                      { id: 'slides', label: 'Slides', icon: <Compass size={14} />, show: activeData.slides && activeData.slides.length > 0 },
                      { id: 'table', label: 'Data Table', icon: <Grid size={14} />, show: !!activeData.data_table },
                      { id: 'report', label: 'Summary', icon: <FileText size={14} />, show: !!activeData.report }
                    ].filter(tab => tab.show).map(tab => (
                      <button
                        key={tab.id}
                        className={activeAsset === tab.id ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '8px' }}
                        onClick={() => {
                          setActiveAsset(tab.id);
                          setAudioPlaying(false); // Pause podcast simulation on switch
                        }}
                      >
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Workspace Renderer */}
                <div style={{ padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* 1. AUDITORY PODCAST VIEWER */}
                  {activeAsset === 'podcast' && activeData.transcript.length > 0 && (
                    <div className="podcast-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2.5rem', width: '100%' }}>
                      
                      {/* Audio Disk Controller */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div 
                          className={`podcast-disc ${audioPlaying ? 'playing' : ''}`}
                          style={{
                            width: '130px',
                            height: '130px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #1e293b 30%, #03050c 70%)',
                            border: '6px solid var(--primary)',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg)', border: '2px dashed var(--secondary)' }} />
                        </div>
                        <h4 style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Personal Study Podcast</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Episode 1: Core Content Scrape</p>

                        {/* Audio Waveform Bars */}
                        <div className="podcast-visualizer" style={{ display: 'flex', gap: '4px', height: '60px', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                          {visHeights.map((h, i) => (
                            <div 
                              key={i} 
                              style={{ 
                                width: '4px', 
                                height: audioPlaying ? `${h}px` : '8px', 
                                background: i % 2 === 0 ? 'var(--primary)' : 'var(--secondary)',
                                borderRadius: '10px',
                                transition: 'height 0.15s ease'
                              }} 
                            />
                          ))}
                        </div>

                        {/* Player Controls */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            <span>{audioTime}</span>
                            <span>02:04</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--divider)', borderRadius: '50px', position: 'relative', cursor: 'pointer' }}>
                            <div style={{ width: `${audioProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '50px' }}></div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setAudioMuted(!audioMuted)}>
                              {audioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <button 
                              className="btn btn-primary" 
                              style={{ width: '42px', height: '42px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center' }}
                              onClick={() => setAudioPlaying(!audioPlaying)}
                            >
                              {audioPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => { setAudioProgress(0); setAudioTime('00:00'); setActiveTranscriptIndex(0); }}>
                              <RotateCw size={16} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sync Scrolling Transcript */}
                      <div className="podcast-transcript-panel" style={{
                        height: '320px',
                        overflowY: 'auto',
                        border: '1px solid var(--card-border)',
                        borderRadius: '16px',
                        padding: '1rem',
                        background: 'var(--bg)'
                      }}>
                        {activeData.transcript.map((line, idx) => (
                          <div 
                            key={idx}
                            ref={idx === activeTranscriptIndex ? activeLineRef : null}
                            style={{
                              padding: '0.75rem',
                              borderRadius: '10px',
                              marginBottom: '0.5rem',
                              background: idx === activeTranscriptIndex ? 'var(--accent-glow)' : 'transparent',
                              border: idx === activeTranscriptIndex ? '1px solid var(--primary)' : '1px solid transparent',
                              transition: 'all 0.3s'
                            }}
                          >
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '0.15rem' }}>
                              {line.speaker}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: idx === activeTranscriptIndex ? 'var(--text-main)' : 'var(--text-muted)', lineHeight: 1.4 }}>
                              {line.text}
                            </span>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                  {/* 2. ACTIVE RECALL 3D FLASHCARD FLIPPER */}
                  {activeAsset === 'flashcards' && activeData.flashcards.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      
                      {/* Mastery Ring Indicator bar */}
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '440px', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Mastery Score: {deckMastery}%
                        </span>
                        <div style={{ width: '60%', height: '8px', background: 'var(--divider)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${deckMastery}%`, height: '100%', background: 'var(--secondary)', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </div>
                      </div>

                      {/* 3D Card Stage */}
                      <div className="card-stage" style={{ width: '100%', maxWidth: '440px', height: '260px', position: 'relative', marginBottom: '2rem' }}>
                        <div 
                          className={`card-inner ${flashcardFlipped ? 'is-flipped' : ''}`}
                          onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                          style={{
                            width: '100%',
                            height: '100%',
                            transformStyle: 'preserve-3d',
                            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: 'pointer'
                          }}
                        >
                          {/* Front Face */}
                          <div className="card-face card-front" style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            background: 'var(--card-bg)',
                            border: '2px solid var(--primary)',
                            borderRadius: '20px',
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            boxShadow: 'var(--card-shadow)'
                          }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                              Question {currentFlashcard + 1} of {activeData.flashcards.length}
                            </span>
                            <p style={{ fontSize: '1rem', fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
                              {activeData.flashcards[currentFlashcard].q}
                            </p>
                            <span style={{ position: 'absolute', bottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Click card to flip and view answer
                            </span>
                          </div>

                          {/* Back Face */}
                          <div className="card-face card-back" style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: 'var(--card-bg)',
                            border: '2px solid var(--secondary)',
                            borderRadius: '20px',
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            boxShadow: 'var(--card-shadow)'
                          }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                              Answer Explanation
                            </span>
                            <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, lineHeight: 1.5, color: 'var(--text-main)' }}>
                              {activeData.flashcards[currentFlashcard].a}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Confidence Rating Buttons */}
                      {flashcardFlipped ? (
                        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '440px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, borderColor: 'var(--error)', color: 'var(--error)', background: 'var(--error-glow)' }}
                            onClick={() => handleSpacedRepetition('again')}
                          >
                            ↺ Again
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, borderColor: '#f59e0b', color: '#f59e0b', background: 'rgba(245,158,11,0.05)' }}
                            onClick={() => handleSpacedRepetition('medium')}
                          >
                            ↓ Hard
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1, background: 'var(--secondary)', borderColor: 'var(--secondary)' }}
                            onClick={() => handleSpacedRepetition('easy')}
                          >
                            ✦ Easy
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <button
                            className="btn-icon"
                            disabled={currentFlashcard === 0}
                            onClick={() => { setCurrentFlashcard(prev => prev - 1); setFlashcardFlipped(false); }}
                          >
                            <ArrowLeft size={18} />
                          </button>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                            Card {currentFlashcard + 1} of {activeData.flashcards.length}
                          </span>
                          <button
                            className="btn-icon"
                            disabled={currentFlashcard === activeData.flashcards.length - 1}
                            onClick={() => { setCurrentFlashcard(prev => prev + 1); setFlashcardFlipped(false); }}
                          >
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. STEPPED QUIZ PLAYER */}
                  {activeAsset === 'quiz' && activeData.quiz.length > 0 && (
                    <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
                      {!quizFinished ? (
                        <>
                          {/* Segmented Progress Pills */}
                          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.5rem', height: '6px' }}>
                            {activeData.quiz.map((_, i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  background: i < quizStep ? 'var(--secondary)' : i === quizStep ? 'var(--primary)' : 'var(--divider)',
                                  borderRadius: '4px',
                                  transition: 'background 0.3s'
                                }}
                              />
                            ))}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.75rem' }}>
                            <span>QUESTION {quizStep + 1} OF {activeData.quiz.length}</span>
                            <span>SCORE: {quizScore}</span>
                          </div>

                          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.4, marginBottom: '1.5rem' }}>
                            {activeData.quiz[quizStep].q}
                          </h3>

                          {/* Options list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {activeData.quiz[quizStep].options.map((option, idx) => {
                              let optionBg = 'var(--card-bg)';
                              let optionBorder = 'var(--card-border)';
                              let optionColor = 'var(--text-main)';

                              if (quizAnswered) {
                                if (idx === activeData.quiz[quizStep].correct) {
                                  optionBg = 'var(--success-glow)';
                                  optionBorder = 'var(--success)';
                                  optionColor = 'var(--success)';
                                } else if (idx === selectedQuizOption) {
                                  optionBg = 'var(--error-glow)';
                                  optionBorder = 'var(--error)';
                                  optionColor = 'var(--error)';
                                }
                              }

                              return (
                                <button
                                  key={idx}
                                  disabled={quizAnswered}
                                  onClick={() => {
                                    setSelectedQuizOption(idx);
                                    setQuizAnswered(true);
                                    if (idx === activeData.quiz[quizStep].correct) {
                                      setQuizScore(prev => prev + 1);
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '16px',
                                    background: optionBg,
                                    border: `1.5px solid ${optionBorder}`,
                                    color: optionColor,
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    textAlign: 'left',
                                    cursor: quizAnswered ? 'default' : 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  {option}
                                  {quizAnswered && idx === activeData.quiz[quizStep].correct && <span style={{ color: 'var(--success)' }}>✓</span>}
                                  {quizAnswered && idx === selectedQuizOption && idx !== activeData.quiz[quizStep].correct && <span style={{ color: 'var(--error)' }}>✗</span>}
                                </button>
                              );
                            })}
                          </div>

                          {/* Slide up Feedback Drawer */}
                          {quizAnswered && (
                            <div style={{
                              background: 'var(--bg)',
                              border: '1.5px solid var(--card-border)',
                              borderRadius: '20px',
                              padding: '1.5rem',
                              boxShadow: 'var(--card-shadow)'
                            }}>
                              <h4 style={{
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                color: selectedQuizOption === activeData.quiz[quizStep].correct ? 'var(--success)' : 'var(--error)',
                                marginBottom: '0.5rem'
                              }}>
                                {selectedQuizOption === activeData.quiz[quizStep].correct ? '🌟 Perfect! Correct!' : '🎯 Close, but not quite!'}
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                                {activeData.quiz[quizStep].explanation}
                              </p>
                              <button
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                onClick={() => {
                                  if (quizStep < activeData.quiz.length - 1) {
                                    setQuizStep(prev => prev + 1);
                                    setQuizAnswered(false);
                                    setSelectedQuizOption(null);
                                  } else {
                                    setQuizFinished(true);
                                  }
                                }}
                              >
                                {quizStep < activeData.quiz.length - 1 ? 'Next Question' : 'Complete Quiz'}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Circular Scorecard summary */
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                          <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.5rem' }}>
                            <svg width="100" height="100" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--divider)" strokeWidth="6" />
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="42" 
                                fill="none" 
                                stroke="var(--secondary)" 
                                strokeWidth="6" 
                                strokeDasharray="264"
                                strokeDashoffset={264 - (264 * (quizScore / activeData.quiz.length))}
                                strokeLinecap="round"
                                transform="rotate(-90 50 50)"
                              />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem' }}>
                              {Math.round((quizScore / activeData.quiz.length) * 100)}%
                            </div>
                          </div>

                          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.5rem' }}>
                            Quiz Completed!
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            You scored {quizScore} out of {activeData.quiz.length} correctly.
                          </p>

                          <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '1rem', border: '1px solid var(--card-border)', fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                            {quizScore === activeData.quiz.length ? (
                              "🎉 Perfect score! Aris is extremely proud of you. Let's study the mindmap or try another chapter!"
                            ) : (
                              "📚 Good attempt! We recommend reviewing the generated Study Report to patch up your gaps."
                            )}
                          </div>

                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            onClick={() => {
                              setQuizStep(0);
                              setQuizScore(0);
                              setQuizFinished(false);
                              setQuizAnswered(false);
                              setSelectedQuizOption(null);
                            }}
                          >
                            Restart Quiz
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. INTERACTIVE MINDMAP EXPLORER */}
                  {activeAsset === 'mindmap' && activeData.mindmap.nodes.length > 0 && (
                    <div style={{ width: '100%', height: '360px', position: 'relative', border: '1px solid var(--card-border)', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg)' }}>
                      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
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
                              stroke="var(--primary)" 
                              strokeWidth="2"
                              strokeOpacity="0.4"
                              style={{ strokeDasharray: '4 4' }}
                            />
                          );
                        })}
                      </svg>

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
                            style={{
                              position: 'absolute',
                              left: `${node.x}px`,
                              top: `${node.y}px`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: 1
                            }}
                          >
                            <div 
                              style={{
                                background: nodeBg,
                                border: `1px solid ${nodeBorder}`,
                                color: nodeColor,
                                borderRadius: '20px',
                                padding: '0.4rem 1rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                              }}
                              onClick={() => alert(`Node Concept: "${node.label}"\nFocus category set.`)}
                            >
                              {node.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 5. SLIDE DECK VIEWER */}
                  {activeAsset === 'slides' && activeData.slides.length > 0 && (
                    <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.5rem' }}>
                        <span>SLIDE {currentSlide + 1} OF {activeData.slides.length}</span>
                        <span>REEKY ACADEMIC SUITE</span>
                      </div>

                      <div style={{
                        background: 'var(--card-bg)',
                        border: '1.5px solid var(--card-border)',
                        borderRadius: '24px',
                        padding: '2.5rem 2rem',
                        minHeight: '180px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                        boxShadow: 'var(--card-shadow)'
                      }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                          {activeData.slides[currentSlide].title}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {activeData.slides[currentSlide].content}
                        </p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          disabled={currentSlide === 0}
                          onClick={() => setCurrentSlide(prev => prev - 1)}
                        >
                          Previous
                        </button>
                        <button 
                          className="btn btn-primary" 
                          disabled={currentSlide === activeData.slides.length - 1}
                          onClick={() => setCurrentSlide(prev => prev + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 6. SUMMARY REPORT VIEWER */}
                  {activeAsset === 'report' && activeData.report && (
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--divider)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>Executive Summary Study Report</h4>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }} onClick={downloadReportPdf}>
                          <Download size={14} /> Download PDF
                        </button>
                      </div>
                      <div style={{
                        whiteSpace: 'pre-line',
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        color: 'var(--text-muted)',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '20px',
                        padding: '1.5rem'
                      }}>
                        {activeData.report}
                      </div>
                    </div>
                  )}

                  {/* 7. DATA TABLE VIEWER */}
                  {activeAsset === 'table' && activeData.data_table && (() => {
                    const parsed = parseDataTable(activeData.data_table);
                    if (!parsed || !parsed.headers || parsed.headers.length === 0) {
                      return (
                        <div style={{ whiteSpace: 'pre-line', fontSize: '0.88rem', color: 'var(--text-muted)', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '1.5rem' }}>
                          {activeData.data_table}
                        </div>
                      );
                    }
                    return (
                      <div style={{ width: '100%' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.5rem' }}>Study Reference Data Table</h4>
                        <div style={{ overflowX: 'auto', border: '1.5px solid var(--card-border)', borderRadius: '20px', background: 'var(--card-bg)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1.5px solid var(--card-border)' }}>
                                {parsed.headers.map((h, i) => (
                                  <th key={i} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontWeight: 800, color: 'var(--primary)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {parsed.rows.map((row, rIdx) => (
                                <tr key={rIdx} style={{ borderBottom: rIdx === parsed.rows.length - 1 ? 'none' : '1px solid var(--card-border)' }}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
