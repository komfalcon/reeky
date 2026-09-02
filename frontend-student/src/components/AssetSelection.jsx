import React, { useState, useMemo } from 'react';
import { FileUp, Zap, Clock, CheckCircle, Layers, FileCheck, GitBranch, Mic, FileText, Table, Timer } from 'lucide-react';
import './AssetSelection.css';

const ASSET_TYPES = [
  { id: 'flashcards', label: '3D Flashcards', time: 30, cost: 2, icon: Layers, desc: 'Active recall decks with spaced repetition' },
  { id: 'quizzes', label: 'Stepped Quizzes', time: 45, cost: 3, icon: FileCheck, desc: 'Adaptive tests with scorecard reporting' },
  { id: 'mindmap', label: 'Zoomable Mindmap', time: 60, cost: 4, icon: GitBranch, desc: 'Visual node networks of core concepts' },
  { id: 'podcast', label: 'Audio Podcast', time: 120, cost: 10, icon: Mic, desc: 'AI-hosted conversation covering the PDF' },
  { id: 'summary', label: 'Study Report', time: 20, cost: 1, icon: FileText, desc: 'Highly formatted executive text summary' },
  { id: 'dataTable', label: 'Data Extraction', time: 40, cost: 2, icon: Table, desc: 'Tabular extraction of datasets & figures' },
];

export default function AssetSelection({ onUpload, isUploading }) {
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState(new Set(['flashcards', 'quizzes']));
  const [customInstructions, setCustomInstructions] = useState('');

  const toggleAsset = (id) => {
    const next = new Set(selected);
    if (next.has(id)) {
      if (next.size > 1) next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const totals = useMemo(() => {
    let time = 0;
    let cost = 0;
    ASSET_TYPES.forEach(asset => {
      if (selected.has(asset.id)) {
        time += asset.time;
        cost += asset.cost;
      }
    });
    return { time, cost };
  }, [selected]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || selected.size === 0) return;
    onUpload(file, Array.from(selected), customInstructions);
  };

  return (
    <div className="asset-upload-card sweeping-border">
      <form onSubmit={handleSubmit} className="upload-form">
        <h3 className="form-title">Create Study Sandbox</h3>

        <div className="file-dropzone">
          <input
            type="file"
            id="pdf-file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
          <label htmlFor="pdf-file" className="dropzone-label">
            <FileUp size={32} className="upload-icon" />
            <span>{file ? file.name : 'Drag or select reference PDF'}</span>
            <span className="file-limit">Max size 25MB</span>
          </label>
        </div>

        <div className="instructions-group">
          <label>Custom Context / Focus Instructions (Optional)</label>
          <textarea
            placeholder="e.g. Focus on Chapter 3 formulas, ignore introductory historical context..."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
          />
        </div>

        <div className="assets-grid-container">
          <label className="grid-heading">Choose Assets to Generate</label>
          <div className="assets-grid">
            {ASSET_TYPES.map((asset) => {
              const isActive = selected.has(asset.id);
              return (
                <div
                  key={asset.id}
                  className={`asset-card ${isActive ? 'active' : ''}`}
                  onClick={() => toggleAsset(asset.id)}
                >
                  <div className="asset-card-header">
                    <span className="asset-emoji"><asset.icon size={20} /></span>
                    <span className="asset-checkbox">
                      {isActive && <CheckCircle size={16} fill="var(--primary)" color="#fff" />}
                    </span>
                  </div>
                  <h4 className="asset-title">{asset.label}</h4>
                  <p className="asset-desc">{asset.desc}</p>
                  <div className="asset-card-footer">
                    <span><Timer size={14} /> ~{asset.time}s</span>
                    <span><Zap size={14} /> {asset.cost} credits</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="upload-summary-footer">
          <div className="summary-metric">
            <Clock size={18} />
            <div>
              <span className="metric-label">Estimated Time:</span>
              <span className="metric-value">~{Math.ceil(totals.time / 60)} min</span>
            </div>
          </div>
          <div className="summary-metric">
            <Zap size={18} />
            <div>
              <span className="metric-label">Token Cost:</span>
              <span className="metric-value">{totals.cost} Credits</span>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary submit-upload-btn"
            disabled={!file || isUploading}
          >
            {isUploading ? 'Generating Sandbox...' : 'Initiate Processing'}
          </button>
        </div>
      </form>
    </div>
  );
}
