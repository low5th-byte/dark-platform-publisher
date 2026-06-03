import React, { useState, useEffect } from 'react';

const PLATFORMS = [
  { id: 'x', label: '𝕏 (Twitter / X)' },
  { id: 'threads', label: 'Threads' },
];

export default function Settings() {
  const [statuses, setStatuses] = useState({ x: null, threads: null });
  const [loginOpen, setLoginOpen] = useState({ x: false, threads: false });
  const [checking, setChecking] = useState({ x: false, threads: false });

  useEffect(() => { checkAll(); }, []);

  async function checkAll() {
    if (!window.api) return;
    const results = await Promise.all(PLATFORMS.map(p => window.api.auth.status(p.id)));
    setStatuses({ x: results[0], threads: results[1] });
  }

  async function handleLogin(id) {
    setLoginOpen(prev => ({ ...prev, [id]: true }));
    await window.api.auth.login(id);
  }

  async function handleCloseLogin(id) {
    await window.api.auth.loginClose(id);
    setLoginOpen(prev => ({ ...prev, [id]: false }));
    handleCheck(id);
  }

  async function handleCheck(id) {
    setChecking(prev => ({ ...prev, [id]: true }));
    try {
      const status = await window.api.auth.status(id);
      setStatuses(prev => ({ ...prev, [id]: status }));
    } finally {
      setChecking(prev => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div className="settings">
      <h2 className="settings-title">ログイン設定</h2>
      <p className="settings-desc">
        「ブラウザでログイン」を押すと Chrome が開きます。ログイン後、「ブラウザを閉じる」ボタンを押してください。
      </p>

      {PLATFORMS.map(({ id, label }) => {
        const status = statuses[id];
        const isOpen = loginOpen[id];

        let statusText = '確認中…';
        let statusCls = '';
        if (status?.busy) {
          statusText = 'ログインブラウザ起動中';
          statusCls = 'busy';
        } else if (status?.loggedIn === true) {
          statusText = '● ログイン済み';
          statusCls = 'ok';
        } else if (status?.loggedIn === false) {
          statusText = '○ 未ログイン';
          statusCls = 'no';
        }

        return (
          <div key={id} className="s-card">
            <div className="s-card-top">
              <span className="s-name">{label}</span>
              <span className={`s-status ${statusCls}`}>{statusText}</span>
            </div>

            <div className="s-actions">
              {!isOpen ? (
                <button className="btn-primary" onClick={() => handleLogin(id)}>
                  ブラウザでログイン
                </button>
              ) : (
                <button className="btn-danger" onClick={() => handleCloseLogin(id)}>
                  ブラウザを閉じる
                </button>
              )}
              <button
                className="btn-ghost"
                onClick={() => handleCheck(id)}
                disabled={checking[id] || isOpen}
              >
                {checking[id] ? '確認中…' : '状態を更新'}
              </button>
            </div>

            {status?.error && (
              <p className="s-error">{status.error}</p>
            )}
          </div>
        );
      })}

      <div className="s-note">
        <p className="note-title">注意事項</p>
        <ul>
          <li>各プラットフォームに別々のブラウザプロファイルでログインします。</li>
          <li>Google Chrome がインストールされていない場合は <code>npm run install-browsers</code> を実行してください。</li>
          <li>予約投稿はこのアプリが起動している間のみ実行されます。</li>
        </ul>
      </div>
    </div>
  );
}
