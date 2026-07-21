import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search,
  Menu,
  X,
  Inbox,
  Layers,
  FileCheck,
  GitBranch,
  Mic,
  Film,
} from 'lucide-react';
import { api } from '../api';

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

function summarize(item) {
  const assets = parseAssets(item.assets);
  const interactive = assets.interactive_assets || {};
  const downloadable = assets.downloadable_files || {};
  const flashcards = Array.isArray(assets.flashcards)
    ? assets.flashcards
    : Array.isArray(interactive.flashcards)
      ? interactive.flashcards
      : [];
  const quizzes = Array.isArray(assets.quizzes)
    ? assets.quizzes
    : Array.isArray(assets.quiz)
      ? assets.quiz
      : Array.isArray(interactive.quizzes)
        ? interactive.quizzes
        : [];
  const mindmap = assets.mindmap || interactive.mindmap || null;
  const podcast = assets.podcast_audio || downloadable.podcast_audio || null;
  const video = assets.video_overview || downloadable.video_overview || null;
  const slides = assets.slide_deck || downloadable.slide_deck || null;
  const report = assets.study_report || assets.report || null;
  const table = assets.data_table || downloadable.data_table || null;
  const infographic = assets.infographic || downloadable.infographic || null;

  return {
    flashcards: flashcards.length,
    quizzes: quizzes.length,
    mindmap: Boolean(mindmap),
    podcast: Boolean(podcast),
    video: Boolean(video),
    slides: Boolean(slides),
    report: Boolean(report),
    table: Boolean(table),
    infographic: Boolean(infographic),
    assets: {
      ...assets,
      flashcards,
      quizzes,
      mindmap,
      podcast_audio: podcast,
      video_overview: video,
      slide_deck: slides,
      study_report: report,
      data_table: table,
      infographic,
    },
  };
}

