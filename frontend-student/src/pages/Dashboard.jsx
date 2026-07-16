import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useAuth } from '../AuthContext';
import { api } from '../api';

export default function Dashboard() {
  const { user, token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [uploadMode, setUploadMode] = useState('file');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
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
      // silently fail
    } finally {
      setFetchingAssets(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) fetchUserAssets();
  }, [isAuthenticated, fetchUserAssets]);

  const handlePdfUrlSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!pdfUrl.trim() || !token) return;
    setIsSubmittingUrl(true);
    try {
      const title = pdfUrl.split('/').pop() || 'Untitled Document';
      await api.generateAssets(title, pdfUrl.trim(), token);
      setPdfUrl('');
      await fetchUserAssets();
    } catch (err) {
      alert('Failed to queue: ' + err.message);
    } finally {
      setIsSubmittingUrl(false);
    }
  }, [pdfUrl, token, fetchUserAssets]);

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
          api.generateAssets(fileName, fileUrl, token)
            .then(() => {
              setUploadProgress(null);
              setIsUploading(false);
              fetchUserAssets();
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

  const buildActiveData = (asset) => {
    if (!asset || !asset.assets) return null;
    const a = typeof asset.assets === 'string' ? JSON.parse(asset.assets) : asset.assets;
    return {
      title: asset.title || 'Untitled Document',
      tagline: a.tagline || 'AI-Generated Study Suite',
      flashcards: Array.isArray(a.flashcards) ? a.flashcards : [],
      quiz: Array.isArray(a.quiz) ? a.quiz : [],
      mindmap: a.mindmap || { nodes: [], connections: [] },
      slides: Array.isArray(a.slides) ? a.slides : [],
      report: a.report || '',
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
        {/* Upload Section */}
        <div className="dashboard-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            Generate New Study Materials
          </h3>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              className={uploadMode === 'file' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
              onClick={() => setUploadMode('file')}
            >
              Upload from Device
            </button>
            <button
              className={uploadMode === 'url' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
              onClick={() => setUploadMode('url')}
            >
              Paste URL
            </button>
          </div>

          {/* File upload mode */}
          {uploadMode === 'file' && (
            <div
              onClick={!isUploading ? openUploadWidget : undefined}
              style={{
                border: '2px dashed var(--card-border)',
                borderRadius: '16px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: isUploading ? 'wait' : 'pointer',
                transition: 'border-color 0.2s',
                background: 'var(--card-bg)',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
            >
              {!isUploading && !uploadProgress && (
                <>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ marginBottom: '0.75rem' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Click to upload a file</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>PDF, DOCX, or TXT (max 50MB)</p>
                </>
              )}
              {isUploading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {uploadProgress || 'Uploading...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* URL input mode */}
          {uploadMode === 'url' && (
            <form onSubmit={handlePdfUrlSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="auth-input"
                type="url"
                placeholder="Paste PDF URL to generate assets..."
                value={pdfUrl}
                onChange={e => setPdfUrl(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={isSubmittingUrl || !pdfUrl.trim()}>
                {isSubmittingUrl ? 'Queuing...' : 'Generate'}
              </button>
            </form>
          )}
        </div>

        {/* Asset List */}
        <div className="dashboard-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            Your Study Materials
          </h3>

          {fetchingAssets && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading...</p>}

          {!fetchingAssets && userAssets.length === 0 && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              No assets yet. Paste a PDF URL above to get started.
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
                    width: '100%', justifyContent: 'flex-start', textAlign: 'left'
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

        {/* Asset Viewer */}
        {selectedAsset && activeData && (
          <div className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
                {activeData.title}
              </h3>
            </div>

            {/* Flashcards */}
            {activeData.flashcards.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Flashcards</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeData.flashcards.map((fc, i) => (
                    <details key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '1rem', cursor: 'pointer' }}>
                      <summary style={{ fontWeight: 600, fontSize: '0.9rem' }}>{fc.q}</summary>
                      <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{fc.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz */}
            {activeData.quiz.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>Quiz</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeData.quiz.map((q, i) => (
                    <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '1rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>{q.q}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {q.options.map((opt, j) => (
                          <div key={j} style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            background: j === q.correct ? 'rgba(39,201,63,0.1)' : 'var(--bg)',
                            border: `1px solid ${j === q.correct ? '#27c93f' : 'var(--card-border)'}`,
                            color: j === q.correct ? '#27c93f' : 'var(--text-main)'
                          }}>
                            {opt} {j === q.correct && '✓'}
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{q.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slides */}
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

            {/* Report */}
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
