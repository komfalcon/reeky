import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import OnboardingForm from './OnboardingForm';
import CollapsibleTree from '../components/CollapsibleTree';
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
  Video,
  Image,
  Table,
  Bookmark,
  BookmarkCheck,
  StickyNote
} from 'lucide-react';

const isGoogleDriveUrl = (value = '') => /(?:drive\.google\.com|docs\.google\.com)/i.test(value);
const getDriveFileId = (value = '') => {
  const match = value.match(/(?:\/d\/|[?&]id=)([-\w]{10,})/i);
  return match?.[1] || '';
};
const getDriveTableUrl = (value = '') => {
  const fileId = getDriveFileId(value);
  return fileId ? `https://docs.google.com/spreadsheets/d/${fileId}/gviz/tq?tqx=out:html&gid=0` : value;
};
const getDrivePreviewUrl = (value = '', mode = 'preview') => {
  if (!isGoogleDriveUrl(value)) return value;
  const fileId = getDriveFileId(value);
  if (!fileId) return value.replace(/\/(view|edit|preview).*$/i, '/preview');
  if (mode === 'sheet') return `https://docs.google.com/spreadsheets/d/${fileId}/htmlembed?widget=false&chrome=false&headers=false`;
  if (mode === 'slides') return `https://docs.google.com/presentation/d/${fileId}/embed?rm=minimal`;
  return `https://drive.google.com/file/d/${fileId}/preview`;
};
const getCustomerFileUrl = (value = '') => {
  if (!isGoogleDriveUrl(value)) return value;
  const fileId = getDriveFileId(value);
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : value;
};

