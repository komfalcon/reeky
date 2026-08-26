import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookmarkCheck, ClipboardList, FileText, StickyNote, HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

const instrumentLabels = {
  podcast: 'Listen',
  report: 'Read',
  flashcards: 'Recall',
  quiz: 'Test',
  mindmap: 'Map',
  data_table: 'Compare',
  slides: 'Present',
  video: 'Watch',
  infographic: 'Scan',
};

function getMemoryEntries(assets, ownerKey) {
  const entries = [];
  assets.forEach(asset => {
    Object.entries(instrumentLabels).forEach(([instrument, label]) => {
      const key = `reeky_memory_${ownerKey}_${asset.id}_${instrument}`;
      try {
        const memory = JSON.parse(localStorage.getItem(key) || 'null');
        if (memory?.bookmarked || memory?.note?.trim()) {
          entries.push({
            key,
            assetId: asset.id,
            title: asset.title || 'Untitled learning kit',
            instrument,
            label,
            note: memory.note?.trim() || '',
            bookmarked: Boolean(memory.bookmarked),
            savedAt: memory.savedAt || '',
          });
        }
      } catch {
        // Ignore malformed local memory entries.
      }
    });
  });
  return entries.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

export default function ReviewPage() {
  const { token, user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageBytes, setStorageBytes] = useState(0);
  const [storageRefreshing, setStorageRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    api.getAssets(token)
      .then(data => setAssets(data || []))
      .catch(() => {
        const cached = Object.keys(localStorage)
          .filter(key => key.startsWith(`reeky_assets_cache_${user?.id || user?.email || 'current'}`))
          .map(key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return []; } })
          .find(value => Array.isArray(value));
        setAssets(cached || []);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, navigate, token, user?.id, user?.email]);

  const ownerKey = user?.id || user?.email || 'current';
  const entries = useMemo(() => getMemoryEntries(assets, ownerKey), [assets, ownerKey]);
  const offlineKits = useMemo(() => assets.filter(asset => localStorage.getItem(`reeky_text_instruments_${ownerKey}_${asset.id}`)), [assets, ownerKey, storageBytes]);

  const refreshStorage = async () => {
    setStorageRefreshing(true);
    let bytes = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.includes(`reeky_${ownerKey}`) || key.startsWith('reeky_theme')) bytes += (localStorage.getItem(key) || '').length * 2;
    });
    if ('caches' in window) {
      try {
        const cache = await caches.open('reeky-foundry-media-v1');
        const requests = await cache.keys();
        for (const request of requests) {
          const response = await cache.match(request);
          bytes += Number(response?.headers.get('content-length') || 0);
        }
      } catch { /* Cache Storage may be unavailable in private browsing. */ }
    }
    setStorageBytes(bytes);
    setStorageRefreshing(false);
  };

  const removeOfflineKit = async (assetId) => {
    localStorage.removeItem(`reeky_text_instruments_${ownerKey}_${assetId}`);
    localStorage.removeItem(`reeky_progress_${ownerKey}_${assetId}`);
    Object.keys(localStorage).filter(key => key.startsWith(`reeky_memory_${ownerKey}_${assetId}_`)).forEach(key => localStorage.removeItem(key));
    setStorageBytes(prev => Math.max(0, prev));
    await refreshStorage();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="foundry-dashboard foundry-review-page">
      <header className="navbar foundry-header" style={{ position: 'sticky' }}>
        <div className="container nav-container">
          <Link to="/dashboard" className="logo" style={{ textDecoration: 'none' }}><span className="foundry-mark">R</span> Reeky Foundry</Link>
          <div className="foundry-nav-actions">
            <span className="foundry-user-label">{user?.preferences?.name || user?.name}</span>
            <button className="btn btn-secondary" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main className="container foundry-review-main">
        <Link to="/dashboard" className="foundry-back-link"><ArrowLeft size={15} /> Back to Kit Bench</Link>
        <div className="foundry-dashboard-intro">
          <div>
            <span className="foundry-eyebrow">PERSONAL ARCHIVE / REVIEW DESK</span>
            <h1>Return to what mattered.</h1>
            <p>Your bookmarks and notes, gathered from every learning kit and ready for another pass.</p>
          </div>
          <div className="foundry-intro-index"><span>REEKY</span><strong>03</strong></div>
        </div>

        <section className="foundry-review-summary">
          <div><BookmarkCheck size={18} /><strong>{entries.filter(entry => entry.bookmarked).length}</strong><span>bookmarked instruments</span></div>
          <div><StickyNote size={18} /><strong>{entries.filter(entry => entry.note).length}</strong><span>personal notes</span></div>
          <div><ClipboardList size={18} /><strong>{assets.length}</strong><span>learning kits</span></div>
        </section>

        <section className="foundry-offline-library" aria-labelledby="offline-library-title">
          <div className="foundry-offline-library-head"><div><span className="foundry-overline">PWA STORAGE / LOCAL SHELF</span><h2 id="offline-library-title">Offline Library</h2><p>Keep your text instruments close when the connection drops. Removing a kit here does not delete the original source.</p></div><button type="button" className="foundry-memory-button" onClick={refreshStorage} disabled={storageRefreshing}><RefreshCw size={14} /> {storageRefreshing ? 'Measuring...' : 'Refresh usage'}</button></div>
          <div className="foundry-offline-library-meter"><HardDrive size={18} /><strong>{storageBytes < 1024 * 1024 ? `${Math.max(1, Math.round(storageBytes / 1024))} KB` : `${(storageBytes / (1024 * 1024)).toFixed(1)} MB`}</strong><span>estimated local storage · {offlineKits.length} cached kit{offlineKits.length === 1 ? '' : 's'}</span></div>
          {offlineKits.length > 0 ? <div className="foundry-offline-kit-list">{offlineKits.map(asset => <div className="foundry-offline-kit" key={asset.id}><div><strong>{asset.title || 'Untitled learning kit'}</strong><span>Text instruments available offline</span></div><button type="button" aria-label={`Remove ${asset.title || 'kit'} from offline library`} onClick={() => removeOfflineKit(asset.id)}><Trash2 size={15} /></button></div>)}</div> : <div className="foundry-offline-library-empty">Open a kit while online to place its text instruments on this local shelf.</div>}
        </section>

        {loading ? <div className="foundry-review-empty">Gathering your saved knowledge...</div> : entries.length === 0 ? (
          <div className="foundry-review-empty"><FileText size={24} /><strong>Your review desk is waiting.</strong><span>Bookmark an instrument or add a note from any Kit Bench to see it here.</span><Link className="btn btn-primary" to="/dashboard">Open a learning kit</Link></div>
        ) : (
          <section className="foundry-review-list" aria-label="Saved instruments and notes">
            {entries.map(entry => (
              <article className="foundry-review-entry" key={entry.key}>
                <div className="foundry-review-entry-icon">{entry.bookmarked ? <BookmarkCheck size={18} /> : <StickyNote size={18} />}</div>
                <div className="foundry-review-entry-copy"><span className="foundry-overline">{entry.label} / {entry.bookmarked ? 'BOOKMARKED' : 'NOTE'}</span><h2>{entry.title}</h2>{entry.note && <p>{entry.note}</p>}</div>
                <button className="foundry-memory-button" onClick={() => navigate(`/dashboard?kit=${encodeURIComponent(entry.assetId)}&instrument=${entry.instrument}`)}>Open instrument <ArrowUpRight size={15} /></button>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
