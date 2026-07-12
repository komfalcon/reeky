import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ListOrdered, CheckCircle2 } from 'lucide-react';
import QueuePage from './pages/QueuePage';
import CompletedPage from './pages/CompletedPage';

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0 1.5rem',
        height: 48,
        background: 'var(--panel-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        borderBottom: '1px solid var(--panel-border)',
        flexShrink: 0,
        zIndex: 100,
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginRight: '1rem' }}>
          Reeky Admin
        </span>
        <NavLink
          to="/queue"
          className="btn btn-secondary"
          style={({ isActive }) => ({
            padding: '0.4rem 0.9rem',
            fontSize: '0.8rem',
            textDecoration: 'none',
            background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
            color: isActive ? 'white' : 'var(--text-main)',
          })}
        >
          <ListOrdered size={16} /> Queue
        </NavLink>
        <NavLink
          to="/completed"
          className="btn btn-secondary"
          style={({ isActive }) => ({
            padding: '0.4rem 0.9rem',
            fontSize: '0.8rem',
            textDecoration: 'none',
            background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
            color: isActive ? 'white' : 'var(--text-main)',
          })}
        >
          <CheckCircle2 size={16} /> Completed
        </NavLink>
      </nav>

      {/* Page Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/completed" element={<CompletedPage />} />
          <Route path="*" element={<Navigate to="/queue" replace />} />
        </Routes>
      </div>
    </div>
  );
}
