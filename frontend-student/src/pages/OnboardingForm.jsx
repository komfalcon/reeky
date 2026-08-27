import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, Layers3, Mic2, Sparkles, Volume2 } from 'lucide-react';
import { api } from '../api';

const steps = [
  { number: '01', label: 'Identity', icon: Sparkles },
  { number: '02', label: 'Depth', icon: Layers3 },
  { number: '03', label: 'Mode', icon: Compass },
  { number: '04', label: 'Voice', icon: Mic2 },
];

const depthOptions = [
  { id: 'simple', title: 'Quick orientation', tag: 'FAST RECALL', description: 'Plain language, clean analogies, and only the signal.' },
  { id: 'brief', title: 'High-yield brief', tag: 'EXAM READY', description: 'Structured concepts, formulas, takeaways, and likely traps.' },
  { id: 'deep', title: 'Full study guide', tag: 'DEEP DIVE', description: 'Context, derivations, examples, and the details behind the idea.' },
];

const learningOptions = [
  { id: 'auditory', icon: Volume2, title: 'Listen', description: 'Narrated conversations and spoken review.' },
  { id: 'visual', icon: Compass, title: 'See the shape', description: 'Maps, relationships, and visual structure.' },
  { id: 'textual', icon: BookOpen, title: 'Read and recall', description: 'Clear notes, prompts, and active recall.' },
];

const toneOptions = [
  { id: 'friendly', title: 'Study companion', description: 'Warm, direct, and encouraging without the noise.' },
  { id: 'formal', title: 'Academic editor', description: 'Precise, structured, and ready for serious revision.' },
  { id: 'analogy', title: 'Plain-speech guide', description: 'Simple metaphors that make difficult material feel close.' },
];

