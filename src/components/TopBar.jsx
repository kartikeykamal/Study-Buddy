import React, { useState, useEffect, useRef } from 'react'
import { Search, Bell, LogOut, Settings, User, ChevronDown } from 'lucide-react'
import { daysUntil } from '../utils/index.js'

export default function TopBar({ profile, onSearch, onNotifClick, notifCount, onLogout, onNavigate }) {
  const [time, setTime] = useState('')
  const [avatarOpen, setAvatarOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setTime(n.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const days = profile?.examDate ? daysUntil(profile.examDate) : null

  return (
    <div className="topbar">
      <div className="logo">
        StudyBuddy<span className="logo-dot">·</span>
      </div>

      <div className="topbar-center">
        {profile?.examType && (
          <div className="exam-chip">
            <span className="days">{days ?? '?'}</span>
            <span style={{ color: 'var(--t-ghost)', margin: '0 2px' }}>days until</span>
            <span style={{ fontWeight: 500 }}>{profile.examType}</span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Search */}
        <button className="icon-btn" title="Search  Ctrl+K" onClick={onSearch}>
          <Search size={14} strokeWidth={1.8} />
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" title="Notifications" onClick={onNotifClick}>
            <Bell size={14} strokeWidth={1.8} />
            {notifCount > 0 && <span className="dot" />}
          </button>
        </div>

        {/* Clock */}
        <span className="topbar-clock">{time}</span>

        {/* Avatar + dropdown */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => setAvatarOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: avatarOpen ? 'rgba(196,115,42,0.10)' : 'transparent',
              border: `1px solid ${avatarOpen ? 'rgba(196,115,42,0.28)' : 'rgba(140,120,90,0.18)'}`,
              borderRadius: 8, padding: '3px 7px 3px 4px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!avatarOpen) { e.currentTarget.style.background = 'rgba(196,115,42,0.07)'; e.currentTarget.style.borderColor = 'rgba(196,115,42,0.22)' } }}
            onMouseLeave={e => { if (!avatarOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(140,120,90,0.18)' } }}
          >
            <div className="avatar" style={{ width: 26, height: 26, fontSize: 13, borderRadius: 6 }}>
              {(profile?.name?.[0] || 'S').toUpperCase()}
            </div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: 'var(--t-secondary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.name || 'Scholar'}
            </span>
            <ChevronDown size={12} color="var(--t-muted)" style={{ transform: avatarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Dropdown */}
          {avatarOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              width: 188,
              background: '#fefcf8',
              border: '1px solid rgba(140,120,90,0.2)',
              borderRadius: 12,
              boxShadow: '0 8px 28px rgba(60,40,10,0.13), 0 2px 8px rgba(60,40,10,0.07)',
              overflow: 'hidden',
              animation: 'dropIn 0.18s cubic-bezier(0.16,1,0.3,1)',
              zIndex: 200,
            }}>
              <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-6px) scale(0.97); } to { opacity:1; transform:none; } }`}</style>

              {/* User info header */}
              <div style={{ padding: '11px 14px 10px', borderBottom: '1px solid rgba(160,140,110,0.14)' }}>
                <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: 16, color: '#2c2416', lineHeight: 1.2 }}>
                  {profile?.name || 'Scholar'}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: 'var(--t-muted)', marginTop: 2 }}>
                  {profile?.examType} · {days != null ? `${days}d left` : '—'}
                </div>
              </div>

              {/* Menu items */}
              {[
                { icon: User, label: 'Profile & Settings', action: () => { onNavigate('settings'); setAvatarOpen(false) } },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  fontSize: 12.5, fontWeight: 500, color: '#4a3f30',
                  transition: 'background 0.12s', textAlign: 'left',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(196,115,42,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Icon size={14} strokeWidth={1.8} color="var(--t-muted)" />
                  {label}
                </button>
              ))}

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(160,140,110,0.14)', margin: '2px 0' }} />

              {/* Logout */}
              <button
                onClick={() => { setAvatarOpen(false); onLogout() }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 14px 11px', background: 'none', border: 'none',
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  fontSize: 12.5, fontWeight: 600, color: '#a04030',
                  transition: 'background 0.12s', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,90,90,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={14} strokeWidth={1.8} color="#b85a5a" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
