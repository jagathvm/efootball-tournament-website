import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import GroupStandings from './components/GroupStandings';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import './App.css';
import KnockoutBracket from './components/KnockoutBracket';
import Fixtures from './components/Fixtures';

function App() {
  const [isAdminView, setIsAdminView] = useState(false);
  const [session, setSession] = useState(null);
  const [activePublicTab, setActivePublicTab] = useState('standings');

  // Listen for login/logout events
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Subscribe to changes (e.g., when a user logs in or out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="app-wrapper">
    <header>
    <h1>Nila FC eFootball World Cup</h1>
    <div className="header-controls">
    <button
    className="view-toggle-btn"
    onClick={() => setIsAdminView(!isAdminView)}
    >
    {isAdminView ? 'Switch to Public Dashboard' : 'Switch to Admin Panel'}
    </button>

    {/* Show Logout button only if logged in and on the Admin View */}
    {session && isAdminView && (
      <button className="logout-btn" onClick={handleLogout}>
      Log Out
      </button>
    )}
    </div>
    </header>

    <main className="dashboard-layout">
    {isAdminView ? (
      <section className="full-width-panel">
      {!session ? <Login /> : <AdminPanel />}
      </section>
    ) : (
      <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
      <button
      className="view-toggle-btn"
      onClick={() => setActivePublicTab('standings')}
      style={{ opacity: activePublicTab === 'standings' ? 1 : 0.7 }}
      >
      Group Table
      </button>
      <button
      className="view-toggle-btn"
      onClick={() => setActivePublicTab('fixtures')}
      style={{ opacity: activePublicTab === 'fixtures' ? 1 : 0.7 }}
      >
      Group Fixtures
      </button>
      <button
      className="view-toggle-btn"
      onClick={() => setActivePublicTab('knockout')}
      style={{ opacity: activePublicTab === 'knockout' ? 1 : 0.7 }}
      >
      Knockout Fixtures
      </button>
      </div>

      {activePublicTab === 'standings' && (
      <section className="full-width-panel">
      <GroupStandings />
      </section>
      )}

      {activePublicTab === 'fixtures' && (
      <section className="full-width-panel">
      <Fixtures />
      </section>
      )}

      {activePublicTab === 'knockout' && (
      <section className="full-width-panel">
      <KnockoutBracket />
      </section>
      )}
      </>
    )}
    </main>
    </div>
  );
}

export default App;
