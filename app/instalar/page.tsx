import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Instalar App — Villa Amor',
  description: 'Instale o aplicativo Villa Amor no seu celular em segundos.',
}

export default function InstalarPage() {
  return (
    <main style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #FDFAF5 0%, #F7F0E3 100%)',
      fontFamily: 'var(--font-lato), system-ui, sans-serif',
      color: '#1C1C1C',
    }}>

      {/* ── Header ── */}
      <header style={{
        background: '#1C1C1C',
        padding: '0 20px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="Villa Amor" width={36} height={36} style={{ borderRadius: 10, objectFit: 'cover' }} />
          <span style={{ color: 'white', fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>Villa Amor</span>
        </div>
      </header>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 96, height: 96, borderRadius: 24, overflow: 'hidden',
            margin: '0 auto 20px', boxShadow: '0 8px 32px rgba(184,134,78,0.25)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-512.png" alt="Ícone do App" width={96} height={96} style={{ objectFit: 'cover' }} />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 700, color: '#1C1C1C',
            marginBottom: 10, lineHeight: 1.2,
            fontFamily: 'var(--font-playfair), Georgia, serif',
          }}>
            Instale o app<br />no seu celular
          </h1>
          <p style={{ fontSize: 15, color: '#5C5248', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
            Acesse rapidamente a partir da tela inicial, sem precisar abrir o navegador.
          </p>
        </div>

        {/* ── Badges de características ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
          {['Gratuito', 'Sem App Store', 'Funciona offline', 'Seguro'].map(tag => (
            <span key={tag} style={{
              padding: '5px 14px', borderRadius: 20,
              background: 'white', border: '1.5px solid #EDE0C8',
              fontSize: 12, fontWeight: 700, color: '#B8864E',
              letterSpacing: '0.2px',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* ── iOS ── */}
        <div style={{
          background: 'white', borderRadius: 20, border: '1.5px solid #EDE0C8',
          overflow: 'hidden', marginBottom: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(90deg, #000000 0%, #1a1a2e 100%)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 26 }}>🍎</span>
            <div>
              <p style={{ color: 'white', fontSize: 15, fontWeight: 700, margin: 0 }}>iPhone / iPad</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0 }}>Safari · iOS 14+</p>
            </div>
          </div>

          <div style={{ padding: '20px 20px 24px' }}>
            {[
              {
                num: '1',
                icon: '🌐',
                title: 'Abra no Safari',
                desc: 'Acesse este endereço diretamente pelo Safari (não funciona no Chrome do iPhone).',
              },
              {
                num: '2',
                icon: '⬆️',
                title: 'Toque em "Compartilhar"',
                desc: 'Na barra inferior, toque no ícone de compartilhar (quadrado com seta para cima).',
              },
              {
                num: '3',
                icon: '➕',
                title: 'Toque em "Adicionar à Tela de Início"',
                desc: 'Role a lista para baixo e escolha essa opção. Confirme tocando em "Adicionar".',
              },
              {
                num: '4',
                icon: '✅',
                title: 'Pronto!',
                desc: 'O ícone do Villa Amor aparecerá na sua tela inicial. Abra como qualquer app.',
              },
            ].map((step, i, arr) => (
              <div key={step.num} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                paddingBottom: i < arr.length - 1 ? 16 : 0,
                marginBottom: i < arr.length - 1 ? 16 : 0,
                borderBottom: i < arr.length - 1 ? '1px solid #F7F0E3' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#F7F0E3', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {step.icon}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginBottom: 3 }}>
                    <span style={{ color: '#B8864E', marginRight: 4 }}>{step.num}.</span>
                    {step.title}
                  </p>
                  <p style={{ fontSize: 12, color: '#9C8E80', lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Android ── */}
        <div style={{
          background: 'white', borderRadius: 20, border: '1.5px solid #EDE0C8',
          overflow: 'hidden', marginBottom: 32,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(90deg, #00695C 0%, #00897B 100%)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 26 }}>🤖</span>
            <div>
              <p style={{ color: 'white', fontSize: 15, fontWeight: 700, margin: 0 }}>Android</p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: 0 }}>Chrome · Android 8+</p>
            </div>
          </div>

          <div style={{ padding: '20px 20px 24px' }}>
            {[
              {
                num: '1',
                icon: '🌐',
                title: 'Abra no Chrome',
                desc: 'Acesse este endereço pelo Google Chrome no seu Android.',
              },
              {
                num: '2',
                icon: '⋮',
                title: 'Toque nos 3 pontos (menu)',
                desc: 'No canto superior direito, toque nos três pontos verticais para abrir o menu.',
              },
              {
                num: '3',
                icon: '📲',
                title: 'Toque em "Instalar app" ou "Adicionar à tela inicial"',
                desc: 'A opção pode aparecer como banner automático ou dentro do menu. Confirme tocando em "Instalar".',
              },
              {
                num: '4',
                icon: '✅',
                title: 'Pronto!',
                desc: 'O Villa Amor estará na sua tela inicial e funciona como um aplicativo nativo.',
              },
            ].map((step, i, arr) => (
              <div key={step.num} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                paddingBottom: i < arr.length - 1 ? 16 : 0,
                marginBottom: i < arr.length - 1 ? 16 : 0,
                borderBottom: i < arr.length - 1 ? '1px solid #F7F0E3' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#F0FAF8', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {step.icon}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C', marginBottom: 3 }}>
                    <span style={{ color: '#00897B', marginRight: 4 }}>{step.num}.</span>
                    {step.title}
                  </p>
                  <p style={{ fontSize: 12, color: '#9C8E80', lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Dúvidas ── */}
        <div style={{
          background: '#FDFAF5', borderRadius: 16, border: '1.5px solid #EDE0C8',
          padding: '18px 20px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#5C5248', marginBottom: 4 }}>Precisa de ajuda?</p>
          <p style={{ fontSize: 12, color: '#9C8E80', lineHeight: 1.5 }}>
            Fale com o administrador do sistema ou acesse diretamente pelo navegador.
          </p>
        </div>

      </div>
    </main>
  )
}
