import React, { useState } from 'react';
import { RotateCw, ArrowLeft, ArrowRight } from 'lucide-react';
import './Flashcard.css';

export default function FlashcardFlipper({ cards = [], onRateConfidence }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (cards.length === 0) return <div className="empty-state">No flashcards generated.</div>;

  const currentCard = cards[currentIndex];
  const progressPercent = ((currentIndex + 1) / cards.length) * 100;

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  const handleRating = (rating) => {
    onRateConfidence?.(currentCard.id, rating);
    handleNext();
  };

  return (
    <div className="flashcard-widget">
      <div className="progress-container">
        <div className="progress-meta">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span>{Math.round(progressPercent)}% Complete</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="card-stage" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`card-wrapper ${isFlipped ? 'flipped' : ''}`}>
          <div className="card-face card-front">
            <span className="card-badge">Question</span>
            <div className="card-body">
              <p>{currentCard.question}</p>
            </div>
            <div className="card-hint-text">
              <RotateCw size={14} /> Click card to flip
            </div>
          </div>
          <div className="card-face card-back">
            <span className="card-badge back-badge">Answer</span>
            <div className="card-body">
              <p>{currentCard.answer}</p>
            </div>
            <div className="card-hint-text">Click card to see question</div>
          </div>
        </div>
      </div>

      <div className="control-deck">
        <button className="nav-btn" onClick={handlePrev} disabled={cards.length <= 1}>
          <ArrowLeft size={18} /> Prev
        </button>
        <div className="confidence-buttons">
          <button className="conf-btn conf-again" onClick={() => handleRating('again')}>Again</button>
          <button className="conf-btn conf-hard" onClick={() => handleRating('hard')}>Hard</button>
          <button className="conf-btn conf-good" onClick={() => handleRating('good')}>Good</button>
          <button className="conf-btn conf-easy" onClick={() => handleRating('easy')}>Easy</button>
        </div>
        <button className="nav-btn" onClick={handleNext} disabled={cards.length <= 1}>
          Next <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