export default function OnboardingForm({ token, onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [depth, setDepth] = useState('');
  const [learningStyle, setLearningStyle] = useState('');
  const [tone, setTone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const validateStep = () => {
    if (step === 1 && !name.trim()) return 'Give your bench a name before we continue.';
    if (step === 2 && !depth) return 'Choose the depth that feels right for your study session.';
    if (step === 3 && !learningStyle) return 'Choose the first doorway you want into your material.';
    if (step === 4 && !tone) return 'Choose the voice that should guide your review.';
    return '';
  };

  const nextStep = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStep(current => Math.min(4, current + 1));
  };

  const previousStep = () => {
    setError('');
    setStep(current => Math.max(1, current - 1));
  };

  const handleFinish = async () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const preferences = { name: name.trim(), depth, learningStyle, tone };
      await api.savePreferences(preferences, token);
      onComplete(preferences);
    } catch (requestError) {
      setError(requestError?.message || 'The profile could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedDepth = depthOptions.find(option => option.id === depth);
  const selectedLearning = learningOptions.find(option => option.id === learningStyle);
  const selectedTone = toneOptions.find(option => option.id === tone);

  return (
    <main className="foundry-onboarding">
      <div className="foundry-onboarding-orbit orbit-a" aria-hidden="true" />
      <div className="foundry-onboarding-orbit orbit-b" aria-hidden="true" />
      <section className="foundry-onboarding-shell" aria-labelledby="onboarding-title">
        <div className="foundry-onboarding-aside">
          <div className="foundry-onboarding-brand"><span><Sparkles size={16} /></span> REEKY <em>FOUNDRY</em></div>
          <div className="foundry-onboarding-aside-copy">
            <span className="foundry-onboarding-overline">YOUR BENCH / SETUP 001</span>
            <h1>Give your learning<br /><i>a useful shape.</i></h1>
            <p>A few choices now help every kit meet you where you are. You can change them whenever your study season changes.</p>
          </div>
          <div className="foundry-onboarding-note"><span className="note-mark">01</span><p><strong>Nothing is locked.</strong> This is a starting profile, not a permanent label.</p></div>
        </div>

        <div className="foundry-onboarding-card">
          <div className="foundry-onboarding-progress">
            <div className="foundry-onboarding-progress-top"><span>COMMISSION YOUR PROFILE</span><strong>0{step} / 04</strong></div>
            <div className="foundry-onboarding-step-rail">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const complete = index + 1 < step;
                const current = index + 1 === step;
                return <div className={`foundry-onboarding-step ${current ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`} key={item.number}><span className="step-rail-line" /><span className="step-rail-dot">{complete ? <Check size={12} /> : <Icon size={13} />}</span><span className="step-rail-label">{item.label}</span></div>;
              })}
            </div>
          </div>

          <div className="foundry-onboarding-main">
            <div className="foundry-onboarding-form" key={step}>
              {step === 1 && (
                <div className="onboarding-step-content">
                  <span className="foundry-form-index">THE FIRST MARK</span>
                  <h2 id="onboarding-title">What should we call you?</h2>
                  <p className="foundry-form-lead">Your name appears quietly across your learning kits. Think of it as signing the inside cover.</p>
                  <label className="foundry-field-label" htmlFor="student-name">Preferred name</label>
                  <input id="student-name" type="text" className="auth-input foundry-name-input" placeholder="e.g. Amara" value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === 'Enter' && nextStep()} autoComplete="name" autoFocus />
                  <span className="foundry-field-hint">Use whatever name makes the workspace feel like yours.</span>
                </div>
              )}

              {step === 2 && (
                <div className="onboarding-step-content">
                  <span className="foundry-form-index">THE CUT OF THE MATERIAL</span>
                  <h2 id="onboarding-title">How much of the source should we keep?</h2>
                  <p className="foundry-form-lead">Choose the level of detail you want to meet first. Reeky will still keep the source’s meaning intact.</p>
                  <div className="foundry-choice-stack" role="listbox" aria-label="Study depth">
                    {depthOptions.map(option => <button type="button" role="option" aria-selected={depth === option.id} className={`foundry-choice ${depth === option.id ? 'is-selected' : ''}`} key={option.id} onClick={() => setDepth(option.id)}><span className="foundry-choice-marker">{depth === option.id ? <Check size={14} /> : null}</span><span className="foundry-choice-copy"><span className="foundry-choice-heading"><strong>{option.title}</strong><em>{option.tag}</em></span><span>{option.description}</span></span></button>)}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="onboarding-step-content">
                  <span className="foundry-form-index">THE FIRST DOORWAY</span>
                  <h2 id="onboarding-title">How do you want to enter an idea?</h2>
                  <p className="foundry-form-lead">Your kits contain every instrument, but this helps us put the most natural one in front first.</p>
                  <div className="foundry-learning-grid" role="listbox" aria-label="Learning style">
                    {learningOptions.map(option => { const Icon = option.icon; return <button type="button" role="option" aria-selected={learningStyle === option.id} className={`foundry-learning-choice ${learningStyle === option.id ? 'is-selected' : ''}`} key={option.id} onClick={() => setLearningStyle(option.id)}><span className="foundry-learning-icon"><Icon size={22} /></span><strong>{option.title}</strong><span>{option.description}</span></button>; })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="onboarding-step-content">
                  <span className="foundry-form-index">THE VOICE ON THE PAGE</span>
                  <h2 id="onboarding-title">What should guide your review?</h2>
                  <p className="foundry-form-lead">Choose the tone that keeps you moving when the material gets dense.</p>
                  <div className="foundry-choice-stack" role="listbox" aria-label="Narrator tone">
                    {toneOptions.map(option => <button type="button" role="option" aria-selected={tone === option.id} className={`foundry-choice ${tone === option.id ? 'is-selected' : ''}`} key={option.id} onClick={() => setTone(option.id)}><span className="foundry-choice-marker">{tone === option.id ? <Check size={14} /> : null}</span><span className="foundry-choice-copy"><span className="foundry-choice-heading"><strong>{option.title}</strong><em>{tone === option.id ? 'SELECTED' : 'VOICE PROFILE'}</em></span><span>{option.description}</span></span></button>)}
                  </div>
                </div>
              )}

              {error && <div className="foundry-onboarding-error" role="alert">{error}</div>}
            </div>

            <aside className="foundry-profile-preview" aria-label="Live profile preview">
              <div className="profile-preview-top"><span>PROFILE PREVIEW</span><span className="profile-live-dot">LIVE</span></div>
              <div className="profile-preview-name">{name.trim() || 'Your name'}<span>’s bench</span></div>
              <div className="profile-preview-divider" />
              <div className="profile-preview-row"><span>DEPTH</span><strong>{selectedDepth?.tag || 'Not set'}</strong></div>
              <div className="profile-preview-row"><span>FIRST DOORWAY</span><strong>{selectedLearning?.title || 'Not set'}</strong></div>
              <div className="profile-preview-row"><span>GUIDE VOICE</span><strong>{selectedTone?.title || 'Not set'}</strong></div>
              <div className="profile-preview-instruments"><span>YOUR INSTRUMENTS</span><div><i>Digest</i><i>Recall</i><i>Map</i><i>Test</i></div></div>
            </aside>
          </div>

          <div className="foundry-onboarding-actions">
            <button type="button" className="btn btn-secondary" onClick={previousStep} disabled={step === 1 || saving}><ArrowLeft size={16} /> Back</button>
            <span className="foundry-action-caption">{step === 4 ? 'Your profile is ready to be set.' : 'You can revise this later.'}</span>
            {step < 4 ? <button type="button" className="btn btn-primary" onClick={nextStep}>Continue <ArrowRight size={16} /></button> : <button type="button" className="btn btn-primary" onClick={handleFinish} disabled={saving}>{saving ? 'Setting your bench…' : 'Set my learning profile'} <Sparkles size={16} /></button>}
          </div>
        </div>
      </section>
    </main>
  );
}
