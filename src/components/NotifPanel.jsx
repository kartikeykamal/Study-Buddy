import React from 'react'
import { Bell, X } from 'lucide-react'
import { storage } from '../utils/index.js'

export default function NotifPanel({ onClose }) {
  const notifs = storage.get('notifications', [])
  const markRead = (id) => {
    storage.set('notifications', notifs.map(n => n.id === id ? { ...n, read: true } : n))
  }
  return (
    <div className="notif-panel">
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--b-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Bell size={13} strokeWidth={1.8} color="var(--t-secondary)" />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-primary)' }}>Notifications</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--t-muted)', cursor: 'pointer', fontSize: 11.5 }}
            onClick={() => { storage.set('notifications', notifs.map(n => ({ ...n, read: true }))); onClose() }}>
            Mark all read
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--t-ghost)', cursor: 'pointer', display: 'flex' }} onClick={onClose}>
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {notifs.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: 12.5, color: 'var(--t-ghost)' }}>
            No notifications yet
          </div>
        )}
        {notifs.map(n => (
          <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-subtle)', border: '1px solid var(--b-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bell size={12} strokeWidth={1.8} color="var(--t-muted)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: n.read ? 'var(--t-muted)' : 'var(--t-primary)', lineHeight: 1.5 }}>{n.msg}</div>
              <div style={{ fontSize: 10.5, color: 'var(--t-ghost)', marginTop: 2 }}>
                {new Date(n.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, alignSelf: 'center' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
