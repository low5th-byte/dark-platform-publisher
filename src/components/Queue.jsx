import React from 'react';

const STATUS = {
  pending:   { label: '待機中',     cls: 'pending' },
  sent:      { label: '投稿済み',   cls: 'sent' },
  failed:    { label: '失敗',       cls: 'failed' },
  missed:    { label: '期限切れ',   cls: 'missed' },
  cancelled: { label: 'キャンセル', cls: 'cancelled' },
};

export default function Queue({ posts, onCancel }) {
  if (posts.length === 0) {
    return <div className="empty">予約投稿はありません</div>;
  }

  const sorted = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="queue">
      {sorted.map(post => {
        const s = STATUS[post.status] ?? STATUS.pending;
        return (
          <div key={post.id} className={`q-item ${s.cls}`}>
            <div className="q-header">
              <div className="q-badges">
                {post.platforms.map(p => (
                  <span key={p} className="p-badge">{p === 'x' ? '𝕏' : 'TH'}</span>
                ))}
                {post.content.length > 1 && (
                  <span className="thread-badge">{post.content.length}件のスレッド</span>
                )}
              </div>
              <span className={`s-badge ${s.cls}`}>{s.label}</span>
            </div>

            <div className="q-content">
              {post.content.map((text, i) => (
                <p key={i} className="q-preview">
                  {post.content.length > 1 && <span className="q-num">{i + 1}. </span>}
                  {text.length > 120 ? text.slice(0, 120) + '…' : text}
                </p>
              ))}
            </div>

            <div className="q-footer">
              <time className="q-time">
                {new Date(post.scheduledTime).toLocaleString('ja-JP', {
                  year: 'numeric', month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </time>
              <div className="q-actions">
                {post.status === 'failed' && post.error && (
                  <span className="err-detail">{post.error}</span>
                )}
                {post.status === 'pending' && (
                  <button className="cancel-btn" onClick={() => onCancel(post.id)}>
                    キャンセル
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
