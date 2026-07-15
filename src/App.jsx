import React, { useState, useEffect, useCallback } from 'react';
import Composer from './components/Composer';
import Queue from './components/Queue';
import Settings from './components/Settings';

export default function App() {
  const [tab, setTab] = useState('compose');
  const [posts, setPosts] = useState([]);

  const loadPosts = useCallback(async () => {
    if (!window.api) return;
    const data = await window.api.posts.get();
    setPosts(data);
  }, []);

  useEffect(() => {
    loadPosts();
    if (!window.api) return;
    const unsub = window.api.onPostUpdate((updated) => {
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
    });
    return unsub;
  }, [loadPosts]);

  async function handleSchedule(postData) {
    const newPost = await window.api.posts.schedule(postData);
    setPosts(prev => [...prev, newPost]);
    setTab('queue');
  }

  async function handleCancel(id) {
    const updated = await window.api.posts.cancel(id);
    setPosts(prev => prev.map(p => p.id === id ? updated : p));
  }

  const pendingCount = posts.filter(p => p.status === 'pending').length;

  return (
    <div className="app">
      <header className="header">
        <span className="logo">■ DARK PLATFORM PUBLISHER</span>
        <nav className="nav">
          {[
            { id: 'compose', label: '作成' },
            { id: 'queue', label: `キュー${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { id: 'settings', label: '設定' },
          ].map(({ id, label }) => (
            <button
              key={id}
              className={`nav-btn${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === 'compose' && <Composer onSchedule={handleSchedule} />}
        {tab === 'queue' && <Queue posts={posts} onCancel={handleCancel} />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  );
}
