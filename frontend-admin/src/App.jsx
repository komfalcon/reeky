import React, { useState, useEffect } from 'react';
import { Users, FileText, ClipboardCopy, Send, Loader2, CheckCircle2, UploadCloud, Menu, X } from 'lucide-react';

const CloudinaryUploadWidget = ({ fieldName, label, currentUrl, onUploadSuccess }) => {
  const openWidget = () => {
    window.cloudinary.createUploadWidget(
      {
        cloudName: 'x9lbk1ea',
        uploadPreset: 'Reeky Academic Hub',
        sources: ['local', 'url'],
        multiple: false
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

export default function App() {
  const [queue, setQueue] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    flashcards_url: '',
    quizzes_url: '',
    mindmap_url: '',
    podcast_audio: '',
    video_overview: '',
    infographic: '',
    slide_deck: '',
    study_report: '',
    data_table: ''
  });

  // Fetch queue from backend
  const fetchQueue = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/queue');
      const data = await res.json();
      setQueue(data.queue || []);
    } catch (err) {
      console.error("Failed to fetch queue", err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  const handleCopyPrompt = () => {
    if (!selectedUser) return;
    const prompt = `Title/Topic: ${selectedUser.title || 'None'}`;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    
    const payload = {
      assetId: selectedUser.id, // Primary key of AssetBundle
      artifact_urls: [
        formData.flashcards_url,
        formData.quizzes_url,
        formData.mindmap_url
      ].filter(Boolean),
      podcast_audio: formData.podcast_audio || null,
      video_overview: formData.video_overview || null,
      infographic: formData.infographic || null,
      slide_deck: formData.slide_deck || null,
      study_report: formData.study_report || null,
      data_table: formData.data_table || null
    };

    try {
      await fetch('http://localhost:5000/api/admin/submit-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Clear form and selection
      setFormData({
        flashcards_url: '', quizzes_url: '', mindmap_url: '',
        podcast_audio: '', video_overview: '', infographic: '', slide_deck: '',
        study_report: '', data_table: ''
      });
      setSelectedUser(null);
      fetchQueue(); // immediately refresh queue
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="overlay fade-in" onClick={() => setIsMenuOpen(false)}></div>
      )}

      {/* LEFT SIDEBAR - QUEUE */}
      <div className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="title" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={24} color="var(--primary)" />
            <h2>Pending Queue</h2>
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
          queue.map((item, idx) => (
            <div 
              key={idx} 
              className={`queue-card ${selectedUser?.id === item.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedUser(item);
                setIsMenuOpen(false); // Close menu on mobile after selection
              }}
            >
              <h3>{item.userId}</h3>
              <p>Uploaded: {new Date(item.createdAt).toLocaleTimeString()}</p>
              <div className="tag-list">
                <span className="tag">{item.title}</span>
              </div>
            </div>
          ))
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
                  <strong>PDF Target:</strong> <a href={selectedUser.originalFileUrl} target="_blank" rel="noreferrer" style={{color: 'var(--primary)'}}>View PDF</a>
                </div>
              </div>
            </div>

            {/* ASSET SUBMISSION FORM */}
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

                  {/* Static Media via Cloudinary */}
                  <div>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', fontSize: '1.1rem' }}>Static Media Overrides</h3>
                    <CloudinaryUploadWidget 
                      label="Podcast Audio" 
                      fieldName="podcast_audio" 
                      currentUrl={formData.podcast_audio} 
                      onUploadSuccess={(field, url) => setFormData(prev => ({...prev, [field]: url}))} 
                    />
                    <CloudinaryUploadWidget 
                      label="Video Overview" 
                      fieldName="video_overview" 
                      currentUrl={formData.video_overview} 
                      onUploadSuccess={(field, url) => setFormData(prev => ({...prev, [field]: url}))} 
                    />
                    <CloudinaryUploadWidget 
                      label="Infographic" 
                      fieldName="infographic" 
                      currentUrl={formData.infographic} 
                      onUploadSuccess={(field, url) => setFormData(prev => ({...prev, [field]: url}))} 
                    />
                    <CloudinaryUploadWidget 
                      label="Slide Deck" 
                      fieldName="slide_deck" 
                      currentUrl={formData.slide_deck} 
                      onUploadSuccess={(field, url) => setFormData(prev => ({...prev, [field]: url}))} 
                    />
                    <CloudinaryUploadWidget 
                      label="Study Report" 
                      fieldName="study_report" 
                      currentUrl={formData.study_report} 
                      onUploadSuccess={(field, url) => setFormData(prev => ({...prev, [field]: url}))} 
                    />
                    <CloudinaryUploadWidget 
                      label="Data Table" 
                      fieldName="data_table" 
                      currentUrl={formData.data_table} 
                      onUploadSuccess={(field, url) => setFormData(prev => ({...prev, [field]: url}))} 
                    />
                  </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                    {isSubmitting ? 'Processing...' : 'Submit to Backend Scraper'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
