'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 24, textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div>
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 700, color: '#1C1C1C', marginBottom: 8 }}>
          Algo deu errado
        </h2>
        <p style={{ fontSize: 13, color: '#9C8E80', maxWidth: 360 }}>
          Ocorreu um erro ao carregar esta página. Tente novamente ou volte ao dashboard.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={reset}
          style={{ padding: '10px 20px', background: '#B8864E', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-lato)' }}
        >
          Tentar novamente
        </button>
        <Link
          href="/dashboard"
          style={{ padding: '10px 20px', background: '#F7F0E3', color: '#5C5248', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-lato)', textDecoration: 'none' }}
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
