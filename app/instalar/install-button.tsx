'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallButton() {
  const [prompt, setPrompt]       = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIOS, setIsIOS]         = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detecta iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    // Já está instalado como PWA?
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    // Android Chrome: captura o evento de instalação
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  // Já instalado
  if (isStandalone) {
    return (
      <div style={{
        margin: '0 0 32px',
        padding: '18px 20px',
        background: '#F0FDF4',
        border: '1.5px solid #86EFAC',
        borderRadius: 16,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 22, marginBottom: 6 }}>✅</p>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>App já instalado!</p>
        <p style={{ fontSize: 12, color: '#4ADE80', marginTop: 4 }}>Você está usando o Villa Amor como aplicativo.</p>
      </div>
    )
  }

  // Android Chrome: botão de instalação nativo
  if (prompt || installed) {
    return (
      <div style={{ margin: '0 0 32px', textAlign: 'center' }}>
        {installed ? (
          <div style={{
            padding: '18px 20px',
            background: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            borderRadius: 16,
          }}>
            <p style={{ fontSize: 22, marginBottom: 6 }}>🎉</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>Instalado com sucesso!</p>
            <p style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
              Procure o ícone do Villa Amor na sua tela inicial.
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            style={{
              width: '100%',
              padding: '17px 24px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #B8864E 0%, #D4A76A 100%)',
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(184,134,78,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 20 }}>📲</span>
            Instalar o App Agora
          </button>
        )}
      </div>
    )
  }

  // iOS: mostra banner informativo (sem API disponível)
  if (isIOS) {
    return (
      <div style={{
        margin: '0 0 32px',
        padding: '16px 18px',
        background: 'white',
        border: '1.5px solid #EDE0C8',
        borderRadius: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>ℹ️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginBottom: 3 }}>
            No iPhone, siga o passo a passo abaixo
          </p>
          <p style={{ fontSize: 12, color: '#9C8E80', lineHeight: 1.5 }}>
            O iOS não permite botão de instalação automática — use o Safari e siga as instruções da seção iPhone abaixo.
          </p>
        </div>
      </div>
    )
  }

  // Desktop ou navegador sem suporte a PWA install
  return (
    <div style={{
      margin: '0 0 32px',
      padding: '16px 18px',
      background: 'white',
      border: '1.5px solid #EDE0C8',
      borderRadius: 16,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>💡</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginBottom: 3 }}>
          Abra esta página no celular
        </p>
        <p style={{ fontSize: 12, color: '#9C8E80', lineHeight: 1.5 }}>
          Para instalar o app, acesse este endereço pelo Chrome no Android ou Safari no iPhone.
        </p>
      </div>
    </div>
  )
}
