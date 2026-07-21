import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  BookOpen,
  Layers,
  FileCheck,
  GitBranch,
  Mic,
  FileText,
  Film,
  ExternalLink,
  RefreshCw,
  Library,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import AssetSelection from '../components/AssetSelection';
import FlashcardFlipper from '../components/FlashcardFlipper';
import SteppedQuizPlayer from '../components/SteppedQuizPlayer';
import WaveformPodcastPlayer from '../components/WaveformPodcastPlayer';
import ZoomableMindmapViewer from '../components/ZoomableMindmapViewer';
import { normalizeBundle, summarizeStatus } from '../lib/normalizeAssets';
import './Dashboard.css';

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'Reeky Academic Hub');
  const res = await fetch('https://api.cloudinary.com/v1_1/x9lbk1ea/auto/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

const TAB_META = {
  flashcards: { label: 'Flashcards', icon: Layers },
  quiz: { label: 'Quiz', icon: FileCheck },
  mindmap: { label: 'Mindmap', icon: GitBranch },
  podcast: { label: 'Podcast', icon: Mic },
  media: { label: 'Media', icon: Film },
  report: { label: 'Report', icon: FileText },
};

function contentChips(bundle) {
  const chips = [];
  if (bundle.counts.flashcards) chips.push(`${bundle.counts.flashcards} cards`);
  if (bundle.counts.quiz) chips.push(`${bundle.counts.quiz} quiz`);
  if (bundle.counts.mindmapNodes) chips.push('Mindmap');
  if (bundle.counts.hasPodcast) chips.push('Podcast');
  if (bundle.counts.hasVideo) chips.push('Video');
  if (bundle.counts.hasReport) chips.push('Report');
  if (bundle.counts.hasSlides) chips.push('Slides');
  return chips;
}

export default function Dashboard() {
  const { user, token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isUploading, setIsUploading] = useState(false);
  const [rawAssets, setRawAssets] = useState([]);
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/');
    }
  };

  const fetchUserAssets = useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setFetchingAssets(true);
    try {
      const assets = await api.getAssets(token);
      setRawAssets(Array.isArray(assets) ? assets : []);
      setFetchError('');
    } catch (err) {
      setFetchError(err.message || 'Failed to load study materials');
    } finally {
      if (!silent) setFetchingAssets(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) fetchUserAssets();
  }, [isAuthenticated, fetchUserAssets]);

  // Poll while anything is still in flight
  useEffect(() => {
    const hasPending = rawAssets.some((a) => a.status !== 'COMPLETED');
    if (!hasPending || !token) return undefined;
    const id = setInterval(() => fetchUserAssets({ silent: true }), 8000);
    return () => clearInterval(id);
  }, [rawAssets, token, fetchUserAssets]);

  const bundles = useMemo(
    () => rawAssets.map(normalizeBundle),
    [rawAssets]
  );

  const selected = useMemo(
    () => bundles.find((b) => b.id === selectedId) || null,
    [bundles, selectedId]
  );

  useEffect(() => {
    if (!selected) {
      setActiveTab(null);
      return;
    }
    if (selected.hasContent) {
      setActiveTab((prev) =>
        selected.availableTabs.includes(prev) ? prev : selected.availableTabs[0]
      );
    } else {
      setActiveTab(null);
    }
  }, [selected]);

  // Auto-select newest ready suite when none selected
  useEffect(() => {
    if (selectedId || bundles.length === 0) return;
    const ready = bundles.find((b) => b.status === 'COMPLETED' && b.hasContent);
    if (ready) setSelectedId(ready.id);
  }, [bundles, selectedId]);

  const handleUpload = async (file, selectedAssets, customInstructions) => {
    if (!token) return;
    setIsUploading(true);
    try {
      const fileUrl = await uploadToCloudinary(file);
      const title = file.name || 'Uploaded Document';
      await api.generateAssets(
        title,
        fileUrl,
        token,
        customInstructions || undefined,
        selectedAssets
      );
      setShowUpload(false);
      await fetchUserAssets();
    } catch (err) {
      alert('Failed to upload: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const readyCount = bundles.filter((b) => b.status === 'COMPLETED').length;
  const pendingCount = bundles.filter((b) => b.status !== 'COMPLETED').length;

  const downloadReportPdf = () => {
    if (!selected?.report) return;
    const doc = new jsPDF();
    const title = selected.title || 'Study Report';
    doc.setFontSize(18);
    doc.text(title, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(selected.report, 180);
    let y = 35;
    for (const line of lines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += 7;
    }
    doc.save(`${title.replace(/\.[^/.]+$/, '')}-report.pdf`);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <div className="container dash-header-inner">
          <Link to="/" className="dash-brand">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <path d="M12 2L2 22H22L12 2Z" stroke="var(--primary)" fill="none" strokeWidth="2" />
              <path d="M20 12L15 22H29L20 12Z" stroke="var(--secondary)" fill="none" strokeWidth="2" />
            </svg>
            Reeky Academic Hub
          </Link>
          <div className="dash-header-actions">
            <span className="dash-user-chip">{user?.name || 'Student'}</span>
            <button type="button" className="btn btn-secondary" onClick={() => fetchUserAssets()}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="container dash-main">
        <div className="dash-hero">
          <h1>Your study library</h1>
          <p>
            Upload a PDF to queue a study suite. When it is ready, open it here to
            study with flashcards, quizzes, mindmaps, and more.
          </p>
          <div className="dash-stats">
            <div className="dash-stat">
              <strong>{readyCount}</strong> ready
            </div>
            <div className="dash-stat">
              <strong>{pendingCount}</strong> in progress
            </div>
            <div className="dash-stat">
              <strong>{bundles.length}</strong> total
            </div>
          </div>
        </div>

        <div className="dash-upload-wrap" style={{ marginBottom: '1.25rem' }}>
          {!showUpload ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowUpload(true)}
              style={{ display: 'inline-flex', gap: '0.4rem' }}
            >
              <BookOpen size={18} />
              New study suite
            </button>
          ) : (
            <div className="dash-panel">
              <div className="dash-panel-head">
                <h2>Create study suite</h2>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)}>
                  Close
                </button>
              </div>
              <div className="dash-panel-body">
                <AssetSelection onUpload={handleUpload} isUploading={isUploading} />
              </div>
            </div>
          )}
        </div>

        {fetchError && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: 12,
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            {fetchError}
          </div>
        )}

        <div className={`dash-layout ${selected ? 'has-selection' : ''}`}>
          <aside className="dash-panel">
            <div className="dash-panel-head">
              <h2>
                <Library size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Library
              </h2>
            </div>
            <div className="dash-panel-body">
              {fetchingAssets && bundles.length === 0 && (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading your suites…</p>
              )}

              {!fetchingAssets && bundles.length === 0 && (
                <div className="dash-empty">
                  <Inbox size={40} />
                  <h3>No study suites yet</h3>
                  <p>Create your first suite above. Once processing finishes, it will show up here ready to open.</p>
                </div>
              )}

              {bundles.length > 0 && (
                <div className="suite-list">
                  {bundles.map((bundle) => {
                    const status = summarizeStatus(bundle.status);
                    const chips = contentChips(bundle);
                    return (
                      <button
                        key={bundle.id}
                        type="button"
                        className={`suite-card ${selectedId === bundle.id ? 'active' : ''}`}
                        onClick={() => setSelectedId(bundle.id)}
                      >
                        <div className="suite-card-top">
                          <div className="suite-title">{bundle.title}</div>
                          <span className={`status-pill ${status.tone}`}>{status.label}</span>
                        </div>
                        <div className="suite-meta">
                          {bundle.createdAt
                            ? new Date(bundle.createdAt).toLocaleString()
                            : 'Recently added'}
                        </div>
                        <div className="suite-chips">
                          {bundle.status === 'COMPLETED' && chips.length === 0 && (
                            <span className="suite-chip muted">No interactive content yet</span>
                          )}
                          {chips.map((c) => (
                            <span key={c} className="suite-chip">{c}</span>
                          ))}
                          {bundle.status !== 'COMPLETED' && (
                            <span className="suite-chip muted">Waiting for generation</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="dash-panel study-workspace">
            {!selected ? (
              <div className="dash-empty" style={{ padding: '4rem 1.5rem' }}>
                <BookOpen size={48} />
                <h3>Select a suite to study</h3>
                <p>
                  Pick an item from your library. Ready suites open flashcards, quizzes,
                  mindmaps, and media in this panel.
                </p>
              </div>
            ) : (
              <>
                <div className="study-top">
                  <h2>{selected.title}</h2>
                  <p className="study-sub">{selected.tagline}</p>
                  <div className="study-actions">
                    {selected.originalFileUrl && (
                      <a
                        className="btn btn-secondary"
                        href={selected.originalFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', gap: '0.35rem', textDecoration: 'none' }}
                      >
                        <ExternalLink size={16} />
                        Source PDF
                      </a>
                    )}
                    {selected.report && (
                      <button type="button" className="btn btn-secondary" onClick={downloadReportPdf}>
                        Download report PDF
                      </button>
                    )}
                  </div>

                  {selected.hasContent && (
                    <div className="study-tabs" role="tablist">
                      {selected.availableTabs.map((tab) => {
                        const meta = TAB_META[tab];
                        if (!meta) return null;
                        const Icon = meta.icon;
                        let count = '';
                        if (tab === 'flashcards') count = selected.counts.flashcards;
                        if (tab === 'quiz') count = selected.counts.quiz;
                        if (tab === 'mindmap') count = selected.counts.mindmapNodes;
                        return (
                          <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={`study-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                          >
                            <Icon size={14} />
                            {meta.label}
                            {count ? <span className="tab-count">({count})</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="study-body">
                  {selected.status !== 'COMPLETED' && (
                    <div className="study-pending">
                      <div className="pulse-dot" />
                      <h3>
                        {selected.status === 'PROCESSING'
                          ? 'Your suite is being built'
                          : 'Your suite is queued'}
                      </h3>
                      <p>
                        An admin is preparing flashcards, quizzes, and other study assets
                        from your PDF. This page refreshes automatically — you will see
                        content here as soon as it is ready.
                      </p>
                    </div>
                  )}

                  {selected.status === 'COMPLETED' && !selected.hasContent && (
                    <div className="study-pending">
                      <Inbox size={36} />
                      <h3>Marked complete, but empty</h3>
                      <p>
                        This suite has no interactive content yet. Ask your admin to
                        resubmit NotebookLM share links or media for this document.
                      </p>
                    </div>
                  )}

                  {selected.status === 'COMPLETED' && selected.hasContent && activeTab === 'flashcards' && (
                    <FlashcardFlipper cards={selected.flashcards} />
                  )}

                  {selected.status === 'COMPLETED' && selected.hasContent && activeTab === 'quiz' && (
                    <SteppedQuizPlayer questions={selected.quiz} />
                  )}

                  {selected.status === 'COMPLETED' && selected.hasContent && activeTab === 'mindmap' && (
                    <ZoomableMindmapViewer data={selected.mindmap} />
                  )}

                  {selected.status === 'COMPLETED' && selected.hasContent && activeTab === 'podcast' && (
                    <WaveformPodcastPlayer
                      audioUrl={selected.podcast_audio}
                      transcript={selected.transcript}
                    />
                  )}

                  {selected.status === 'COMPLETED' && selected.hasContent && activeTab === 'media' && (
                    <div>
                      {selected.slides.length > 0 && (
                        <>
                          <div className="section-label">Slides</div>
                          <div className="slides-stack">
                            {selected.slides.map((s, i) => (
                              <div key={i} className="slide-card">
                                <p>{s.title}</p>
                                <p>{s.content}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      <div className="section-label">Downloads & media</div>
                      <div className="media-grid">
                        {selected.video_overview && (
                          <a className="media-tile" href={selected.video_overview} target="_blank" rel="noreferrer">
                            <strong>Video overview</strong>
                            <span>Open video</span>
                          </a>
                        )}
                        {selected.infographic && (
                          <a className="media-tile" href={selected.infographic} target="_blank" rel="noreferrer">
                            <strong>Infographic</strong>
                            <span>Open image</span>
                          </a>
                        )}
                        {selected.slide_deck && (
                          <a className="media-tile" href={selected.slide_deck} target="_blank" rel="noreferrer">
                            <strong>Slide deck</strong>
                            <span>Open file</span>
                          </a>
                        )}
                        {selected.study_report_url && (
                          <a className="media-tile" href={selected.study_report_url} target="_blank" rel="noreferrer">
                            <strong>Study report file</strong>
                            <span>Open file</span>
                          </a>
                        )}
                        {selected.data_table && (
                          <a className="media-tile" href={selected.data_table} target="_blank" rel="noreferrer">
                            <strong>Data table</strong>
                            <span>Open file</span>
                          </a>
                        )}
                        {!selected.video_overview &&
                          !selected.infographic &&
                          !selected.slide_deck &&
                          !selected.study_report_url &&
                          !selected.data_table &&
                          selected.slides.length === 0 && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              No media files attached.
                            </p>
                          )}
                      </div>
                    </div>
                  )}

                  {selected.status === 'COMPLETED' && selected.hasContent && activeTab === 'report' && (
                    <div>
                      {selected.report ? (
                        <div className="report-box">{selected.report}</div>
                      ) : selected.study_report_url ? (
                        <a
                          className="btn btn-primary"
                          href={selected.study_report_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', textDecoration: 'none' }}
                        >
                          Open study report
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