export default function CompletedPage({ onQueueChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchCompleted = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCompletedQueue();
      const list = res.queue || [];
      setItems(list);
      setError('');
      onQueueChange?.();
      setSelectedId((prev) => {
        if (prev && list.some((i) => i.id === prev)) return prev;
        return list[0]?.id || null;
      });
    } catch (err) {
      console.error('Failed to fetch completed', err);
      setError(err.message || 'Failed to load archive');
    } finally {
      setLoading(false);
    }
  }, [onQueueChange]);

  useEffect(() => {
    fetchCompleted();
  }, [fetchCompleted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [item.title, item.studentName, item.studentEmail]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  const selected = useMemo(
    () => filtered.find((i) => i.id === selectedId) || items.find((i) => i.id === selectedId) || null,
    [filtered, items, selectedId]
  );

  const summary = selected ? summarize(selected) : null;

  return (
    <div className="app-container fade-in">
      <div className="mobile-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontWeight: 700 }}>
          <CheckCircle2 size={20} color="var(--success)" />
          Archive
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
              <CheckCircle2 size={18} color="var(--success)" />
              Completed
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
                placeholder="Search completed suites…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '0.55rem' }} onClick={fetchCompleted}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        <div className="sidebar-list">
          <div className="stats-row">
            <div className="stat-chip"><strong>{items.length}</strong> delivered</div>
          </div>

          {loading && items.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading archive…</p>
          )}

          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <Inbox size={40} />
              <h3>No completed suites</h3>
              <p>Finished jobs will show up here with a full content breakdown.</p>
            </div>
          )}

          {filtered.map((item) => {
            const s = summarize(item);
            return (
              <button
                key={item.id}
                type="button"
                className={`queue-card ${selectedId === item.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedId(item.id);
                  setIsMenuOpen(false);
                }}
              >
                <div className="queue-card-top">
                  <h3>{item.title || 'Untitled'}</h3>
                  <span className="status-pill COMPLETED">Done</span>
                </div>
                <p>{item.studentName || item.studentEmail || 'Student'}</p>
                <p>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
                <div className="tag-list">
                  {s.flashcards > 0 && <span className="tag">{s.flashcards} cards</span>}
                  {s.quizzes > 0 && <span className="tag">{s.quizzes} quiz</span>}
                  {s.mindmap && <span className="tag">Mindmap</span>}
                  {s.podcast && <span className="tag">Podcast</span>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="main-content">
        {error && (
          <div className="status-line err" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {!selected ? (
          <div className="empty-state">
            <CheckCircle2 size={56} />
            <h2>Select a completed suite</h2>
            <p>Inspect what was delivered to each student — flashcards, quizzes, media, and source PDF.</p>
          </div>
        ) : (
          <div className="fade-in" style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}>
            <div className="fulfill-header">
              <div>
                <div style={{ marginBottom: '0.55rem' }}>
                  <span className="status-pill COMPLETED">COMPLETED</span>
                </div>
                <h1>{selected.title || 'Untitled document'}</h1>
                <p className="fulfill-sub">
                  {selected.studentName || 'Student'}
                  {selected.studentEmail ? ` · ${selected.studentEmail}` : ''}
                  {selected.createdAt ? ` · ${new Date(selected.createdAt).toLocaleString()}` : ''}
                </p>
              </div>
              {selected.originalFileUrl && (
                <a
                  className="btn btn-secondary"
                  href={selected.originalFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={16} /> Source PDF
                </a>
              )}
            </div>

            <section className="glass-panel">
              <h2 className="panel-title">Delivered content</h2>
              <div className="completed-detail-grid">
                <div className="detail-tile">
                  <strong>{summary.flashcards}</strong>
                  <span><Layers size={12} style={{ marginRight: 4 }} />Flashcards</span>
                </div>
                <div className="detail-tile">
                  <strong>{summary.quizzes}</strong>
                  <span><FileCheck size={12} style={{ marginRight: 4 }} />Quiz questions</span>
                </div>
                <div className="detail-tile">
                  <strong>{summary.mindmap ? 'Yes' : '—'}</strong>
                  <span><GitBranch size={12} style={{ marginRight: 4 }} />Mindmap</span>
                </div>
                <div className="detail-tile">
                  <strong>{summary.podcast ? 'Yes' : '—'}</strong>
                  <span><Mic size={12} style={{ marginRight: 4 }} />Podcast</span>
                </div>
                <div className="detail-tile">
                  <strong>{summary.video || summary.slides || summary.infographic || summary.table ? 'Yes' : '—'}</strong>
                  <span><Film size={12} style={{ marginRight: 4 }} />Media files</span>
                </div>
              </div>

              <div className="media-links">
                {summary.assets.podcast_audio && (
                  <a className="btn btn-secondary" href={summary.assets.podcast_audio} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    Podcast
                  </a>
                )}
                {summary.assets.video_overview && (
                  <a className="btn btn-secondary" href={summary.assets.video_overview} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    Video
                  </a>
                )}
                {summary.assets.infographic && (
                  <a className="btn btn-secondary" href={summary.assets.infographic} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    Infographic
                  </a>
                )}
                {summary.assets.slide_deck && (
                  <a className="btn btn-secondary" href={summary.assets.slide_deck} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    Slides
                  </a>
                )}
                {summary.assets.study_report && typeof summary.assets.study_report === 'string' && summary.assets.study_report.startsWith('http') && (
                  <a className="btn btn-secondary" href={summary.assets.study_report} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    Report file
                  </a>
                )}
                {summary.assets.data_table && (
                  <a className="btn btn-secondary" href={summary.assets.data_table} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    Data table
                  </a>
                )}
              </div>
            </section>

            {(summary.flashcards > 0 || summary.quizzes > 0) && (
              <section className="glass-panel">
                <h2 className="panel-title">Quick preview</h2>
                {summary.flashcards > 0 && (
                  <>
                    <div className="section-label">First flashcards</div>
                    <div className="prompt-box">
                      <div className="prompt-text">
                        {summary.assets.flashcards.slice(0, 3).map((fc, i) => {
                          const q = fc.f || fc.q || fc.question || '';
                          const a = fc.b || fc.a || fc.answer || '';
                          return `${i + 1}. Q: ${q}\n   A: ${a}`;
                        }).join('\n\n')}
                      </div>
                    </div>
                  </>
                )}
                {summary.quizzes > 0 && (
                  <>
                    <div className="section-label">First quiz question</div>
                    <div className="prompt-box">
                      <div className="prompt-text">
                        {(() => {
                          const list = summary.assets.quizzes || summary.assets.quiz || [];
                          const q = list[0];
                          if (!q) return '—';
                          return q.question || q.q || q.text || '—';
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
