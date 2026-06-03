import React, { useState } from 'react';

const LIMIT_X = 280;
const LIMIT_THREADS = 500;

function nowPlus30() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30, 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function Composer({ onSchedule }) {
  const [platforms, setPlatforms] = useState(['x', 'threads']);
  const [posts, setPosts] = useState(['']);
  const [scheduledTime, setScheduledTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const limit = platforms.includes('x') ? LIMIT_X : LIMIT_THREADS;

  function togglePlatform(p) {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  function updatePost(i, val) {
    setPosts(prev => { const n = [...prev]; n[i] = val; return n; });
  }

  function addPost() {
    setPosts(prev => [...prev, '']);
  }

  function removePost(i) {
    setPosts(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (platforms.length === 0) { setError('プラットフォームを選択してください'); return; }
    if (!posts[0].trim()) { setError('投稿内容を入力してください'); return; }
    if (!scheduledTime) { setError('投稿時間を選択してください'); return; }
    if (new Date(scheduledTime) <= new Date()) { setError('現在より後の時間を設定してください'); return; }
    const overLimit = posts.find(p => p.length > limit);
    if (overLimit) { setError(`${limit}文字以内にしてください`); return; }

    try {
      setBusy(true);
      await onSchedule({
        platforms,
        content: posts.map(p => p.trim()).filter(Boolean),
        scheduledTime: new Date(scheduledTime).toISOString(),
      });
      setPosts(['']);
      setScheduledTime('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      {/* Platform selector */}
      <div className="field">
        <label className="field-label">プラットフォーム</label>
        <div className="platform-toggles">
          {[{ id: 'x', label: '𝕏 (Twitter)' }, { id: 'threads', label: 'Threads' }].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`platform-btn${platforms.includes(id) ? ' selected' : ''}`}
              onClick={() => togglePlatform(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Thread composer */}
      <div className="field">
        <label className="field-label">
          投稿内容
          {posts.length > 1 && <span className="label-sub"> — {posts.length}件のスレッド</span>}
        </label>

        {posts.map((text, i) => (
          <div key={i} className="post-card">
            {posts.length > 1 && (
              <div className="post-card-header">
                <span className="post-idx">{i + 1}</span>
                {posts.length > 2 && (
                  <button type="button" className="remove-btn" onClick={() => removePost(i)}>×</button>
                )}
              </div>
            )}
            <textarea
              className={`post-textarea${text.length > limit ? ' over' : ''}`}
              value={text}
              onChange={e => updatePost(i, e.target.value)}
              placeholder={i === 0 ? '今何してる？' : 'スレッドに追加...'}
              rows={4}
            />
            <span className={`char-count${text.length > limit ? ' over' : text.length > limit * 0.85 ? ' warn' : ''}`}>
              {text.length} / {limit}
            </span>
          </div>
        ))}

        <button type="button" className="add-thread-btn" onClick={addPost}>
          ＋ スレッドに追加
        </button>
      </div>

      {/* Schedule */}
      <div className="field">
        <label className="field-label">投稿時間</label>
        <input
          type="datetime-local"
          className="dt-input"
          value={scheduledTime}
          min={nowPlus30()}
          onChange={e => setScheduledTime(e.target.value)}
        />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <button type="submit" className="submit-btn" disabled={busy || platforms.length === 0}>
        {busy ? '予約中…' : '予約投稿'}
      </button>
    </form>
  );
}
