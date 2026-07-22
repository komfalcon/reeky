import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ListOrdered, CheckCircle2, Layers, LogOut } from 'lucide-react';
import QueuePage from './pages/QueuePage';
import CompletedPage from './pages/CompletedPage';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { api } from './api';

export default function App() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('admin_api_key') || '');
  const [counts, setCounts] = useState({ pending: 0, processing: 0, completed: 0 });

  const refreshCounts = useCallback(async () => {
    if (!adminKey) return;
    try {
      const [active, done] = await Promise.all([
        api.getQueue(),
        api.getCompletedQueue().catch(() => ({ queue: [] })),
      ]);
      const activeItems = active?.queue || [];
      setCounts({
        pending: activeItems.filter((i) => i.status === 'PENDING').length,
        processing: activeItems.filter((i) => i.status === 'PROCESSING').length,
        completed: (done?.queue || []).length,
      });
    } catch {
      // keep previous counts; QueuePage surfaces auth/API errors
    }
  }, [adminKey]);

  useEffect(() => {
    refreshCounts();
    if (!adminKey) return;
    const id = setInterval(refreshCounts, 15000);
    return () => clearInterval(id);
  }, [refreshCounts, adminKey]);

  const handleAuthenticated = (key) => {
    setAdminKey(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_api_key');
    setAdminKey('');
  };

  if (!adminKey) {
    return <LoginPage onAuthenticated={handleAuthenticated} />;
  }

  const openCount = counts.pending + counts.processing;

  return (
    <ErrorBoundary>
      <div className="admin-shell">
        <nav className="admin-topbar">
          <div className="admin-brand">
            <div className="admin-brand-mark">
              <Layers size={16} />
            </div>
            <span>Reeky Admin</span>
          </div>
          <div className="admin-nav">
            <NavLink to="/queue" className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>
              <ListOrdered size={15} />
              Fulfillment
              {openCount > 0 && <span className="nav-badge">{openCount}</span>}
            </NavLink>
            <NavLink to="/completed" className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>
              <CheckCircle2 size={15} />
              Archive
              {counts.completed > 0 && <span className="nav-badge">{counts.completed}</span>}
            </NavLink>
          </div>
          <button
            onClick={handleLogout}
            className="admin-nav-link"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Logout"
          >
            <LogOut size={15} />
            Logout
          </button>
        </nav>

        <div className="admin-body">
          <Routes>
            <Route path="/queue" element={<QueuePage onQueueChange={refreshCounts} />} />
            <Route path="/completed" element={<CompletedPage onQueueChange={refreshCounts} />} />
            <Route path="*" element={<Navigate to="/queue" replace />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  );
}