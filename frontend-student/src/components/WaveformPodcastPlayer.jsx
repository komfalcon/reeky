import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, ListMusic } from 'lucide-react';
import './WaveformPlayer.css';

export default function WaveformPodcastPlayer({ audioUrl, transcript = [] }) {
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [activeLine, setActiveLine] = useState(0);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      drawWaveform();
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    const lineIndex = transcript.findIndex((line, idx) => {
      const nextLine = transcript[idx + 1];
      return time >= line.start && (!nextLine || time < nextLine.start);
    });
    if (lineIndex !== -1 && lineIndex !== activeLine) {
      setActiveLine(lineIndex);
      scrollToActiveLine(lineIndex);
    }
  };

  const scrollToActiveLine = (idx) => {
    const activeEl = containerRef.current?.querySelector(`[data-index="${idx}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleLineSeek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const barWidth = 3;
    const gap = 2;
    const barsCount = Math.floor(width / (barWidth + gap));
    for (let i = 0; i < barsCount; i++) {
      const scale = Math.sin(i * 0.15) * Math.cos(i * 0.05);
      const val = Math.max(10, Math.abs(scale) * (height - 20));
      const x = i * (barWidth + gap);
      const y = (height - val) / 2;
      const progressRatio = currentTime / (duration || 1);
      const currentBarRatio = i / barsCount;
      if (currentBarRatio <= progressRatio) {
        ctx.fillStyle = '#6366f1';
      } else {
        ctx.fillStyle = '#cbd5e1';
      }
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, val, 2);
      ctx.fill();
    }
  };

  useEffect(() => {
    drawWaveform();
  }, [currentTime, duration]);

  const progressPct = (currentTime / (duration || 1)) * 100;

  return (
    <div className="podcast-player-card">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      <div className="player-body">
        <div className="waveform-display">
          <canvas ref={canvasRef} width={600} height={100} className="waveform-canvas" />
          <div className="waveform-progress-line" style={{ left: `${progressPct}%` }} />
        </div>
        <div className="media-controls">
          <button className="play-toggle-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <div className="volume-controls">
            <Volume2 size={16} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeChange}
            />
          </div>
        </div>
      </div>
      <div className="transcript-container-wrapper">
        <div className="transcript-header">
          <ListMusic size={16} /> Transcript Highlight
        </div>
        <div ref={containerRef} className="transcript-content">
          {transcript.map((line, idx) => {
            const isActive = idx === activeLine;
            return (
              <div
                key={idx}
                data-index={idx}
                className={`transcript-line ${isActive ? 'active' : ''}`}
                onClick={() => handleLineSeek(line.start)}
              >
                <span className="timestamp">
                  {Math.floor(line.start / 60)}:{(line.start % 60).toString().padStart(2, '0')}
                </span>
                <p className="line-text">{line.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
