import { SectionHeader, Card, Btn } from '@/components/dashboard/ui'

const SETTINGS = [
  { icon: '📍', title: 'Geofencing',              desc: 'Raio: 100m · Villa Amor Marília/SP',                          btn: 'Configurar' },
  { icon: '🔔', title: 'Alertas e Notificações',  desc: 'Push: Admin + Supervisor. Escalonamento crítico ativo.',        btn: 'Gerenciar' },
  { icon: '⏰', title: 'Horários dos Turnos',     desc: 'Diurno 07:00–19:00 · Vespertino 13:00–19:00 · Noturno 19:00–07:00', btn: 'Editar' },
  { icon: '🔒', title: 'Segurança e Acesso',      desc: 'RLS ativo · Auth JWT · Buckets privados · LGPD registrado',   btn: 'Revisar' },
  { icon: '📷', title: 'Câmera',                  desc: 'Somente câmera ao vivo — galeria desabilitada (regra jurídica)', btn: 'Ver política' },
  { icon: '☁️', title: 'Armazenamento',           desc: 'Supabase Storage · Bucket execution-media · Acesso privado',  btn: 'Ver uso' },
]

export default function SettingsPage() {
  return (
    <div>
      <SectionHeader
        eyebrow="Sistema"
        title="Configurações"
        sub="Parâmetros gerais do sistema Villa Amor"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {SETTINGS.map(item => (
          <Card key={item.title} style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1C', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#9C8E80', marginBottom: 12 }}>{item.desc}</div>
                <Btn variant="secondary" size="sm">{item.btn}</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
