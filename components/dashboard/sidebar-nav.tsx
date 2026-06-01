'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import Image from 'next/image'

const NAV_SECTIONS = [
  {
    label: 'Visão Geral',
    items: [
      { id: 'dashboard',  href: '/dashboard',            label: 'Dashboard',            icon: '▦' },
      { id: 'residents',  href: '/dashboard/residents',   label: 'Residentes',           icon: '◎' },
      { id: 'executions', href: '/dashboard/executions',  label: 'Execuções',            icon: '◈' },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { id: 'incidents',  href: '/dashboard/incidents',   label: 'Intercorrências',      icon: '⚠' },
      { id: 'pops',       href: '/dashboard/pops',        label: 'POPs',                 icon: '☰' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { id: 'team',       href: '/dashboard/team',        label: 'Equipe',               icon: '◷' },
      { id: 'handover',   href: '/dashboard/handover',    label: 'Passagem de Plantão',  icon: '⇄' },
      { id: 'reports',    href: '/dashboard/reports',     label: 'Relatórios',           icon: '▤' },
      { id: 'settings',   href: '/dashboard/settings',    label: 'Configurações',        icon: '⚙' },
    ],
  },
]

function LiveClock() {
  const [time, setTime] = useState<Date | null>(null)
  useEffect(() => {
    setTime(new Date())
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!time) return <span className="font-mono text-[13px] tracking-wide" style={{ color: '#C9A96E' }}>--:--:--</span>
  const hh = time.getHours().toString().padStart(2, '0')
  const mm = time.getMinutes().toString().padStart(2, '0')
  const ss = time.getSeconds().toString().padStart(2, '0')
  return (
    <span className="font-mono text-[13px] tracking-wide" style={{ color: '#C9A96E' }}>
      {hh}:{mm}:{ss}
    </span>
  )
}

function LiveDate() {
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    setLabel(new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }))
  }, [])
  return <div style={{ fontSize: 10, color: '#9C8E80', marginTop: 2 }}>{label ?? ''}</div>
}

export function SidebarNav({ alertCount = 0 }: { alertCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'VA'

  return (
    <nav
      className="fixed left-0 top-0 bottom-0 z-50 flex flex-col overflow-y-auto"
      style={{ width: 224, background: '#FDFAF5', borderRight: '1px solid #EDE0C8' }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid #EDE0C8', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #B8864E', background: '#F7F0E3', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src="/villa-amor-logo.png" alt="Villa Amor" width={44} height={44} className="object-cover" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 15, fontWeight: 800, color: '#8f7430', letterSpacing: '-0.3px' }}>
            Villa Amor
          </div>
          <span style={{ display: 'block', fontSize: 9, color: '#9C8E80', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>
            Residencial Sênior
          </span>
        </div>
      </div>

      {/* Turno + Relógio */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #EDE0C8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', flexShrink: 0, boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1C1C1C' }}>Turno Ativo</span>
        </div>
        <LiveClock />
        <LiveDate />
      </div>

      {/* Itens de Nav */}
      <div style={{ flex: 1, paddingTop: 8, paddingBottom: 16 }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: '#9C8E80', padding: '16px 20px 6px' }}>
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 20px', fontSize: 12.5,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#8f7430' : '#5C5248',
                    textDecoration: 'none',
                    borderLeft: `2px solid ${isActive ? '#B8864E' : 'transparent'}`,
                    background: isActive ? 'rgba(184,134,78,0.10)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 13, opacity: 0.7 }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === 'dashboard' && alertCount > 0 && (
                    <span style={{ marginLeft: 'auto', background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 9999, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>
                      {alertCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Usuário */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #EDE0C8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(184,134,78,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#8f7430' }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email?.split('@')[0] ?? 'Usuário'}
            </div>
            <div style={{ fontSize: 10, color: '#9C8E80' }}>Administrador</div>
          </div>
          <button onClick={handleSignOut} title="Sair" style={{ background: 'none', border: 'none', fontSize: 14, color: '#9C8E80', cursor: 'pointer', padding: 4 }}>
            ⏻
          </button>
        </div>
      </div>
    </nav>
  )
}
