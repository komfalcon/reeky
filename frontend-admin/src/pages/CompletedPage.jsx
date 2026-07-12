import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, ExternalLink, Calendar } from 'lucide-react';
import { api } from '../api';

export default function CompletedPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompleted = useCallback(async () => {
    try {
      const res = await api.getCompletedQueue();
      setItems(res.queue || []);
    } catch (err) {
      console.error("Failed to fetch completed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompleted();
  }, [fetchCompleted]);

  return (
    <div className="app-container fade-in">
      <div className="sidebar">
        <div className="title" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={24} color="var(--success)" />
            <h2>Completed</h2>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '1rem' }}
          onClick={() => navigate('/queue')}
        >
          <ArrowLeft size={18} /> Back to Queue
        </button>

        {loading ? (
          <div className="empty-state">
            <p>Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={48} />
            <p>No completed items yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="queue-card">
              <h3 style={{ color: 'var(--success)' }}>{item.title || item.id.slice(0, 8)}</h3>
              <p>Completed: {new Date(item.createdAt).toLocaleString()}</p>
              <div className="tag-list">
                <span className="tag" style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                  <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Complete
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="main-content">
        {items.length === 0 && !loading ? (
          <div className="empty-state">
            <CheckCircle2 size={64} />
            <h2>No completed assets yet</h2>
            <p>Process student submissions from the queue to see them here.</p>
          </div>
        ) : (
          <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1 className="title" style={{ marginBottom: 0 }}>
                <CheckCircle2 size={28} color="var(--success)" />
                Completed Assets
              </h1>
              <button className="btn btn-secondary" onClick={fetchCompleted}>
                <Calendar size={18} /> Refresh
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {items.map((item) => {
                let assets = {};
                try {
                  assets = typeof item.assets === 'string' ? JSON.parse(item.assets) : (item.assets || {});
                } catch { }
                const hasMedia = assets.podcast_audio || assets.video_overview || assets.slide_deck || assets.study_report;
                const flashCount = assets.flashcards?.length || 0;
                const quizCount = assets.quizzes?.length || 0;

                return (
                  <div key={item.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: '0.25rem' }}>{item.title || 'Untitled'}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {flashCount > 0 && <span className="tag">{flashCount} flashcards</span>}
                        {quizCount > 0 && <span className="tag">{quizCount} quizzes</span>}
                        {assets.mindmap && <span className="tag">Mindmap</span>}
                        {hasMedia && <span className="tag">Has media files</span>}
                      </div>
                    </div>
                    {item.originalFileUrl && (
                      <a
                        href={item.originalFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        <ExternalLink size={16} /> View PDF
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
