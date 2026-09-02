import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { BookOpen, Sparkles, Headphones, FileText, Globe, MessageCircle, Zap, Compass, Check } from 'lucide-react';

const DEPTH_OPTIONS = [
  { id: 'simple', label: 'Simple Summary', desc: 'Quick reviews, plain terms', icon: BookOpen },
  { id: 'executive', label: 'Executive Brief', desc: 'Bullet-point summaries, high-level', icon: Sparkles },
  { id: 'detailed', label: 'In-Depth Study Guide', desc: 'Comprehensive paragraphs, detailed concepts', icon: FileText },
];

const STYLE_OPTIONS = [
  { id: 'visual', label: 'Visual', desc: 'Mindmaps and Infographics', icon: Globe },
  { id: 'auditory', label: 'Auditory', desc: 'Podcasts and audio overviews', icon: Headphones },
  { id: 'textual', label: 'Textual', desc: 'Flashcards and Study Reports', icon: MessageCircle },
];

const TONE_OPTIONS = [
  { id: 'academic', label: 'Academic & Formal', desc: 'Standard textbook voice', icon: BookOpen },
  { id: 'conversational', label: 'Conversational', desc: 'Friendly, tutor-like voice', icon: MessageCircle },
  { id: 'elif5', label: 'ELIF5', desc: 'Extremely simple analogies', icon: Zap },
];

const PACING_OPTIONS = [
  { id: 'fast', label: 'Fast', desc: 'Quick pacing, key points only', icon: Zap },
  { id: 'deep-dive', label: 'Deep-Dive', desc: 'Thorough exploration', icon: Compass },
];

function CardGrid({ options, selectedId, onChange, columns = 3 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '1rem',
    }}>
      {options.map(opt => {
        const isSelected = selectedId === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              gap: '0.75rem',
              padding: '1.25rem',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'var(--font-body)',
              position: 'relative',
              overflow: 'hidden',
              background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(6,182,212,0.08))' : 'var(--card-bg)',
              border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--card-border)',
              boxShadow: isSelected ? '0 0 20px rgba(99,102,241,0.15), var(--card-shadow)' : 'var(--card-shadow)',
            }}
            onMouseEnter={e => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--card-border)';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            {isSelected && (
              <div style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Check size={14} strokeWidth={3} />
              </div>
            )}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isSelected ? 'var(--primary)' : 'var(--accent-glow)',
              color: isSelected ? '#fff' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
            }}>
              <Icon size={20} />
            </div>
            <div>
              <div style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                marginBottom: '0.25rem',
              }}>
                {opt.label}
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}>
                {opt.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const { token, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const [depth, setDepth] = useState(null);
  const [style, setStyle] = useState(null);
  const [tone, setTone] = useState(null);
  const [pacing, setPacing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const handleSave = async () => {
    if (!depth || !style || !tone || !pacing) {
      setError('Please select all preferences before continuing.');
      return;
    }
    if (!token) {
      setError('Please log in again to save preferences.');
      navigate('/login');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const preferences = {
        explanationDepth: depth,
        learningStyle: style,
        tone: tone,
        examPacing: pacing,
      };
      await api.savePreferences(token, preferences);
      updateUser({ preferences });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      backgroundImage: 'var(--bg-dots)',
      backgroundSize: '24px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '780px',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '32px',
        padding: '3rem',
        boxShadow: 'var(--card-shadow), 0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'var(--accent-glow)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            border: '1px solid var(--card-border)',
          }}>
            <Sparkles size={32} />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.75rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
          }}>
            Personalize Your Learning
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.95rem',
            maxWidth: '480px',
            margin: '0 auto',
          }}>
            Tell us how you learn best so we can tailor every study suite to your preferences.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              onClick={() => { if (s < step && step > 1) setStep(s); }}
              style={{
                width: '32px',
                height: '4px',
                borderRadius: '4px',
                background: step >= s ? 'var(--primary)' : 'var(--card-border)',
                cursor: s < step ? 'pointer' : 'default',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.15rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}>
              Explanation Depth
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              How detailed should your study materials be?
            </p>
            <CardGrid options={DEPTH_OPTIONS} selectedId={depth} onChange={setDepth} />
            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => depth && setStep(2)} disabled={!depth}>
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.15rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}>
              Primary Learning Style
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              What type of content resonates most with you?
            </p>
            <CardGrid options={STYLE_OPTIONS} selectedId={style} onChange={setStyle} />
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={() => style && setStep(3)} disabled={!style}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.15rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}>
              Tone
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              What voice should your study materials use?
            </p>
            <CardGrid options={TONE_OPTIONS} selectedId={tone} onChange={setTone} />
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" onClick={() => tone && setStep(4)} disabled={!tone}>Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.15rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}>
              Exam Pacing
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              What pace do you prefer for exam preparation?
            </p>
            <CardGrid options={PACING_OPTIONS} selectedId={pacing} onChange={setPacing} columns={2} />
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !pacing}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), hsl(var(--hue-primary), 85%, 65%))',
                }}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(255,95,86,0.1)',
            border: '1px solid rgba(255,95,86,0.3)',
            borderRadius: '12px',
            fontSize: '0.85rem',
            color: '#ff5f56',
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/dashboard" style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Skip for now — I'll set this up later
          </Link>
        </div>
      </div>
    </div>
  );
}
