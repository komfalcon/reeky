import React, { useState } from 'react';
import { Sparkles, User, ArrowRight, ArrowLeft, Volume2, BookOpen, Music, Compass } from 'lucide-react';
import { api } from '../api';

export default function OnboardingForm({ token, onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [depth, setDepth] = useState('');
  const [learningStyle, setLearningStyle] = useState('');
  const [tone, setTone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nextStep = () => {
    if (step === 1 && !name.trim()) {
      setError('Please share your name so I know what to call you! 💜');
      return;
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(prev => prev - 1);
  };

  const handleFinish = async () => {
    if (!tone) {
      setError('Please choose a voice tone to complete your profile!');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const preferences = {
        name: name.trim(),
        depth,
        learningStyle,
        tone
      };
      await api.savePreferences(preferences, token);
      onComplete(preferences);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--text-main)',
      padding: '2rem'
    }}>
      <div className="dashboard-card" style={{
        maxWidth: '640px',
        width: '100%',
        padding: '3rem',
        borderRadius: '24px',
        border: '1.5px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
        background: 'var(--card-bg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glowing Background Blobs */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '150px',
          height: '150px',
          background: 'var(--accent-glow)',
          filter: 'blur(50px)',
          borderRadius: '50%',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* Header Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', zIndex: 1, position: 'relative' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            STEP {step} OF 4
          </span>
          <div style={{
            display: 'flex',
            gap: '0.35rem',
            width: '60%',
            height: '6px',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{
                flex: 1,
                background: s <= step ? 'var(--primary)' : 'rgba(0,0,0,0.1)',
                transition: 'background 0.35s ease'
              }} />
            ))}
          </div>
        </div>

        {/* Error Indicator */}
        {error && (
          <div style={{
            background: 'var(--error-glow)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            textAlign: 'center',
            zIndex: 1,
            position: 'relative'
          }}>
            {error}
          </div>
        )}

        {/* Step Content */}
        <div style={{ minHeight: '260px', zIndex: 1, position: 'relative' }}>
          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <div className="avatar-pulse" style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'var(--accent-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                border: '2px solid var(--secondary)'
              }}>
                <Sparkles size={32} style={{ color: 'var(--secondary)' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.8rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                Welcome to the family, scholar!
              </h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
                I'm Aris, your study partner. We're going to turn those heavy textbooks and complex guides into a breeze together. Before we start, what should I call you?
              </p>
              <div style={{ position: 'relative', maxWidth: '380px', margin: '0 auto' }}>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Enter your preferred name..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    padding: '0.9rem',
                    fontWeight: 700,
                    borderRadius: '16px',
                    borderColor: name ? 'var(--primary)' : 'var(--input-border)',
                    boxShadow: name ? '0 0 15px var(--accent-glow)' : 'none'
                  }}
                  onKeyDown={e => e.key === 'Enter' && nextStep()}
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                How do you digest ideas?
              </h2>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
                When you're studying a challenging chapter, how does your brain like to process information? Tell me your natural speed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  {
                    id: 'simple',
                    title: 'Simple Summary',
                    badge: 'Fast Recall',
                    desc: 'Give it to me straight. Plain terms, easy analogies, zero unnecessary jargon.'
                  },
                  {
                    id: 'brief',
                    title: 'Executive Brief',
                    badge: 'High Yield',
                    desc: 'Structured bullet points, core concepts, formulas, and takeaways first.'
                  },
                  {
                    id: 'deep',
                    title: 'In-Depth Study Guide',
                    badge: 'Deep Dive',
                    desc: 'Full contextual paragraphs, detailed derivations, equations, and footnotes.'
                  }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setDepth(opt.id)}
                    style={{
                      border: `2px solid ${depth === opt.id ? 'var(--primary)' : 'var(--card-border)'}`,
                      background: depth === opt.id ? 'var(--accent-glow)' : 'var(--card-bg)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h4 style={{ fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>{opt.title}</h4>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: 'rgba(0,0,0,0.05)',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '6px',
                          color: 'var(--text-muted)'
                        }}>{opt.badge}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {opt.desc}
                      </p>
                    </div>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${depth === opt.id ? 'var(--primary)' : 'var(--input-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {depth === opt.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                What is your learning style?
              </h2>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
                Every mind is wired differently. How do you learn best? Let's pick the tools that make studying feel like play.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                {[
                  {
                    id: 'auditory',
                    icon: <Music size={24} />,
                    title: 'Auditory',
                    desc: 'Conversational podcasts & narrated flashcards.'
                  },
                  {
                    id: 'visual',
                    icon: <Compass size={24} />,
                    title: 'Visual',
                    desc: 'Interactive mindmaps, visual nodes & slides.'
                  },
                  {
                    id: 'textual',
                    icon: <BookOpen size={24} />,
                    title: 'Textual',
                    desc: 'Active-recall flashcards & summaries.'
                  }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setLearningStyle(opt.id)}
                    style={{
                      border: `2px solid ${learningStyle === opt.id ? 'var(--primary)' : 'var(--card-border)'}`,
                      background: learningStyle === opt.id ? 'var(--accent-glow)' : 'var(--card-bg)',
                      borderRadius: '16px',
                      padding: '1.5rem 1rem',
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ color: learningStyle === opt.id ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {opt.icon}
                    </div>
                    <h4 style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>{opt.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {opt.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.6rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                Choose your narrator's tone
              </h2>
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
                What kind of voice keeps you motivated? I can sound like a formal professor, a friendly study buddy, or a simple mentor.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  {
                    id: 'friendly',
                    title: 'Friendly & Casual',
                    desc: 'Warm, encouraging, conversational check-ins.'
                  },
                  {
                    id: 'formal',
                    title: 'Formal & Academic',
                    desc: 'Precise, textbook-aligned, zero distractions.'
                  },
                  {
                    id: 'analogy',
                    title: 'Analogical (ELIF5)',
                    desc: 'Extremely simple terms, clear metaphors, and real-world examples.'
                  }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setTone(opt.id)}
                    style={{
                      border: `2px solid ${tone === opt.id ? 'var(--primary)' : 'var(--card-border)'}`,
                      background: tone === opt.id ? 'var(--accent-glow)' : 'var(--card-bg)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <h4 style={{ fontWeight: 700, margin: 0, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{opt.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opt.desc}</p>
                    </div>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${tone === opt.id ? 'var(--primary)' : 'var(--input-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {tone === opt.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '2.5rem',
          borderTop: '1px solid var(--divider)',
          paddingTop: '1.5rem',
          zIndex: 1,
          position: 'relative'
        }}>
          {step > 1 ? (
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={prevStep}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={nextStep}
              disabled={step === 2 && !depth || step === 3 && !learningStyle}
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={handleFinish}
              disabled={saving || !tone}
            >
              {saving ? 'Creating Profile...' : 'Build My Study Suite 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
