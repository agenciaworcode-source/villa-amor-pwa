'use client'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmBg = variant === 'danger' ? '#EF4444' : '#B8864E'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(28,28,28,0.5)',
        zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'white', borderRadius: 16, padding: 32,
          width: 'min(380px, 90vw)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)', textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>
          {variant === 'danger' ? '⚠️' : '❓'}
        </div>
        <h3 style={{
          fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700,
          color: '#1C1C1C', marginBottom: 8, margin: '0 0 8px',
        }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: '#9C8E80', lineHeight: 1.6, margin: '0 0 24px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1.5px solid #EDE0C8',
              background: 'white', color: '#5C5248', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-lato)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: confirmBg, color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-lato)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
