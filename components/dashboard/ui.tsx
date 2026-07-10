'use client'

import { ReactNode, CSSProperties } from 'react'
import { ExecutionStatus } from '@/types'

// ---- Badge ----
type BadgeVariant = 'muted' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'dark'

const BADGE_VARIANTS: Record<BadgeVariant, { bg: string; color: string; dotColor: string }> = {
  muted:   { bg: '#F5F5F0', color: '#9C8E80', dotColor: '#9C8E80' },
  gold:    { bg: '#FFF8EE', color: '#7a5c1a', dotColor: '#ae8f3b' },
  success: { bg: '#F0FDF4', color: '#15803D', dotColor: '#22C55E' },
  warning: { bg: '#FFFBEB', color: '#B45309', dotColor: '#F59E0B' },
  danger:  { bg: '#FEF2F2', color: '#B91C1C', dotColor: '#EF4444' },
  info:    { bg: '#EFF6FF', color: '#1D4ED8', dotColor: '#3B82F6' },
  purple:  { bg: '#F5F3FF', color: '#6D28D9', dotColor: '#7C3AED' },
  dark:    { bg: '#2E2E2E', color: '#F7F0E3', dotColor: '#ae8f3b' },
}

export function Badge({ variant = 'muted', dot = false, children, style }: { variant?: BadgeVariant; dot?: boolean; children: ReactNode; style?: CSSProperties }) {
  const v = BADGE_VARIANTS[variant]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: v.bg, color: v.color, whiteSpace: 'nowrap', ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.dotColor, flexShrink: 0 }} />}
      {children}
    </span>
  )
}

// ---- StatusBadge ----
const STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  completed:   { variant: 'success', label: 'Concluído' },
  in_progress: { variant: 'gold',    label: 'Em andamento' },
  late:        { variant: 'danger',  label: 'Atrasado' },
  pending:     { variant: 'muted',   label: 'Não iniciado' },
  incomplete:  { variant: 'warning', label: 'Incompleto' },
  open:        { variant: 'danger',  label: 'Aberta' },
  monitoring:  { variant: 'warning', label: 'Monitorando' },
  resolved:    { variant: 'success', label: 'Resolvida' },
}

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_MAP[status] ?? STATUS_MAP.pending
  return <Badge variant={m.variant} dot>{m.label}</Badge>
}

// ---- ProgressBar ----
const PROGRESS_COLORS: Record<string, string> = {
  completed:   '#22C55E',
  in_progress: '#B8864E',
  late:        '#EF4444',
  pending:     '#D9C9A8',
}

export function ProgressBar({ value, status = 'in_progress', height = 5 }: { value: number; status?: string; height?: number }) {
  return (
    <div style={{ height, background: '#EDE0C8', borderRadius: 9999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: PROGRESS_COLORS[status] ?? '#B8864E', borderRadius: 9999, transition: 'width 0.6s ease' }} />
    </div>
  )
}

// ---- Avatar ----
export function Avatar({ initials, bg = '#F7F0E3', color = '#B8864E', size = 40 }: { initials: string; bg?: string; color?: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

// ---- Card ----
export function Card({ children, style = {}, onClick }: { children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ background: 'white', borderRadius: 12, border: '1px solid #EDE0C8', boxShadow: '0 2px 16px rgba(28,28,28,0.08)', transition: 'all 0.2s', cursor: onClick ? 'pointer' : 'default', ...style }}
    >
      {children}
    </div>
  )
}

// ---- KpiCard ----
export function KpiCard({ label, value, sub, accent = false, icon }: { label: string; value: string | number; sub?: string; accent?: boolean; icon?: string }) {
  return (
    <Card style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9C8E80' }}>{label}</span>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 36, fontWeight: 800, color: accent ? '#B8864E' : '#1C1C1C', lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#9C8E80', marginTop: 6 }}>{sub}</div>}
    </Card>
  )
}

// ---- SectionHeader ----
export function SectionHeader({ eyebrow, title, sub, action }: { eyebrow?: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        {eyebrow && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#B8864E', marginBottom: 4 }}>{eyebrow}</div>}
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 800, color: '#1C1C1C', margin: 0, lineHeight: 1.2, letterSpacing: '-0.3px' }}>{title}</h2>
        {sub && <p style={{ fontSize: 14, color: '#5C5248', marginTop: 6, margin: '6px 0 0' }}>{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ---- Btn ----
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type BtnSize = 'sm' | 'md' | 'lg'

export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'submit', style: extraStyle = {} }: {
  children: ReactNode; variant?: BtnVariant; size?: BtnSize;
  onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' | 'reset'; style?: React.CSSProperties
}) {
  const sizes: Record<BtnSize, React.CSSProperties> = {
    sm: { padding: '7px 13px', fontSize: 12 },
    md: { padding: '9px 15px', fontSize: 13 },
    lg: { padding: '12px 20px', fontSize: 14 },
  }
  const variants: Record<BtnVariant, React.CSSProperties> = {
    primary:   { background: '#B8864E', color: 'white', border: 'none' },
    secondary: { background: 'transparent', color: '#8f7430', border: '1.5px solid #B8864E' },
    ghost:     { background: 'transparent', color: '#5C5248', border: 'none' },
    danger:    { background: '#EF4444', color: 'white', border: 'none' },
    success:   { background: '#22C55E', color: 'white', border: 'none' },
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sizes[size], ...variants[variant],
        borderRadius: 8, fontFamily: 'var(--font-lato)', fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', gap: 7,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'all 0.18s',
        ...extraStyle,
      }}
    >
      {children}
    </button>
  )
}

// ---- AlertBanner ----
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'
const ALERT_COLORS: Record<AlertSeverity, { border: string; bg: string }> = {
  critical: { border: '#EF4444', bg: '#FEF2F2' },
  high:     { border: '#F59E0B', bg: '#FFFBEB' },
  medium:   { border: '#B8864E', bg: '#FFF8EE' },
  low:      { border: '#93C5FD', bg: '#EFF6FF' },
}

export function AlertBanner({ severity, title, desc, time, actions }: {
  severity: AlertSeverity; title: string; desc?: string; time?: string; actions?: ReactNode
}) {
  const c = ALERT_COLORS[severity]
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #EDE0C8', borderLeft: `4px solid ${c.border}`, padding: '13px 16px', boxShadow: '0 1px 3px rgba(28,28,28,0.06)', marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginBottom: 3 }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: '#9C8E80', marginBottom: actions ? 10 : 0 }}>{desc}</div>}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
          {time && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9C8E80', marginLeft: 'auto' }}>{time}</span>}
        </div>
      )}
    </div>
  )
}

// ---- Divider ----
export function Divider() {
  return <div style={{ height: 1, background: '#F7F0E3' }} />
}

// ---- EmptyState ----
export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9C8E80' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#5C5248', marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  )
}
