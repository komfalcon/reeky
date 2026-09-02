import React, { useState, useMemo } from 'react';
import { Copy, Terminal, Check } from 'lucide-react';
import './PromptCompiler.css';

const TEMPLATE_PROMPT = `You are an expert academic pedagogue. Analyze the following source literature:
[CONTEXT_SOURCE]
Generate a set of [ASSET_TYPE] for a [DIFFICULTY] level audience.
The tone of explanation must be [TONE].
Ensure adherence to this strict constraint: [CONSTRAINTS]`;

export default function AdminPromptCompiler() {
  const [source, setSource] = useState('Photosynthesis converts carbon dioxide and water into oxygen and glucose...');
  const [assetType, setAssetType] = useState('flashcards');
  const [difficulty, setDifficulty] = useState('Undergraduate');
  const [tone, setTone] = useState('Accolade & Technical');
  const [constraints, setConstraints] = useState('No formula omissions, include chemical notations.');
  const [copied, setCopied] = useState(false);

  const compiledPrompt = useMemo(() => {
    return TEMPLATE_PROMPT
      .replace('[CONTEXT_SOURCE]', source)
      .replace('[ASSET_TYPE]', assetType.toUpperCase())
      .replace('[DIFFICULTY]', difficulty)
      .replace('[TONE]', tone)
      .replace('[CONSTRAINTS]', constraints);
  }, [source, assetType, difficulty, tone, constraints]);

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="prompt-compiler-widget sweeping-border">
      <h3 className="compiler-title"><Terminal size={20} /> Prompt Engine Sandbox</h3>
      <div className="compiler-grid">
        <div className="controller-panel">
          <div className="control-field">
            <label>Source Reference Material</label>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Source context string..."
            />
          </div>
          <div className="control-row">
            <div className="control-field">
              <label>Asset Output Mode</label>
              <select value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                <option value="flashcards">Flashcards JSON</option>
                <option value="quizzes">Stepped Quizzes Array</option>
                <option value="mindmap">SVG Hierarchical Mindmap</option>
                <option value="podcast">Podcast Audio Script</option>
              </select>
            </div>
            <div className="control-field">
              <label>Difficulty Tier</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>
          <div className="control-field">
            <label>Tone Specification</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </div>
          <div className="control-field">
            <label>Strict Output Constraints</label>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
            />
          </div>
        </div>
        <div className="output-panel">
          <div className="panel-header">
            <span>Compiled System Prompt</span>
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Prompt'}
            </button>
          </div>
          <pre className="compiled-output-pre">
            <code>{compiledPrompt}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