function NativeDriveTable({ url }) {
  const [tableState, setTableState] = useState({ status: 'loading', headers: [], rows: [] });

  useEffect(() => {
    let cancelled = false;
    setTableState({ status: 'loading', headers: [], rows: [] });
    fetch(getDriveTableUrl(url))
      .then(response => {
        if (!response.ok) throw new Error('Table preview unavailable');
        return response.text();
      })
      .then(markup => {
        const documentNode = new DOMParser().parseFromString(markup, 'text/html');
        const sourceTable = documentNode.querySelector('table');
        const parsedRows = sourceTable
          ? Array.from(sourceTable.querySelectorAll('tr')).map(row => Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent.trim())).filter(row => row.some(Boolean))
          : [];
        if (!parsedRows.length) throw new Error('No tabular data found');
        const [firstRow, ...bodyRows] = parsedRows;
        if (!cancelled) setTableState({ status: 'ready', headers: firstRow, rows: bodyRows });
      })
      .catch(() => {
        if (!cancelled) setTableState({ status: 'error', headers: [], rows: [] });
      });
    return () => { cancelled = true; };
  }, [url]);

  if (tableState.status === 'loading') {
    return <div className="foundry-table-message"><div className="spinner" /><strong>Preparing your table</strong><p>Reeky is setting the source data into a readable instrument.</p></div>;
  }

  if (tableState.status === 'error') {
    return (
      <div className="foundry-asset-fallback">
        <div className="foundry-asset-fallback-mark"><Table size={24} /></div>
        <strong>This table is ready to download</strong>
        <p>The live preview is unavailable right now, so we kept you inside Reeky and prepared a safe read-only download instead.</p>
        <a href={getCustomerFileUrl(url)} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}><Download size={16} /> Download table</a>
      </div>
    );
  }

  return (
    <div className="foundry-native-table-wrap">
      <table className="foundry-native-table">
        <thead><tr>{tableState.headers.map((header, index) => <th key={`header-${index}`}>{header || `Column ${index + 1}`}</th>)}</tr></thead>
        <tbody>{tableState.rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`}>{tableState.headers.map((_, colIndex) => <td key={`cell-${rowIndex}-${colIndex}`}>{row[colIndex] || '—'}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const { user, token, logout, updatePreferences, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [uploadMode, setUploadMode] = useState('file');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [userAssets, setUserAssets] = useState([]);
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [mediaCacheState, setMediaCacheState] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('reeky_theme') !== 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');

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
  const [quizMissed, setQuizMissed] = useState([]);

  // Slides States
  const [currentSlide, setCurrentSlide] = useState(0);
  const [tableEmbedError, setTableEmbedError] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [studyNote, setStudyNote] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const studyMemoryKey = selectedAsset?.id ? `reeky_memory_${user?.id || user?.email || 'current'}_${selectedAsset.id}_${activeAsset}` : '';

  const activeLineRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('reeky_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    setTableEmbedError(false);
    setNotesOpen(false);
    if (!studyMemoryKey) {
      setIsBookmarked(false);
      setStudyNote('');
      return;
    }
    try {
      const savedMemory = JSON.parse(localStorage.getItem(studyMemoryKey) || 'null');
      setIsBookmarked(Boolean(savedMemory?.bookmarked));
      setStudyNote(typeof savedMemory?.note === 'string' ? savedMemory.note : '');
    } catch {
      setIsBookmarked(false);
      setStudyNote('');
    }
  }, [selectedAsset?.id, activeAsset, studyMemoryKey]);

  useEffect(() => {
    if (!selectedAsset?.id) return;
    const progressKey = `reeky_progress_${user?.id || user?.email || 'current'}_${selectedAsset.id}`;
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || 'null');
      if (!saved) return;
      if (saved.activeAsset) setActiveAsset(saved.activeAsset);
      if (Number.isInteger(saved.currentFlashcard)) setCurrentFlashcard(saved.currentFlashcard);
      if (Number.isInteger(saved.quizStep)) setQuizStep(saved.quizStep);
      if (Number.isInteger(saved.quizScore)) setQuizScore(saved.quizScore);
      if (Number.isInteger(saved.currentSlide)) setCurrentSlide(saved.currentSlide);
      if (Number.isFinite(saved.deckMastery)) setDeckMastery(saved.deckMastery);
      if (typeof saved.quizFinished === 'boolean') setQuizFinished(saved.quizFinished);
      if (Array.isArray(saved.quizMissed)) setQuizMissed(saved.quizMissed);
    } catch {
      // Ignore malformed local progress and start the kit fresh.
    }
  }, [selectedAsset?.id, user?.id, user?.email]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/');
    }
  };

  const fetchUserAssets = useCallback(async () => {
    if (!token) return;
    setFetchingAssets(true);
    const cacheKey = `reeky_assets_cache_${user?.id || user?.email || 'current'}`;
    try {
      const assets = await api.getAssets(token);
      setUserAssets(assets || []);
      localStorage.setItem(cacheKey, JSON.stringify(assets || []));
    } catch {
      try {
        const cachedAssets = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        if (Array.isArray(cachedAssets)) setUserAssets(cachedAssets);
      } catch {
        // Keep the existing workspace state if local cache is unavailable.
      }
    } finally {
      setFetchingAssets(false);
    }
  }, [token, user?.id, user?.email]);

  useEffect(() => {
    if (isAuthenticated) fetchUserAssets();
  }, [isAuthenticated, fetchUserAssets]);

  useEffect(() => {
    const requestedKit = searchParams.get('kit');
    const requestedInstrument = searchParams.get('instrument');
    if (!requestedKit || !userAssets.length) return;
    const matchingAsset = userAssets.find(asset => String(asset.id) === requestedKit);
    if (matchingAsset && selectedAsset?.id !== matchingAsset.id) setSelectedAsset(matchingAsset);
    if (requestedInstrument) setActiveAsset(requestedInstrument);
  }, [searchParams, userAssets, selectedAsset?.id]);

  useEffect(() => {
    if (!selectedAsset?.id) return;
    const progressKey = `reeky_progress_${user?.id || user?.email || 'current'}_${selectedAsset.id}`;
    localStorage.setItem(progressKey, JSON.stringify({
      activeAsset,
      currentFlashcard,
      quizStep,
      quizScore,
      quizFinished,
      quizMissed,
      currentSlide,
      deckMastery,
      savedAt: new Date().toISOString()
    }));
  }, [selectedAsset?.id, user?.id, user?.email, activeAsset, currentFlashcard, quizStep, quizScore, quizFinished, quizMissed, currentSlide, deckMastery]);

  useEffect(() => {
    const markOnline = () => setIsOffline(false);
    const markOffline = () => setIsOffline(true);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

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
  const assetTags = ['All', ...new Set(completedAssets.flatMap(asset => {
    const title = (asset.title || '').toLowerCase();
    return [title.includes('physics') ? 'Physics' : null, title.includes('chem') ? 'Chemistry' : null, title.includes('biology') ? 'Biology' : null, title.includes('econom') ? 'Economics' : null, title.includes('history') ? 'History' : null].filter(Boolean);
  }))];
  const filteredCompletedAssets = completedAssets.filter(asset => {
    const title = (asset.title || '').toLowerCase();
    const queryMatches = !assetSearch.trim() || title.includes(assetSearch.trim().toLowerCase());
    const tagMatches = activeTag === 'All' || title.includes(activeTag.toLowerCase().replace('chemistry', 'chem'));
    return queryMatches && tagMatches;
  });
  const getProductionStatus = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized.includes('FAIL')) return { label: 'Needs attention', detail: 'The Foundry could not finish this kit.', tone: 'error' };
    if (normalized.includes('PROCESS')) return { label: 'Shaping instruments', detail: 'The source is being turned into study tools.', tone: 'active' };
    if (normalized.includes('COMPLETE')) return { label: 'Ready to study', detail: 'Your instruments are ready at the Kit Bench.', tone: 'ready' };
    return { label: 'Queued at the Foundry', detail: 'Your source is safely in line for production.', tone: 'queued' };
  };

  const buildActiveData = (asset) => {
    if (!asset || !asset.assets) return null;
    const a = typeof asset.assets === 'string' ? JSON.parse(asset.assets) : asset.assets;
    return {
      title: asset.title || 'Untitled Document',
      tagline: a.tagline || 'AI-Generated Study Suite',
      flashcards: Array.isArray(a.flashcards) ? a.flashcards : [],
      quiz: Array.isArray(a.quiz) ? a.quiz : (Array.isArray(a.quizzes) ? a.quizzes : []),
      mindmap: a.mindmap || { nodes: [], connections: [] },
      mindmapRaw: a.mindmap_raw || a.mindmap || { nodes: [], connections: [] },
      slides: Array.isArray(a.slides) ? a.slides : (typeof a.slides === 'string' ? a.slides : (typeof a.slide_deck === 'string' ? a.slide_deck : [])),
      report: a.report || a.study_report || '',
      transcript: Array.isArray(a.transcript) ? a.transcript : [],
      podcast_audio: a.podcast_audio || null,
      video_overview: a.video_overview || null,
      infographic: a.infographic || null,
      data_table: a.data_table || null,
    };
  };

  const activeData = selectedAsset ? buildActiveData(selectedAsset) : null;
  useEffect(() => {
    if (!activeData || !selectedAsset?.id) return;
    const cacheKey = `reeky_text_instruments_${user?.id || user?.email || 'current'}_${selectedAsset.id}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      title: activeData.title,
      report: activeData.report,
      flashcards: activeData.flashcards,
      quiz: activeData.quiz,
      mindmap: activeData.mindmapRaw,
      slides: activeData.slides,
      transcript: activeData.transcript,
      cachedAt: new Date().toISOString()
    }));
  }, [activeData, selectedAsset?.id, user?.id, user?.email]);
  const kitRoute = activeData ? [
    { id: 'podcast', label: 'Listen', ready: Boolean(activeData.podcast_audio || activeData.transcript?.length) },
    { id: 'report', label: 'Read', ready: Boolean(activeData.report) },
    { id: 'flashcards', label: 'Recall', ready: activeData.flashcards.length > 0 },
    { id: 'quiz', label: 'Test', ready: activeData.quiz.length > 0 },
    { id: 'mindmap', label: 'Map', ready: Boolean(activeData.mindmapRaw) },
    { id: 'data_table', label: 'Compare', ready: Boolean(activeData.data_table) },
    { id: 'slides', label: 'Present', ready: activeData.slides.length > 0 || typeof activeData.slides === 'string' },
    { id: 'video', label: 'Watch', ready: Boolean(activeData.video_overview) },
    { id: 'infographic', label: 'Scan', ready: Boolean(activeData.infographic) }
  ] : [];
  const readyKitCount = kitRoute.filter(item => item.ready).length;
  const quizProgress = activeData?.quiz.length ? Math.round((quizFinished ? 100 : (quizStep / activeData.quiz.length) * 100)) : 0;
  const studyProgress = activeData ? Math.round((deckMastery + quizProgress) / (activeData.quiz.length ? 2 : 1)) : 0;
  const recommendedInstrument = kitRoute.find(item => item.ready && item.id !== activeAsset) || kitRoute.find(item => item.ready);

  const saveMediaOffline = async (mediaKey, url) => {
    if (!url || !('caches' in window)) return;
    setMediaCacheState(prev => ({ ...prev, [mediaKey]: 'saving' }));
    try {
      const cache = await caches.open('reeky-foundry-media-v1');
      const requestUrl = isGoogleDriveUrl(url) ? getCustomerFileUrl(url) : url;
      const response = await fetch(requestUrl, { mode: 'no-cors' });
      await cache.put(requestUrl, response.clone());
      localStorage.setItem(`reeky_media_cached_${mediaKey}`, 'true');
      setMediaCacheState(prev => ({ ...prev, [mediaKey]: 'saved' }));
    } catch {
      setMediaCacheState(prev => ({ ...prev, [mediaKey]: 'error' }));
    }
  };

  const saveStudyMemory = (overrides = {}) => {
    if (!studyMemoryKey) return;
    localStorage.setItem(studyMemoryKey, JSON.stringify({
      bookmarked: isBookmarked,
      note: studyNote,
      ...overrides,
      savedAt: new Date().toISOString()
    }));
  };

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
    <div className="foundry-dashboard" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Mini Navbar */}
      <header className="navbar foundry-header" style={{ position: 'sticky' }}>
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
            <Link to="/review" className="foundry-nav-link">Review Desk</Link>
            <button className="foundry-theme-toggle" type="button" onClick={() => setIsDarkMode(prev => !prev)} aria-label="Toggle color theme">
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </button>
            <button className="btn btn-secondary" style={{ display: 'flex' }} onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div className="container foundry-main" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
        {isOffline && (
          <div className="foundry-offline-banner" role="status">
            <span className="foundry-offline-dot" />
            <div><strong>Offline study mode</strong><span>Your saved learning kits remain available. New sources and production updates will sync when you reconnect.</span></div>
          </div>
        )}

        <div className="foundry-dashboard-intro">
          <div>
            <span className="foundry-eyebrow">STUDENT WORKSPACE / SOURCE DESK</span>
            <h1>Build a learning kit from the material in front of you.</h1>
            <p>Submit one source, choose the instruments you need, and return here when the kit is ready to study.</p>
          </div>
          <div className="foundry-intro-index"><span>REEKY</span><strong>02</strong></div>
        </div>

        {/* Upload & Preference Form */}
        <div className="dashboard-card foundry-source-panel" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>
            Commission a learning kit
          </h3>
          <p className="foundry-commission-copy">Begin with the source. We’ll shape it into a small set of instruments built for the way you want to study.</p>

          <div className="foundry-source-switcher" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
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
          <div className="foundry-commission-note"><span>COMMISSION STEP {uploadMode === 'file' ? '01' : '02'}</span><strong>{uploadMode === 'file' ? 'Bring a source from your device' : 'Point us to a published PDF'}</strong></div>

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

        <div className="foundry-stage-strip" aria-label="Learning kit production status">
          <div className="foundry-stage complete">
            <span className="foundry-stage-number">01</span>
            <div><strong>Source submitted</strong><small>{userAssets.length ? `${userAssets.length} source${userAssets.length === 1 ? '' : 's'} on desk` : 'Waiting for your first source'}</small></div>
          </div>
          <div className={`foundry-stage ${pendingAssets.length ? 'active' : userAssets.length ? 'complete' : ''}`}>
            <span className="foundry-stage-number">02</span>
            <div><strong>Kit in production</strong><small>{pendingAssets.length ? `${pendingAssets.length} bundle${pendingAssets.length === 1 ? '' : 's'} moving through the Foundry` : 'No active production queue'}</small></div>
          </div>
          <div className={`foundry-stage ${completedAssets.length ? 'ready' : ''}`}>
            <span className="foundry-stage-number">03</span>
            <div><strong>Instruments ready</strong><small>{completedAssets.length ? `${completedAssets.length} learning kit${completedAssets.length === 1 ? '' : 's'} ready to open` : 'Complete kits appear here'}</small></div>
          </div>
        </div>

        {/* Assets Overview Grid */}
        <div className="foundry-workbench" style={{ display: 'grid', gridTemplateColumns: '1fr 3.2fr', gap: '2rem' }}>
          
          {/* Sidebar selector */}
          <div>
            <div className="dashboard-card foundry-source-desk" style={{ padding: '1.25rem', minHeight: '400px' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', borderBottom: '1px solid var(--divider)', paddingBottom: '0.5rem' }}>
                Source Desk
              </h4>

              <div className="foundry-sidebar-nav">
                <Link to="/dashboard" className="foundry-sidebar-nav-item active">Kit Bench <span>⌂</span></Link>
                <Link to="/review" className="foundry-sidebar-nav-item">Review Desk <span>↗</span></Link>
                <button type="button" className="foundry-sidebar-nav-item" onClick={() => setSidebarOpen(prev => !prev)}>{sidebarOpen ? 'Close filters' : 'Find a kit'} <span>⌕</span></button>
              </div>

              {sidebarOpen && (
                <div className="foundry-asset-filters">
                  <label htmlFor="asset-search">Search the archive</label>
                  <input id="asset-search" className="auth-input" value={assetSearch} onChange={event => setAssetSearch(event.target.value)} placeholder="Search kit titles..." />
                  <div className="foundry-tag-list" aria-label="Filter kits by subject">
                    {assetTags.map(tag => <button key={tag} type="button" className={activeTag === tag ? 'active' : ''} onClick={() => setActiveTag(tag)}>{tag}</button>)}
                  </div>
                </div>
              )}

              {fetchingAssets && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading...</p>}

              {!fetchingAssets && userAssets.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Your cabinets are empty! Paste a PDF URL or drop a document to build one.
                </p>
              )}

              {completedAssets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>DIGESTED</p>
                  {filteredCompletedAssets.map(asset => (
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
                        setQuizMissed([]);
                        setQuizAnswered(false);
                        setSelectedQuizOption(null);
                        setAudioPlaying(false);
                        setAudioProgress(0);
                        setAudioTime('00:00');
                        setActiveTranscriptIndex(0);
                      }}
                    >
                      📚 {asset.title.length > 22 ? asset.title.slice(0, 22) + '...' : asset.title}
                    </button>
                  ))}
                  {filteredCompletedAssets.length === 0 && <p className="foundry-filter-empty">No kits match this search.</p>}
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
                      <span className="foundry-processing-mark">{getProductionStatus(asset.status).tone === 'error' ? '!' : '⏳'}</span>
                      <span className="foundry-processing-title">{asset.title.length > 18 ? asset.title.slice(0, 18) + '...' : asset.title}</span>
                      <span className={`foundry-status-pill ${getProductionStatus(asset.status).tone}`}>
                        {getProductionStatus(asset.status).label}
                      </span>
                      <span className="foundry-status-detail">{getProductionStatus(asset.status).detail}</span>
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
                  Open a learning kit
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '340px', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  Select a completed source from the desk to open its forged instruments: flashcards, quizzes, podcasts, mindmaps, and more.
                </p>
              </div>
            )}

            {selectedAsset && activeData && (
              <div className="dashboard-card foundry-kit-bench" style={{ padding: '0', overflow: 'hidden', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                
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

                  <div className="foundry-kit-overview">
                    <div className="foundry-kit-overview-copy">
                      <span className="foundry-overline">KIT OVERVIEW / {String(readyKitCount).padStart(2, '0')} INSTRUMENTS READY</span>
                      <strong>{recommendedInstrument ? `Continue with ${recommendedInstrument.label.toLowerCase()}` : 'Your kit is taking shape'}</strong>
                      <span>{recommendedInstrument ? 'Follow the route from orientation to recall, then test what stayed with you.' : 'Your completed instruments will appear here when production finishes.'}</span>
                      <div className="foundry-kit-progress" aria-label={`Study progress ${studyProgress}%`}>
                        <div><span>Study progress</span><strong>{studyProgress}%</strong></div>
                        <div className="foundry-kit-progress-track"><span style={{ width: `${studyProgress}%` }} /></div>
                      </div>
                    </div>
                    {recommendedInstrument && (
                      <button className="btn btn-primary foundry-next-action" type="button" onClick={() => { setActiveAsset(recommendedInstrument.id); setAudioPlaying(false); }}>
                        Start next <ChevronRight size={16} />
                      </button>
                    )}
                  </div>

                  <div className="foundry-study-tools">
                    <button className={`foundry-memory-button ${isBookmarked ? 'saved' : ''}`} type="button" onClick={() => {
                      const nextValue = !isBookmarked;
                      setIsBookmarked(nextValue);
                      saveStudyMemory({ bookmarked: nextValue });
                    }}>
                      {isBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                      {isBookmarked ? 'Bookmarked' : 'Bookmark instrument'}
                    </button>
                    <button className={`foundry-memory-button ${notesOpen || studyNote ? 'saved' : ''}`} type="button" onClick={() => setNotesOpen(prev => !prev)}>
                      <StickyNote size={15} /> {studyNote ? 'Edit note' : 'Add note'}
                    </button>
                    {notesOpen && (
                      <textarea
                        className="foundry-note-editor"
                        value={studyNote}
                        onChange={event => setStudyNote(event.target.value)}
                        onBlur={() => saveStudyMemory()}
                        placeholder="Capture a question, connection, or reminder..."
                        aria-label="Personal study note"
                        rows={2}
                      />
                    )}
                  </div>

                  {/* Purpose-led instrument bench */}
                  <div className="foundry-instrument-grid" aria-label="Learning instruments">
                    {[
                      { id: 'podcast', label: 'Listen', technical: 'Podcast', purpose: 'Absorb the source on the move', icon: <Music size={15} />, ready: Boolean(activeData.podcast_audio || activeData.transcript?.length) },
                      { id: 'flashcards', label: 'Recall', technical: 'Flashcards', purpose: 'Retrieve the key ideas', icon: <Layers size={15} />, ready: activeData.flashcards.length > 0 },
                      { id: 'quiz', label: 'Test', technical: 'Quiz', purpose: 'Expose what needs work', icon: <HelpCircle size={15} />, ready: activeData.quiz.length > 0 },
                      { id: 'mindmap', label: 'Map', technical: 'Mindmap', purpose: 'See the relationships', icon: <Network size={15} />, ready: Boolean(activeData.mindmapRaw) },
                      { id: 'slides', label: 'Present', technical: 'Slides', purpose: 'Turn ideas into a deck', icon: <Compass size={15} />, ready: activeData.slides.length > 0 || typeof activeData.slides === 'string' },
                      { id: 'report', label: 'Read', technical: 'Summary', purpose: 'Follow the full explanation', icon: <FileText size={15} />, ready: Boolean(activeData.report) },
                      { id: 'video', label: 'Watch', technical: 'Video', purpose: 'Follow a visual walkthrough', icon: <Video size={15} />, ready: Boolean(activeData.video_overview) },
                      { id: 'infographic', label: 'Scan', technical: 'Infographic', purpose: 'See the fast visual brief', icon: <Image size={15} />, ready: Boolean(activeData.infographic) },
                      { id: 'data_table', label: 'Compare', technical: 'Data table', purpose: 'Inspect facts side by side', icon: <Table size={15} />, ready: Boolean(activeData.data_table) }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        disabled={!tab.ready}
                        className={`foundry-instrument ${activeAsset === tab.id ? 'active' : ''} ${tab.ready ? 'ready' : 'unavailable'}`}
                        onClick={() => {
                          if (!tab.ready) return;
                          setActiveAsset(tab.id);
                          setAudioPlaying(false);
                        }}
                      >
                        <span className="foundry-instrument-icon">{tab.icon}</span>
                        <span className="foundry-instrument-copy"><strong>{tab.label}</strong><small>{tab.purpose}</small></span>
                        <span className="foundry-instrument-meta">{tab.ready ? tab.technical : 'Queued'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Workspace Renderer */}
                <div style={{ padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* 1. AUDITORY PODCAST VIEWER */}
                  {activeAsset === 'podcast' && (activeData.podcast_audio || activeData.transcript?.length > 0) && (
                    <div className="podcast-layout" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: activeData.podcast_audio ? '1fr' : '1.2fr 2fr', 
                      gap: '2.5rem', 
                      width: '100%',
                      justifyItems: activeData.podcast_audio ? 'center' : 'stretch'
                    }}>
                      
                      {activeData.podcast_audio ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '600px', marginTop: '2rem' }}>
                          <Music size={64} color="var(--primary)" style={{ marginBottom: '2rem' }} />
                          <h4 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Uploaded Podcast Audio</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Listen to the study material provided by your instructor.</p>
                          {(isGoogleDriveUrl(activeData.podcast_audio)) ? (
                            <iframe 
                              src={getDrivePreviewUrl(activeData.podcast_audio)}
                              style={{ width: '100%', height: '140px', border: 'none', borderRadius: '16px', background: 'transparent' }} 
                              title="Podcast Player"
                            />
                          ) : (
                            <audio controls src={activeData.podcast_audio} style={{ width: '100%', outline: 'none' }} />
                          )}
                          <button type="button" className="foundry-offline-media-button" onClick={() => saveMediaOffline('podcast', activeData.podcast_audio)} disabled={mediaCacheState.podcast === 'saving'}>
                            <Download size={14} /> {mediaCacheState.podcast === 'saved' ? 'Saved for offline' : mediaCacheState.podcast === 'saving' ? 'Saving media...' : 'Save audio for offline'}
                          </button>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
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
                            cursor: 'pointer',
                            transform: flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0)'
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
                              {activeData.flashcards[currentFlashcard].f || activeData.flashcards[currentFlashcard].q}
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
                              {activeData.flashcards[currentFlashcard].b || activeData.flashcards[currentFlashcard].a}
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
                            {activeData.quiz[quizStep].q || activeData.quiz[quizStep].question}
                          </h3>

                          {/* Options list */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {(activeData.quiz[quizStep].options || (activeData.quiz[quizStep].answerOptions || []).map(o => o.text)).map((option, idx) => {
                              let optionBg = 'var(--card-bg)';
                              let optionBorder = 'var(--card-border)';
                              let optionColor = 'var(--text-main)';
                              
                              const isCorrectOption = activeData.quiz[quizStep].answerOptions ? 
                                activeData.quiz[quizStep].answerOptions[idx].isCorrect : 
                                (idx === activeData.quiz[quizStep].correct);

                              if (quizAnswered) {
                                if (isCorrectOption) {
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
                                    if (isCorrectOption) {
                                      setQuizScore(prev => prev + 1);
                                    } else {
                                      setQuizMissed(prev => prev.includes(quizStep) ? prev : [...prev, quizStep]);
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
                                  {quizAnswered && isCorrectOption && <span style={{ color: 'var(--success)' }}>✓</span>}
                                  {quizAnswered && idx === selectedQuizOption && !isCorrectOption && <span style={{ color: 'var(--error)' }}>✗</span>}
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
                                color: (activeData.quiz[quizStep].answerOptions ? activeData.quiz[quizStep].answerOptions[selectedQuizOption].isCorrect : (selectedQuizOption === activeData.quiz[quizStep].correct)) ? 'var(--success)' : 'var(--error)',
                                marginBottom: '0.5rem'
                              }}>
                                {(activeData.quiz[quizStep].answerOptions ? activeData.quiz[quizStep].answerOptions[selectedQuizOption].isCorrect : (selectedQuizOption === activeData.quiz[quizStep].correct)) ? '🌟 Perfect! Correct!' : '🎯 Close, but not quite!'}
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                                {activeData.quiz[quizStep].explanation || (activeData.quiz[quizStep].answerOptions && activeData.quiz[quizStep].answerOptions[selectedQuizOption].rationale)}
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

                          {quizMissed.length > 0 && (
                            <div className="foundry-quiz-review">
                              <div><strong>{quizMissed.length} question{quizMissed.length === 1 ? '' : 's'} to revisit</strong><span>Return to the first missed question and use the explanation to repair the gap.</span></div>
                              <button className="foundry-memory-button" type="button" onClick={() => { setQuizStep(quizMissed[0]); setQuizFinished(false); setQuizAnswered(false); setSelectedQuizOption(null); }}>Review missed</button>
                            </div>
                          )}

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
                              setQuizMissed([]);
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
                  {activeAsset === 'mindmap' && activeData.mindmapRaw && (
                    <div style={{ flex: 1, border: '1px solid var(--card-border)', borderRadius: '16px', overflow: 'hidden' }}>
                      <CollapsibleTree treeData={activeData.mindmapRaw} title={activeData.title} />
                    </div>
                  )}

                  {/* 4b. NEW TABS CONTENT */}
                  {activeAsset === 'video' && (
                    activeData.video_overview ? (
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {(isGoogleDriveUrl(activeData.video_overview)) ? (
                          <iframe 
                            src={getDrivePreviewUrl(activeData.video_overview)}
                            style={{ width: '100%', height: '500px', maxWidth: '800px', border: 'none', borderRadius: '16px', boxShadow: 'var(--card-shadow)' }} 
                            title="Video Player"
                            allow="autoplay"
                          />
                        ) : (
                          <video controls src={activeData.video_overview} style={{ width: '100%', maxWidth: '800px', maxHeight: '600px', borderRadius: '16px', boxShadow: 'var(--card-shadow)' }} />
                        )}
                        <button type="button" className="foundry-offline-media-button" onClick={() => saveMediaOffline('video', activeData.video_overview)} disabled={mediaCacheState.video === 'saving'}>
                          <Download size={14} /> {mediaCacheState.video === 'saved' ? 'Saved for offline' : mediaCacheState.video === 'saving' ? 'Saving media...' : 'Save video for offline'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Sparkles size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3 style={{ margin: 0, fontWeight: 700 }}>AI Video Generation</h3>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>This feature is currently processing or coming in the next update.</p>
                      </div>
                    )
                  )}

                  {activeAsset === 'data_table' && (
                    activeData.data_table ? (
                      <div className="foundry-table-instrument" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--divider)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ fontWeight: 800, margin: 0, fontSize: '1.1rem' }}>Dataset Viewer</h4>
                            <span className="foundry-table-caption">Read-only instrument · values preserved from the source</span>
                          </div>
                          <a href={getCustomerFileUrl(activeData.data_table)} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Download size={16} /> Download table
                          </a>
                        </div>
                        {isGoogleDriveUrl(activeData.data_table) ? (
                          <NativeDriveTable url={activeData.data_table} />
                        ) : tableEmbedError ? (
                          <div className="foundry-asset-fallback">
                            <div className="foundry-asset-fallback-mark"><Table size={24} /></div>
                            <strong>This table is ready to download</strong>
                            <p>The live preview is unavailable right now, so we kept you inside Reeky and prepared a safe read-only download instead.</p>
                            <a href={getCustomerFileUrl(activeData.data_table)} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}><Download size={16} /> Download table</a>
                          </div>
                        ) : (
                          <div className="foundry-table-frame"><iframe className="foundry-table-embed" src={activeData.data_table} onError={() => setTableEmbedError(true)} title="Data Table" /></div>
                        )}
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Sparkles size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3 style={{ margin: 0, fontWeight: 700 }}>AI Data Tables</h3>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>This feature is currently processing or coming in the next update.</p>
                      </div>
                    )
                  )}

                  {activeAsset === 'infographic' && (
                    activeData.infographic ? (
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'auto', padding: '1rem' }}>
                        {(isGoogleDriveUrl(activeData.infographic)) ? (
                          <iframe 
                            src={getDrivePreviewUrl(activeData.infographic)}
                            style={{ width: '100%', height: '600px', border: 'none', borderRadius: '16px', boxShadow: 'var(--card-shadow)' }} 
                            title="Infographic"
                          />
                        ) : (
                          <img src={activeData.infographic} alt="Infographic" style={{ maxWidth: '100%', objectFit: 'contain', borderRadius: '16px', boxShadow: 'var(--card-shadow)' }} />
                        )}
                        <button type="button" className="foundry-offline-media-button" onClick={() => saveMediaOffline('infographic', activeData.infographic)} disabled={mediaCacheState.infographic === 'saving'}>
                          <Download size={14} /> {mediaCacheState.infographic === 'saved' ? 'Saved for offline' : mediaCacheState.infographic === 'saving' ? 'Saving media...' : 'Save image for offline'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Sparkles size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3 style={{ margin: 0, fontWeight: 700 }}>AI Infographics</h3>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>This feature is currently processing or coming in the next update.</p>
                      </div>
                    )
                  )}

                  {/* 5. SLIDE DECK VIEWER */}
                  {activeAsset === 'slides' && (
                    typeof activeData.slides === 'string' ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--divider)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                          <h4 style={{ fontWeight: 800, margin: 0, fontSize: '1.1rem' }}>Slide Deck Viewer</h4>
                          <a href={getCustomerFileUrl(activeData.slides)} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} /> Open Full View
                          </a>
                        </div>
                        {(isGoogleDriveUrl(activeData.slides)) ? (
                          <iframe 
                            src={getDrivePreviewUrl(activeData.slides, 'slides')}
                            style={{ width: '100%', flex: 1, minHeight: '600px', border: 'none', borderRadius: '12px', background: '#000' }} 
                            title="Slide Deck"
                          />
                        ) : (
                          <iframe src={activeData.slides} style={{ width: '100%', flex: 1, minHeight: '600px', border: 'none', borderRadius: '12px' }} title="Slide Deck" />
                        )}
                      </div>
                    ) : activeData.slides.length > 0 ? (
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
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <Compass size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3 style={{ margin: 0, fontWeight: 700 }}>AI Slide Deck</h3>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>This bundle does not contain a generated Slide Deck.</p>
                      </div>
                    )
                  )}

                  {/* 6. SUMMARY REPORT VIEWER */}
                  {activeAsset === 'report' && activeData.report && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--divider)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>Executive Summary Study Report</h4>
                        {activeData.report.startsWith('http') ? (
                          <a href={getCustomerFileUrl(activeData.report)} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem', textDecoration: 'none' }}>
                            <Download size={14} /> Open Document
                          </a>
                        ) : (
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }} onClick={downloadReportPdf}>
                            <Download size={14} /> Download PDF
                          </button>
                        )}
                      </div>
                      
                      {activeData.report.startsWith('http') ? (
                        <iframe 
                          src={isGoogleDriveUrl(activeData.report) ? getDrivePreviewUrl(activeData.report) : activeData.report}
                          style={{ width: '100%', flex: 1, minHeight: '500px', border: 'none', borderRadius: '16px', background: '#fff' }} 
                          title="Document Viewer"
                        />
                      ) : (
                        <div style={{
                          whiteSpace: 'pre-line',
                          fontSize: '0.88rem',
                          lineHeight: 1.6,
                          color: 'var(--text-muted)',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '20px',
                          padding: '1.5rem',
                          overflowY: 'auto'
                        }}>
                          {activeData.report}
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
