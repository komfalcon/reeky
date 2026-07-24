import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, ClipboardCopy, Send, Loader2, CheckCircle2, UploadCloud, Menu, X, AlertCircle, Eye } from 'lucide-react';
import { api } from '../api';

const STATUS_BADGE = {
  PENDING: { label: 'Pending', color: '#f59e0b' },
  PROCESSING: { label: 'Processing', color: '#3b82f6' },
  COMPLETED: { label: 'Completed', color: '#10b981' },
};

const CloudinaryUploadWidget = ({ fieldName, label, currentUrl, onUploadSuccess }) => {
  const openWidget = () => {
    window.cloudinary.createUploadWidget(
      {
        cloudName: 'x9lbk1ea',
        uploadPreset: 'Reeky Academic Hub',
        sources: ['local', 'url'],
        multiple: false,
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          onUploadSuccess(fieldName, result.info.secure_url);
        }
      }
    ).open();
  };

  return (
    <div className="input-group">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={currentUrl}
          readOnly
          placeholder="Click upload to add file..."
          style={{ opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.4)', cursor: 'not-allowed' }}
        />
        <button
          type="button"
          onClick={openWidget}
          style={{
            background: 'var(--primary)', border: 'none', borderRadius: '8px',
            padding: '0 1rem', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
        >
          <UploadCloud size={20} />
        </button>
      </div>
    </div>
  );
};

export default function QueuePage() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [formData, setFormData] = useState({
    flashcards_url: '',
    quizzes_url: '',
    mindmap_url: '',
    slide_deck_url: '',
    study_report_url: '',
    data_table_url: '',
    infographic_url: '',
    podcast_audio: '',
    video_overview: '',
  });

  const [_taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [taskResult, setTaskResult] = useState(null);
  const [taskError, setTaskError] = useState(null);
  const pollingRef = useRef(null);

  const fetchQueue = useCallback(async () => {
    try {
      const [pendingRes, completedRes] = await Promise.all([
        api.getQueue(),
        api.getCompletedQueue().catch(() => ({ queue: [] })),
      ]);
      const all = [...(pendingRes.queue || []), ...(completedRes.queue || [])];
      setQueue(all);
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const grouped = {
    PENDING: queue.filter(i => i.status === 'PENDING'),
    PROCESSING: queue.filter(i => i.status === 'PROCESSING'),
    COMPLETED: queue.filter(i => i.status === 'COMPLETED'),
  };

  const handleCopyPrompt = () => {
    if (!selectedUser) return;
    navigator.clipboard.writeText(`Title/Topic: ${selectedUser.title || 'None'}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const pollTaskStatus = useCallback(async (id) => {
    try {
      const result = await api.getTaskStatus(id);
      setTaskStatus(result.task_status);
      if (result.task_status === 'COMPLETED') {
        setTaskResult(result.assets || {});
        setTaskError(null);
        if (pollingRef.current) clearInterval(pollingRef.current);
      } else if (result.task_status === 'FAILED') {
        setTaskError('Scraping failed. Please try again.');
        setTaskResult(null);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch (err) {
      console.error("Task status poll error", err);
      // Clear interval on fatal error to prevent browser crash
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, []);

  const startPolling = (id) => {
    setTaskId(id);
    setTaskStatus('PENDING');
    setTaskResult(null);
    setTaskError(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => pollTaskStatus(id), 3000);
    pollTaskStatus(id);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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
      artifact_urls: [
        formData.flashcards_url,
        formData.quizzes_url,
        formData.mindmap_url,
        formData.slide_deck_url,
        formData.study_report_url,
        formData.data_table_url,
        formData.infographic_url,
      ].filter(Boolean),
      podcast_audio: formData.podcast_audio || null,
      video_overview: formData.video_overview || null,
      flashcards_url: formData.flashcards_url || null,
      quizzes_url: formData.quizzes_url || null,
      mindmap_url: formData.mindmap_url || null,
      slide_deck_url: formData.slide_deck_url || null,
      study_report_url: formData.study_report_url || null,
      data_table_url: formData.data_table_url || null,
      infographic_url: formData.infographic_url || null,
    };

    try {
      const res = await api.submitAssets(payload);
      if (res && res.completedDirectly) {
        setTaskId(null);
        setTaskStatus(null);
        setTaskResult(null);
        setTaskError(null);
        setFormData({
          flashcards_url: '', quizzes_url: '', mindmap_url: '',
          slide_deck_url: '', study_report_url: '', data_table_url: '', infographic_url: '',
          podcast_audio: '', video_overview: '',
        });
        setSelectedUser(null);
        fetchQueue();
      } else {
        startPolling(selectedUser.id);
        fetchQueue();
      }
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedUser) return;
    setIsCompleting(true);
    try {
      const mergedAssets = {
        ...(taskResult || {}),
        podcast_audio: formData.podcast_audio || null,
        video_overview: formData.video_overview || null,
        infographic: formData.infographic || null,
        slide_deck: formData.slide_deck || null,
        study_report: formData.study_report || null,
        data_table: formData.data_table || null,
      };
      await api.completeAsset(selectedUser.id, mergedAssets);
      setTaskId(null);
      setTaskStatus(null);
      setTaskResult(null);
      setTaskError(null);
      setFormData({
        flashcards_url: '', quizzes_url: '', mindmap_url: '',
        podcast_audio: '', video_overview: '', infographic: '', slide_deck: '',
        study_report: '', data_table: '',
      });
      setSelectedUser(null);
      fetchQueue();
    } catch (err) {
      console.error("Failed to mark complete", err);
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
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (item.status === 'PROCESSING') {
      startPolling(item.id);
    }
  };

  const statusIcon = (status) => {
    const colors = STATUS_BADGE;
    return (
      <span
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: colors[status]?.color || '#94a3b8',
          marginRight: 6,
          flexShrink: 0,
        }}
      />
    );
  };

  const renderQueueSection = (title, items, statusKey) => {
    if (items.length === 0) return null;
    const color = STATUS_BADGE[statusKey]?.color || '#94a3b8';
    return (
      <>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color,
          marginBottom: '0.75rem',
          marginTop: statusKey !== 'PENDING' ? '1.5rem' : 0,
        }}>
          {title} ({items.length})
        </div>
        {items.map((item) => (
          <div
            key={item.id}
            className={`queue-card ${selectedUser?.id === item.id ? 'active' : ''}`}
            onClick={() => handleSelectUser(item)}
          >
            <h3>{statusIcon(item.status)} {item.title || item.id.slice(0, 8)}</h3>
            <p>Uploaded: {new Date(item.createdAt).toLocaleTimeString()}</p>
            <div className="tag-list">
              <span className="tag">{item.status}</span>
            </div>
          </div>
        ))}
      </>
    );
  };

  const canSubmit = selectedUser && selectedUser.status === 'PENDING';
  const showTaskProgress = taskStatus && taskStatus !== 'COMPLETED' && taskStatus !== 'FAILED';
  const showTaskSuccess = taskStatus === 'COMPLETED' && !isCompleting;
  const showTaskFailure = taskStatus === 'FAILED';
  const isCompleted = selectedUser?.status === 'COMPLETED';

  return (
    <div className="app-container fade-in">
      {/* MOBILE NAV HEADER */}
      <div className="mobile-nav">
        <div className="title" style={{ marginBottom: 0 }}>
          <Users size={24} color="var(--primary)" />
          <h2>Queue</h2>
        </div>
        <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setIsMenuOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {isMenuOpen && (
        <div className="overlay fade-in" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* LEFT SIDEBAR - QUEUE */}
      <div className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="title" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={24} color="var(--primary)" />
            <h2>All Items</h2>
          </div>
          <button className="mobile-close btn-secondary" onClick={() => setIsMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={48} />
            <p>All caught up!</p>
          </div>
        ) : (
          <>
            {renderQueueSection('Pending', grouped.PENDING, 'PENDING')}
            {renderQueueSection('Processing', grouped.PROCESSING, 'PROCESSING')}
            {renderQueueSection('Completed', grouped.COMPLETED, 'COMPLETED')}
          </>
        )}
      </div>

      {/* RIGHT PANEL - PROCESSING BAY */}
      <div className="main-content">
        {!selectedUser ? (
          <div className="empty-state">
            <FileText size={64} />
            <h2>Select a student to process</h2>
            <p>Click on a card in the queue to view their tailored prompt and upload their assets.</p>
          </div>
        ) : (
          <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            {/* STATUS BADGE */}
            <div style={{ marginBottom: '1rem' }}>
              <span className="tag" style={{
                backgroundColor: `${STATUS_BADGE[selectedUser.status]?.color}22`,
                color: STATUS_BADGE[selectedUser.status]?.color,
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
              }}>
                {statusIcon(selectedUser.status)} {selectedUser.status}
              </span>
            </div>

            {/* TAILORED PROMPT BOX */}
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="title" style={{ marginBottom: 0 }}>
                  <FileText size={24} color="var(--primary)" />
                  Tailored Prompt
                </h2>
                <button className="btn btn-secondary" onClick={handleCopyPrompt}>
                  {copied ? <CheckCircle2 size={18} /> : <ClipboardCopy size={18} />}
                  {copied ? 'Copied!' : 'Copy to NotebookLM'}
                </button>
              </div>

              <div className="prompt-box">
                <div className="prompt-text">
                  <strong>Title/Topic:</strong> {selectedUser.title || 'N/A'}{'\n'}
                  <strong>PDF Target:</strong> <a href={selectedUser.originalFileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>View PDF</a>
                </div>
              </div>
            </div>

            {/* ASSET SUBMISSION FORM */}
            {!isCompleted && (
              <div className="glass-panel">
                <h2 className="title">Submit Generated Assets</h2>
                <form onSubmit={handleSubmit}>
                  <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Interactive Links */}
                    <div>
                      <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>NotebookLM Share Links</h3>
                      <div className="input-group">
                        <label>Flashcards URL</label>
                        <input name="flashcards_url" value={formData.flashcards_url} onChange={handleInputChange} placeholder="https://notebooklm.google.com/..." />
                      </div>
                      <div className="input-group">
                        <label>Quizzes URL</label>
                        <input name="quizzes_url" value={formData.quizzes_url} onChange={handleInputChange} placeholder="https://notebooklm.google.com/..." />
                      </div>
                      <div className="input-group">
                        <label>Mindmap URL</label>
                        <input name="mindmap_url" value={formData.mindmap_url} onChange={handleInputChange} placeholder="https://notebooklm.google.com/..." />
                      </div>
                    </div>

                    {/* Static Media */}
                    <div>
                      <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>Static Media Overrides</h3>
                      <CloudinaryUploadWidget
                        label="Podcast Audio"
                        fieldName="podcast_audio"
                        currentUrl={formData.podcast_audio}
                        onUploadSuccess={(field, url) => setFormData(prev => ({ ...prev, [field]: url }))}
                      />
                      <CloudinaryUploadWidget
                        label="Video Overview"
                        fieldName="video_overview"
                        currentUrl={formData.video_overview}
                        onUploadSuccess={(field, url) => setFormData(prev => ({ ...prev, [field]: url }))}
                      />
                      <div className="input-group">
                        <label>Study Report NotebookLM Shared Link</label>
                        <input
                          type="url"
                          name="study_report_url"
                          value={formData.study_report_url}
                          onChange={handleInputChange}
                          placeholder="https://notebooklm.google.com/notebook/.../artifact/..."
                        />
                      </div>
                      <div className="input-group">
                        <label>Data Table NotebookLM Shared Link</label>
                        <input
                          type="url"
                          name="data_table_url"
                          value={formData.data_table_url}
                          onChange={handleInputChange}
                          placeholder="https://notebooklm.google.com/notebook/.../artifact/..."
                        />
                      </div>
                      <div className="input-group">
                        <label>Slide Deck NotebookLM Shared Link</label>
                        <input
                          type="url"
                          name="slide_deck_url"
                          value={formData.slide_deck_url}
                          onChange={handleInputChange}
                          placeholder="https://notebooklm.google.com/notebook/.../artifact/..."
                        />
                      </div>
                      <div className="input-group">
                        <label>Infographic NotebookLM Shared Link</label>
                        <input
                          type="url"
                          name="infographic_url"
                          value={formData.infographic_url}
                          onChange={handleInputChange}
                          placeholder="https://notebooklm.google.com/notebook/.../artifact/..."
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                    {/* TASK STATUS INDICATOR */}
                    {showTaskProgress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.9rem' }}>
                        <Loader2 size={18} className="spin" />
                        Scraping NotebookLM...
                      </div>
                    )}
                    {showTaskFailure && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.9rem' }}>
                        <AlertCircle size={18} />
                        {taskError || 'Scraping failed'}
                      </div>
                    )}
                    {showTaskSuccess && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
                        <CheckCircle2 size={18} />
                        Scraped: {taskResult?.flashcards?.length || 0} flashcards, {taskResult?.quizzes?.length || 0} quizzes
                      </div>
                    )}

                    {canSubmit && (
                      <button type="submit" className="btn" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                        {isSubmitting ? 'Processing...' : 'Submit to Backend Scraper'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* MARK COMPLETE BUTTON */}
            {showTaskSuccess && (
              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <CheckCircle2 size={48} color="var(--success)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>Assets Scraped Successfully</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  {taskResult?.flashcards?.length || 0} flashcards, {taskResult?.quizzes?.length || 0} quizzes
                  {taskResult?.mindmap ? ', 1 mindmap' : ''} extracted
                </p>
                <button className="btn" onClick={handleMarkComplete} disabled={isCompleting}>
                  {isCompleting ? <Loader2 size={20} className="spin" /> : <CheckCircle2 size={20} />}
                  {isCompleting ? 'Finalizing...' : 'Mark Complete & Notify Student'}
                </button>
              </div>
            )}

            {/* COMPLETED STATE */}
            {isCompleted && (
              <div className="glass-panel" style={{ textAlign: 'center' }}>
                <CheckCircle2 size={48} color="var(--success)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ marginBottom: '0.5rem' }}>Assets Completed</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  This student's assets have been marked complete.
                </p>
                <button
                  className="btn btn-secondary"
                  style={{ marginTop: '1rem' }}
                  onClick={() => navigate('/completed')}
                >
                  <Eye size={18} /> View All Completed
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
