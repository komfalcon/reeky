import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  ClipboardCopy,
  Send,
  Loader2,
  CheckCircle2,
  UploadCloud,
  Menu,
  X,
  AlertCircle,
  Eye,
  ExternalLink,
  Info,
  Terminal,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../api';
import AdminPromptCompiler from '../components/AdminPromptCompiler';

const STYLE_MAP = {
  visual: { label: 'Visual', color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  auditory: { label: 'Auditory', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  textual: { label: 'Textual', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
};

const DEPTH_MAP = {
  simple: { label: 'Simple', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  executive: { label: 'Executive', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  detailed: { label: 'In-depth', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
};

const TONE_MAP = {
  academic: { label: 'Academic', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
  conversational: { label: 'Conversational', color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  elif5: { label: 'ELI5', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
};

const PACING_MAP = {
  fast: { label: 'Fast', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  'deep-dive': { label: 'Deep-dive', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
};

const EMPTY_FORM = {
  flashcards_url: '',
  quizzes_url: '',
  mindmap_url: '',
  podcast_audio: '',
  video_overview: '',
  infographic: '',
  slide_deck: '',
  study_report: '',
  data_table: '',
};

function PreferenceBadge({ mapKey, map }) {
  const entry = map[mapKey];
  if (!entry) return null;
  return (
    <span className="pref-badge" style={{ background: entry.bg, color: entry.color, border: `1px solid ${entry.color}33` }}>
      {entry.label}
    </span>
  );
}

function parsePrefs(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function parseAssets(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed) || {};
      } catch {
        return {};
      }
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** MySQL JSON columns may arrive as string or already-parsed array. */
function parseAssetsRequested(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') {
        const nested = JSON.parse(parsed);
        return Array.isArray(nested) ? nested : [];
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

const UrlInputField = ({ fieldName, label, currentUrl, onChange }) => {
  return (
    <div className="input-group">
      <label>{label}</label>
      <input
        type="url"
        value={currentUrl}
        onChange={(e) => onChange(fieldName, e.target.value)}
        placeholder="Paste direct URL (e.g. https://...)"
      />
      {currentUrl ? (
        <a href={currentUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: 4, display: 'inline-block' }}>
          Preview
        </a>
      ) : null}
    </div>
  );
};

export default function QueuePage({ onQueueChange }) {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompiler, setShowCompiler] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('open');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [taskResult, setTaskResult] = useState(null);
  const [taskError, setTaskError] = useState(null);
  const [loadError, setLoadError] = useState('');
  const pollingRef = useRef(null);

  const fetchQueue = useCallback(async () => {
    try {
      const [pendingRes, completedRes] = await Promise.all([
        api.getQueue(),
        api.getCompletedQueue().catch(() => ({ queue: [] })),
      ]);
      const all = [...(pendingRes.queue || []), ...(completedRes.queue || [])];
      setQueue(all);
      setLoadError('');
      onQueueChange?.();
    } catch (err) {
      console.error('Failed to fetch queue', err);
      setLoadError(err.message || 'Failed to load queue');
    }
  }, [onQueueChange]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const resetForm = () => setFormData(EMPTY_FORM);

  const pollTaskStatus = useCallback(
    async (celeryTaskId, assetId) => {
      try {
        const result = await api.getTaskStatus(celeryTaskId, assetId);
        setTaskStatus(result.task_status);
      if (result.task_status === 'SUCCESS') {
        setTaskResult(result.interactive_assets || {});
        setTaskError(null);
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (result.autoCompleted) fetchQueue();
      } else if (result.task_status === 'FAILURE') {
        setTaskError(result.error || 'Scraping failed. Please try again.');
        setTaskResult(null);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
      } catch (err) {
        console.error('Task status poll error', err);
      }
    },
    [fetchQueue]
  );

  const startPolling = (celeryTaskId, assetId) => {
    if (!celeryTaskId) {
      setTaskError('No scraper task id returned. Check the asset engine.');
      return;
    }
    setTaskId(celeryTaskId);
    setTaskStatus('PENDING');
    setTaskResult(null);
    setTaskError(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => pollTaskStatus(celeryTaskId, assetId), 3000);
    pollTaskStatus(celeryTaskId, assetId);
  };

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  const handleCopyPrompt = () => {
    if (!selectedUser) return;
    const prefs = parsePrefs(selectedUser.studentPreferences);
    const depthLabel = prefs?.explanationDepth ? DEPTH_MAP[prefs.explanationDepth]?.label || prefs.explanationDepth : 'Not set';
    const styleLabel = prefs?.learningStyle ? STYLE_MAP[prefs.learningStyle]?.label || prefs.learningStyle : 'Not set';
    const toneLabel = prefs?.tone ? TONE_MAP[prefs.tone]?.label || prefs.tone : 'Not set';
    const pacingLabel = prefs?.examPacing ? PACING_MAP[prefs.examPacing]?.label || prefs.examPacing : 'Not set';

    const prompt = `Title: ${selectedUser.title || 'N/A'}
Learning Profile:
- Depth: ${depthLabel}
- Primary Medium: ${styleLabel}
- Tone: ${toneLabel}
- Pacing: ${pacingLabel}
${selectedUser.customInstructions ? `\nSpecial Instructions:\n"${selectedUser.customInstructions}"` : ''}`;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    setTaskId(null);
    setTaskStatus(null);
    setTaskResult(null);
    setTaskError(null);

    const payload = {
      assetId: selectedUser.id,
      artifact_urls: [formData.flashcards_url, formData.quizzes_url, formData.mindmap_url].filter(Boolean),
      podcast_audio: formData.podcast_audio || null,
      video_overview: formData.video_overview || null,
      infographic: formData.infographic || null,
      slide_deck: formData.slide_deck || null,
      study_report: formData.study_report || null,
      data_table: formData.data_table || null,
    };

    try {
      const res = await api.submitAssets(payload);
      if (res?.completedDirectly) {
        setTaskId(null);
        setTaskStatus(null);
        setTaskResult(null);
        setTaskError(null);
        resetForm();
        setSelectedUser(null);
        fetchQueue();
      } else {
        startPolling(res.taskId, selectedUser.id);
        fetchQueue();
      }
    } catch (err) {
      console.error('Submission failed', err);
      setTaskError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedUser) return;
    setIsCompleting(true);
    try {
      await api.completeAsset(selectedUser.id, {
        flashcards: taskResult?.flashcards || [],
        quizzes: taskResult?.quizzes || [],
        mindmap: taskResult?.mindmap || null,
        podcast_audio: formData.podcast_audio || null,
        video_overview: formData.video_overview || null,
        infographic: formData.infographic || null,
        slide_deck: formData.slide_deck || null,
        study_report: formData.study_report || null,
        data_table: formData.data_table || null,
      });
      setTaskId(null);
      setTaskStatus(null);
      setTaskResult(null);
      setTaskError(null);
      resetForm();
      setSelectedUser(null);
      fetchQueue();
    } catch (err) {
      console.error('Failed to mark complete', err);
      setTaskError(err.message || 'Failed to mark complete');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSelectUser = (item) => {
    setSelectedUser(item);
    setIsMenuOpen(false);
    setTaskId(null);
    setTaskStatus(null);
    setTaskResult(null);
    setTaskError(null);
    resetForm();
    if (pollingRef.current) clearInterval(pollingRef.current);

    const assets = parseAssets(item.assets);
    if (item.status === 'PROCESSING') {
      const celeryId = assets?._celeryTaskId || null;
      if (celeryId) startPolling(celeryId, item.id);
      // Prefill media already saved while processing
      setFormData((prev) => ({
        ...prev,
        podcast_audio: assets.podcast_audio || '',
        video_overview: assets.video_overview || '',
        infographic: assets.infographic || '',
        slide_deck: assets.slide_deck || '',
        study_report: assets.study_report || '',
        data_table: assets.data_table || '',
      }));
    }
  };

  const grouped = useMemo(() => ({
    PENDING: queue.filter((i) => i.status === 'PENDING'),
    PROCESSING: queue.filter((i) => i.status === 'PROCESSING'),
    COMPLETED: queue.filter((i) => i.status === 'COMPLETED'),
  }), [queue]);

  const filteredList = useMemo(() => {
    let items = queue;
    if (filter === 'open') items = queue.filter((i) => i.status !== 'COMPLETED');
    else if (filter !== 'all') items = queue.filter((i) => i.status === filter);

    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [item.title, item.studentName, item.studentEmail, item.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [queue, filter, search]);

  const prefs = parsePrefs(selectedUser?.studentPreferences);
  const canSubmit = selectedUser && selectedUser.status === 'PENDING';
  const showTaskProgress = taskStatus && taskStatus !== 'SUCCESS' && taskStatus !== 'FAILURE';
  const showTaskSuccess = taskStatus === 'SUCCESS' && !isCompleting;
  // Show scrape FAILURE, or any taskError (including mark-complete failures after SUCCESS)
  const showTaskFailure =
    taskStatus === 'FAILURE' || Boolean(taskError && !showTaskProgress);
  const isCompleted = selectedUser?.status === 'COMPLETED';
  const requested = parseAssetsRequested(selectedUser?.assetsRequested);

  const renderCard = (item) => {
    const tags = parseAssetsRequested(item.assetsRequested);
    return (
      <button
        key={item.id}
        type="button"
        className={`queue-card ${selectedUser?.id === item.id ? 'active' : ''}`}
        onClick={() => handleSelectUser(item)}
      >
        <div className="queue-card-top">
          <h3>{item.title || 'Untitled document'}</h3>
          <span className={`status-pill ${item.status}`}>{item.status}</span>
        </div>
        <p>{item.studentName || item.studentEmail || 'Unknown student'}</p>
        <p>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
        {tags.length > 0 && (
          <div className="tag-list">
            {tags.slice(0, 3).map((a) => (
              <span key={a} className="tag">{a}</span>
            ))}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="app-container fade-in">
      <div className="mobile-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontWeight: 700 }}>
          <Users size={20} color="var(--primary)" />
          Queue
        </div>
        <button type="button" className="btn btn-secondary" style={{ padding: '0.45rem' }} onClick={() => setIsMenuOpen(true)}>
          <Menu size={20} />
        </button>
      </div>

      {isMenuOpen && <div className="overlay fade-in" onClick={() => setIsMenuOpen(false)} />}

      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>
              <Users size={18} color="var(--primary)" />
              Work queue
            </h2>
            <button type="button" className="mobile-close" onClick={() => setIsMenuOpen(false)}>
              <X size={22} />
            </button>
          </div>

          <div className="sidebar-tools">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
              <input
                className="sidebar-search"
                style={{ paddingLeft: '2rem' }}
                placeholder="Search title, student, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-row">
              {[
                ['open', 'Open'],
                ['PENDING', 'Pending'],
                ['PROCESSING', 'Building'],
                ['COMPLETED', 'Done'],
                ['all', 'All'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`filter-chip ${filter === key ? 'active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '0.55rem' }} onClick={fetchQueue}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        <div className="sidebar-list">
          {loadError && (
            <div className="status-line err" style={{ marginBottom: '0.75rem' }}>
              <AlertCircle size={14} /> {loadError}
            </div>
          )}

          <div className="stats-row">
            <div className="stat-chip"><strong>{grouped.PENDING.length}</strong> pending</div>
            <div className="stat-chip"><strong>{grouped.PROCESSING.length}</strong> building</div>
            <div className="stat-chip"><strong>{grouped.COMPLETED.length}</strong> done</div>
          </div>

          {filteredList.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={40} />
              <h3>Nothing here</h3>
              <p>No jobs match this filter. New student uploads will appear automatically.</p>
            </div>
          ) : (
            filteredList.map(renderCard)
          )}
        </div>
      </aside>

      <main className="main-content">
        {!selectedUser ? (
          <div className="empty-state">
            <FileText size={56} />
            <h2>Select a job to fulfill</h2>
            <p>
              Open a pending request, copy the learning prompt into NotebookLM, paste share links,
              upload media, then submit for scraping.
            </p>
          </div>
        ) : (
          <div className="fade-in" style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}>
            <div className="fulfill-header">
              <div>
                <div style={{ marginBottom: '0.55rem' }}>
                  <span className={`status-pill ${selectedUser.status}`}>{selectedUser.status}</span>
                </div>
                <h1>{selectedUser.title || 'Untitled document'}</h1>
                <p className="fulfill-sub">
                  {selectedUser.studentName || 'Student'}
                  {selectedUser.studentEmail ? ` · ${selectedUser.studentEmail}` : ''}
                  {selectedUser.createdAt ? ` · ${new Date(selectedUser.createdAt).toLocaleString()}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedUser.originalFileUrl && (
                  <a
                    className="btn btn-secondary"
                    href={selectedUser.originalFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink size={16} /> Open PDF
                  </a>
                )}
                <button type="button" className="btn btn-secondary" onClick={handleCopyPrompt}>
                  {copied ? <CheckCircle2 size={16} /> : <ClipboardCopy size={16} />}
                  {copied ? 'Copied' : 'Copy prompt'}
                </button>
              </div>
            </div>

            <section className="glass-panel">
              <h2 className="panel-title"><span className="step">1</span> Student brief</h2>
              <div className="meta-grid">
                <div className="meta-item">
                  <label>Name</label>
                  <div>{selectedUser.studentName || '—'}</div>
                </div>
                <div className="meta-item">
                  <label>Email</label>
                  <div style={{ color: 'var(--primary)' }}>{selectedUser.studentEmail || '—'}</div>
                </div>
                <div className="meta-item">
                  <label>Requested assets</label>
                  <div>{requested?.length ? requested.join(', ') : 'Not specified'}</div>
                </div>
              </div>
              {prefs && (
                <div className="pref-row">
                  {prefs.explanationDepth && <PreferenceBadge mapKey={prefs.explanationDepth} map={DEPTH_MAP} />}
                  {prefs.learningStyle && <PreferenceBadge mapKey={prefs.learningStyle} map={STYLE_MAP} />}
                  {prefs.tone && <PreferenceBadge mapKey={prefs.tone} map={TONE_MAP} />}
                  {prefs.examPacing && <PreferenceBadge mapKey={prefs.examPacing} map={PACING_MAP} />}
                </div>
              )}
              {selectedUser.customInstructions && (
                <div style={{ marginTop: '0.95rem' }}>
                  <div className="panel-title" style={{ marginBottom: '0.45rem', fontSize: '0.85rem' }}>
                    <Info size={16} color="var(--primary)" /> Document notes
                  </div>
                  <div className="notes-box">&ldquo;{selectedUser.customInstructions}&rdquo;</div>
                </div>
              )}
            </section>

            <section className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <h2 className="panel-title" style={{ marginBottom: 0 }}>
                  <span className="step">2</span> NotebookLM prompt
                </h2>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompiler((v) => !v)}>
                  <Terminal size={15} />
                  {showCompiler ? 'Hide sandbox' : 'Prompt sandbox'}
                </button>
              </div>
              <div className="prompt-box">
                <div className="prompt-text">
                  {`Title: ${selectedUser.title || 'N/A'}
PDF: ${selectedUser.originalFileUrl || 'N/A'}
${selectedUser.customInstructions ? `Notes: ${selectedUser.customInstructions}` : 'Notes: none'}`}
                </div>
              </div>
              {showCompiler && <div style={{ marginTop: '1rem' }}><AdminPromptCompiler /></div>}
            </section>

            {!isCompleted && (
              <section className="glass-panel">
                <h2 className="panel-title"><span className="step">3</span> Submit assets</h2>
                <form onSubmit={handleSubmit}>
                  <div className="responsive-grid">
                    <div>
                      <h3 className="col-title">NotebookLM share links</h3>
                      <div className="input-group">
                        <label>Flashcards URL</label>
                        <input
                          name="flashcards_url"
                          value={formData.flashcards_url}
                          onChange={(e) => setFormData({ ...formData, flashcards_url: e.target.value })}
                          placeholder="https://notebooklm.google.com/..."
                        />
                      </div>
                      <div className="input-group">
                        <label>Quizzes URL</label>
                        <input
                          name="quizzes_url"
                          value={formData.quizzes_url}
                          onChange={(e) => setFormData({ ...formData, quizzes_url: e.target.value })}
                          placeholder="https://notebooklm.google.com/..."
                        />
                      </div>
                      <div className="input-group">
                        <label>Mindmap URL</label>
                        <input
                          name="mindmap_url"
                          value={formData.mindmap_url}
                          onChange={(e) => setFormData({ ...formData, mindmap_url: e.target.value })}
                          placeholder="https://notebooklm.google.com/..."
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="col-title">Static media</h3>
                      <UrlInputField
                        label="Podcast audio"
                        fieldName="podcast_audio"
                        currentUrl={formData.podcast_audio}
                        onChange={(field, url) => setFormData((prev) => ({ ...prev, [field]: url }))}
                      />
                      <UrlInputField
                        label="Video overview"
                        fieldName="video_overview"
                        currentUrl={formData.video_overview}
                        onChange={(field, url) => setFormData((prev) => ({ ...prev, [field]: url }))}
                      />
                      <UrlInputField
                        label="Infographic"
                        fieldName="infographic"
                        currentUrl={formData.infographic}
                        onChange={(field, url) => setFormData((prev) => ({ ...prev, [field]: url }))}
                      />
                      <UrlInputField
                        label="Slide deck"
                        fieldName="slide_deck"
                        currentUrl={formData.slide_deck}
                        onChange={(field, url) => setFormData((prev) => ({ ...prev, [field]: url }))}
                      />
                      <UrlInputField
                        label="Study report"
                        fieldName="study_report"
                        currentUrl={formData.study_report}
                        onChange={(field, url) => setFormData((prev) => ({ ...prev, [field]: url }))}
                      />
                      <UrlInputField
                        label="Data table"
                        fieldName="data_table"
                        currentUrl={formData.data_table}
                        onChange={(field, url) => setFormData((prev) => ({ ...prev, [field]: url }))}
                      />
                    </div>
                  </div>

                  <div className="action-bar">
                    {showTaskProgress && (
                      <div className="status-line warn">
                        <Loader2 size={16} className="spin" /> Scraping NotebookLM…
                      </div>
                    )}
                    {showTaskFailure && (
                      <div className="status-line err">
                        <AlertCircle size={16} /> {taskError || 'Scraping failed'}
                      </div>
                    )}
                    {showTaskSuccess && (
                      <div className="status-line ok">
                        <CheckCircle2 size={16} />
                        Scraped {taskResult?.flashcards?.length || 0} cards, {taskResult?.quizzes?.length || 0} quiz Qs
                        {taskResult?.mindmap ? ', mindmap' : ''}
                      </div>
                    )}
                    {canSubmit && (
                      <button type="submit" className="btn" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                        {isSubmitting ? 'Submitting…' : 'Submit to scraper'}
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            {showTaskSuccess && (
              <section className="glass-panel success-banner">
                <CheckCircle2 size={42} color="var(--success)" />
                <h3>Scrape finished</h3>
                <p>
                  {taskResult?.flashcards?.length || 0} flashcards · {taskResult?.quizzes?.length || 0} quizzes
                  {taskResult?.mindmap ? ' · mindmap' : ''}. If auto-complete did not run, finalize below.
                </p>
                <button type="button" className="btn btn-success" onClick={handleMarkComplete} disabled={isCompleting}>
                  {isCompleting ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
                  {isCompleting ? 'Finalizing…' : 'Mark complete for student'}
                </button>
              </section>
            )}

            {isCompleted && (
              <section className="glass-panel success-banner">
                <CheckCircle2 size={42} color="var(--success)" />
                <h3>Delivered to student</h3>
                <p>This suite is complete and visible in the student library.</p>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/completed')}>
                  <Eye size={16} /> Open archive
                </button>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
