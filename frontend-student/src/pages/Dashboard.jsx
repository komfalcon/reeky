import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import AssetSelection from '../components/AssetSelection';
import FlashcardFlipper from '../components/FlashcardFlipper';
import SteppedQuizPlayer from '../components/SteppedQuizPlayer';
import WaveformPodcastPlayer from '../components/WaveformPodcastPlayer';
import ZoomableMindmapViewer from '../components/ZoomableMindmapViewer';

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

export default function Dashboard() {
  const { user, token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isUploading, setIsUploading] = useState(false);
  const [userAssets, setUserAssets] = useState([]);
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

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
    } finally {
      setFetchingAssets(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) fetchUserAssets();
  }, [isAuthenticated, fetchUserAssets]);

  const handleUpload = async (file, selectedAssets, customInstructions) => {
    if (!token) return;
    setIsUploading(true);
    try {
      const fileUrl = await uploadToCloudinary(file);
      const title = file.name || 'Uploaded Document';
      await api.generateAssets(title, fileUrl, token, customInstructions || undefined);
      fetchUserAssets();
    } catch (err) {
      alert('Failed to upload: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const completedAssets = userAssets.filter(a => a.status === 'COMPLETED');
  const pendingAssets = userAssets.filter(a => a.status !== 'COMPLETED');

  const buildActiveData = (asset) => {
    if (!asset || !asset.assets) return null;
    const a = typeof asset.assets === 'string' ? JSON.parse(asset.assets) : asset.assets;
    return {
      title: asset.title || 'Untitled Document',
      tagline: a.tagline || 'AI-Generated Study Suite',
      flashcards: Array.isArray(a.flashcards) ? a.flashcards.map(fc => ({
        id: fc.id || Math.random().toString(36).slice(2),
        question: fc.q || fc.question || '',
        answer: fc.a || fc.answer || '',
      })) : [],
      quiz: Array.isArray(a.quiz) ? a.quiz.map(q => ({
        text: q.q || q.text || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctOptionIndex: typeof q.correct === 'number' ? q.correct : (q.correctOptionIndex || 0),
      })) : [],
      mindmap: {
        nodes: Array.isArray(a.mindmap?.nodes) ? a.mindmap.nodes : [],
        edges: Array.isArray(a.mindmap?.edges) ? a.mindmap.edges : (Array.isArray(a.mindmap?.connections) ? a.mindmap.connections : []),
      },
      slides: Array.isArray(a.slides) ? a.slides : [],
      report: a.report || '',
      transcript: Array.isArray(a.transcript) ? a.transcript : [],
      podcast_audio: a.podcast_audio || null,
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

  if (!isAuthenticated) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="navbar" style={{ position: 'sticky' }}>
        <div className="container nav-container">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M12 2L2 22H22L12 2Z" stroke="var(--primary)" fill="none" />
              <path d="M20 12L15 22H29L20 12Z" stroke="var(--secondary)" fill="none" />
            </svg>
            Reeky Academic Hub
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <Link to="/" className="nav-link" style={{ textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Home</Link>
            <Link to="/dashboard" className="nav-link" style={{ textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, color: 'var(--primary)' }}>Dashboard</Link>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
              {user?.name}
            </span>
            <button className="btn btn-secondary" style={{ display: 'flex' }} onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <AssetSelection onUpload={handleUpload} isUploading={isUploading} />

        <div className="dashboard-card" style={{ marginBottom: '2rem', marginTop: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            Your Study Materials
          </h3>

          {fetchingAssets && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading...</p>}

          {!fetchingAssets && userAssets.length === 0 && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              No assets yet. Upload a file above to get started.
            </p>
          )}

          {completedAssets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>COMPLETED</p>
              {completedAssets.map(asset => (
                <button
                  key={asset.id}
                  className="sample-badge btn"
                  style={{
                    borderColor: selectedAsset?.id === asset.id ? 'var(--primary)' : 'var(--card-border)',
                    width: '100%', justifyContent: 'flex-start', textAlign: 'left',
                  }}
                  onClick={() => setSelectedAsset(asset)}
                >
                  {asset.title}
                </button>
              ))}
            </div>
          )}

          {pendingAssets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>PENDING / PROCESSING</p>
              {pendingAssets.map(asset => (
                <div
                  key={asset.id}
                  className="sample-badge btn"
                  style={{ borderColor: 'var(--card-border)', width: '100%', justifyContent: 'flex-start', opacity: 0.6, cursor: 'default' }}
                >
                  {asset.title}
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {asset.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedAsset && activeData && (
          <div className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
                {activeData.title}
              </h3>
            </div>

            {activeData.flashcards.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>3D Flashcards</h4>
                <FlashcardFlipper cards={activeData.flashcards} />
              </div>
            )}

            {activeData.quiz.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Stepped Quiz</h4>
                <SteppedQuizPlayer questions={activeData.quiz} />
              </div>
            )}

            {activeData.slides.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Slides</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeData.slides.map((s, i) => (
                    <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '1rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>{s.title}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeData.mindmap.nodes.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Mindmap</h4>
                <ZoomableMindmapViewer data={activeData.mindmap} />
              </div>
            )}

            {activeData.podcast_audio && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Podcast</h4>
                <WaveformPodcastPlayer
                  audioUrl={activeData.podcast_audio}
                  transcript={activeData.transcript}
                />
              </div>
            )}

            {activeData.report && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Study Report</h4>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }} onClick={downloadReportPdf}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download PDF
                  </button>
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '1.25rem' }}>
                  {activeData.report}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
