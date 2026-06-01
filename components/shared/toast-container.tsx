'use client'

import { useUIStore, ToastVariant } from '@/store/ui-store'

const STYLES: Record<ToastVariant, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#F0FDF4', border: '#22C55E', color: '#15803D', icon: '✓' },
  error:   { bg: '#FEF2F2', border: '#EF4444', color: '#B91C1C', icon: '✕' },
  warning: { bg: '#FFFBEB', border: '#F59E0B', color: '#92400E', icon: '⚠' },
  info:    { bg: '#EFF6FF', border: '#3B82F6', color: '#1D4ED8', icon: 'ℹ' },
}

export function ToastContainer() {
  const { toasts, dismiss } = useUIStore()
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 96, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      width: 'min(360px, calc(100vw - 32px))', pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = STYLES[t.variant]
        return (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 10,
              padding: '12px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ fontSize: 14, color: s.color, fontWeight: 700, flexShrink: 0, lineHeight: '20px' }}>
              {s.icon}
            </span>
            <p style={{ flex: 1, fontSize: 13, color: '#1C1C1C', lineHeight: 1.5, margin: 0, fontFamily: 'var(--font-lato)' }}>
              {t.message}
            </p>
            <button
              onClick={() => dismiss(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9C8E80', fontSize: 13, padding: 0, flexShrink: 0, lineHeight: '20px',
              }}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
