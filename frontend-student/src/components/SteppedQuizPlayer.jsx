import React, { useState, useEffect } from 'react';
import { Award, Timer, RefreshCw, Check, X, BookOpen, TrendingUp, Trophy } from 'lucide-react';
import './QuizPlayer.css';

export default function SteppedQuizPlayer({ questions = [], onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isValidated, setIsValidated] = useState(false);
  const [history, setHistory] = useState([]);
  const [timeTaken, setTimeTaken] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    let timer;
    if (!quizFinished) {
      timer = setInterval(() => {
        setTimeTaken((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizFinished]);

  if (questions.length === 0) return <div>No quiz data available.</div>;

  const currentQuestion = questions[currentStep];
  const progressPercent = (currentStep / questions.length) * 100;

  const handleSelectOption = (idx) => {
    if (isValidated) return;
    setSelectedOption(idx);
  };

  const handleValidate = () => {
    if (selectedOption === null) return;
    setIsValidated(true);
    const isCorrect = selectedOption === currentQuestion.correctOptionIndex;
    setHistory((prev) => [...prev, isCorrect]);
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setSelectedOption(null);
      setIsValidated(false);
    } else {
      setQuizFinished(true);
      if (onComplete) {
        const correctCount = history.filter(Boolean).length;
        onComplete({ correctCount, total: questions.length, timeTaken });
      }
    }
  };

  const handleRetry = () => {
    setCurrentStep(0);
    setSelectedOption(null);
    setIsValidated(false);
    setHistory([]);
    setTimeTaken(0);
    setQuizFinished(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (quizFinished) {
    const score = history.filter(Boolean).length;
    const pct = Math.round((score / questions.length) * 100);
    let feedbackTier = "Needs Review";
    let TierIcon = BookOpen;
    if (pct >= 85) { feedbackTier = "Distinguished Mastery"; TierIcon = Trophy; }
    else if (pct >= 60) { feedbackTier = "Steady Progress"; TierIcon = TrendingUp; }

    return (
      <div className="quiz-scorecard card-base sweeping-border">
        <Award size={48} className="scorecard-icon" />
        <h2>Evaluation Scorecard</h2>
        <p className="feedback-tier"><TierIcon size={24} /> {feedbackTier}</p>
        <div className="metrics-summary">
          <div className="metric-box">
            <span className="box-val">{score} / {questions.length}</span>
            <span className="box-lbl">Correct Answers</span>
          </div>
          <div className="metric-box">
            <span className="box-val">{pct}%</span>
            <span className="box-lbl">Total Score</span>
          </div>
          <div className="metric-box">
            <span className="box-val"><Timer size={16} /> {formatTime(timeTaken)}</span>
            <span className="box-lbl">Duration</span>
          </div>
        </div>
        <button className="btn btn-primary retry-btn" onClick={handleRetry}>
          <RefreshCw size={16} /> Re-evaluate
        </button>
      </div>
    );
  }

  return (
    <div className="stepped-quiz-widget">
      <div className="quiz-header">
        <div className="quiz-meta-info">
          <span>Question {currentStep + 1} of {questions.length}</span>
          <span className="timer-display"><Timer size={14} /> {formatTime(timeTaken)}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="question-wrapper">
        <h3 className="question-text">{currentQuestion.text}</h3>
        <div className="options-stack">
          {currentQuestion.options.map((option, idx) => {
            let stateClass = '';
            if (isValidated) {
              if (idx === currentQuestion.correctOptionIndex) {
                stateClass = 'option-correct';
              } else if (idx === selectedOption) {
                stateClass = 'option-incorrect';
              } else {
                stateClass = 'option-disabled';
              }
            } else if (idx === selectedOption) {
              stateClass = 'option-selected';
            }
            return (
              <button
                key={idx}
                className={`option-button ${stateClass}`}
                onClick={() => handleSelectOption(idx)}
                disabled={isValidated}
              >
                <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                <span className="option-body-text">{option}</span>
                <span className="option-validation-icon">
                  {isValidated && idx === currentQuestion.correctOptionIndex && <Check size={16} />}
                  {isValidated && idx === selectedOption && idx !== currentQuestion.correctOptionIndex && <X size={16} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="quiz-action-bar">
        {!isValidated ? (
          <button
            className="btn btn-primary submit-ans-btn"
            onClick={handleValidate}
            disabled={selectedOption === null}
          >
            Check Answer
          </button>
        ) : (
          <button className="btn btn-primary submit-ans-btn" onClick={handleNext}>
            {currentStep === questions.length - 1 ? 'Show Scorecard' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
