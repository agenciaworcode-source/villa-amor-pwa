'use client'

import { useState, useTransition } from 'react'
import { updateSettings, SystemSettings } from '@/app/actions/settings'
import { Card } from './ui'

// ─── helpers de UI ────────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #F7F0E3' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {icon}
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1C' }}>{title}</p>
      </div>
      {children}
    </Card>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#5C5248', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: '#9C8E80', marginBottom: 6 }}>{hint}</p>}
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1.5px solid #EDE0C8', background: 'white', fontSize: 13, color: '#1C1C1C', fontFamily: 'var(--font-lato)', outline: 'none', boxSizing: 'border-box' }}
    />
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#B8864E' : '#EDE0C8', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
      >
        <span style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
      <span style={{ fontSize: 13, color: '#5C5248' }}>{label}</span>
    </div>
  )
}

function SaveBtn({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      disabled={saving}
      onClick={onClick}
      style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, background: saved ? '#22C55E' : '#B8864E', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.3s' }}
    >
      {saving ? 'Salvando...' : saved ? '✓ Salvo' : 'Salvar'}
    </button>
  )
}

// ─── componente principal ──────────────────────────────────────────────────────

export function SettingsClient({ settings: initial }: { settings: SystemSettings }) {
  const [isPending, startTransition] = useTransition()

  // ── Geofencing ──────────────────────────────────────────────────────────────
  const [geoEnabled, setGeoEnabled] = useState(initial.geofence_enabled !== 'false')
  const [geoLat,     setGeoLat]     = useState(initial.geofence_lat     ?? '0')
  const [geoLng,     setGeoLng]     = useState(initial.geofence_lng     ?? '0')
  const [geoRadius,  setGeoRadius]  = useState(initial.geofence_radius_m ?? '100')
  const [geoSaved,   setGeoSaved]   = useState(false)

  function saveGeo() {
    startTransition(async () => {
      await updateSettings({
        geofence_enabled:  String(geoEnabled),
        geofence_lat:      geoLat,
        geofence_lng:      geoLng,
        geofence_radius_m: geoRadius,
      })
      setGeoSaved(true)
      setTimeout(() => setGeoSaved(false), 2500)
    })
  }

  // ── Câmera ──────────────────────────────────────────────────────────────────
  const [camGallery,  setCamGallery]  = useState(initial.camera_allow_gallery === 'true')
  const [camMaxVideo, setCamMaxVideo] = useState(initial.camera_max_video_seconds ?? '30')
  const [camSaved,    setCamSaved]    = useState(false)

  function saveCam() {
    startTransition(async () => {
      await updateSettings({
        camera_allow_gallery:     String(camGallery),
        camera_max_video_seconds: camMaxVideo,
      })
      setCamSaved(true)
      setTimeout(() => setCamSaved(false), 2500)
    })
  }

  // ── Horários dos Turnos ─────────────────────────────────────────────────────
  const [morningStart,  setMorningStart]  = useState(initial.shift_morning_start  ?? '07:00')
  const [morningEnd,    setMorningEnd]    = useState(initial.shift_morning_end    ?? '19:00')
  const [eveningStart,  setEveningStart]  = useState(initial.shift_evening_start  ?? '13:00')
  const [eveningEnd,    setEveningEnd]    = useState(initial.shift_evening_end    ?? '19:00')
  const [nightStart,    setNightStart]    = useState(initial.shift_night_start    ?? '19:00')
  const [nightEnd,      setNightEnd]      = useState(initial.shift_night_end      ?? '07:00')
  const [shiftSaved,    setShiftSaved]    = useState(false)

  function saveShifts() {
    startTransition(async () => {
      await updateSettings({
        shift_morning_start: morningStart,
        shift_morning_end:   morningEnd,
        shift_evening_start: eveningStart,
        shift_evening_end:   eveningEnd,
        shift_night_start:   nightStart,
        shift_night_end:     nightEnd,
      })
      setShiftSaved(true)
      setTimeout(() => setShiftSaved(false), 2500)
    })
  }

  return (
    <div style={{ maxWidth: 720 }}>

      {/* ── Geofencing ── */}
      <Section icon="📍" title="Geofencing (GPS)">
        <Field label="Ativar geofencing">
          <Toggle
            value={geoEnabled}
            onChange={setGeoEnabled}
            label={geoEnabled ? 'Colaboradores precisam estar na área para executar POPs' : 'Verificação de localização desativada'}
          />
        </Field>
        {geoEnabled && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Latitude" hint="Ex: -22.2148">
                <Input value={geoLat} onChange={setGeoLat} placeholder="-22.2148" />
              </Field>
              <Field label="Longitude" hint="Ex: -49.9484">
                <Input value={geoLng} onChange={setGeoLng} placeholder="-49.9484" />
              </Field>
            </div>
            <Field label="Raio (metros)" hint="Distância máxima permitida do ponto central">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range" min="50" max="500" step="10"
                  value={geoRadius}
                  onChange={e => setGeoRadius(e.target.value)}
                  style={{ flex: 1, accentColor: '#B8864E' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#B8864E', width: 60, textAlign: 'right' }}>{geoRadius}m</span>
              </div>
            </Field>
            <div style={{ padding: '10px 14px', background: '#FDFAF5', borderRadius: 8, fontSize: 12, color: '#9C8E80', marginTop: 4 }}>
              💡 Para obter as coordenadas: abra o Google Maps, clique com o botão direito na Villa Amor e copie as coordenadas.
            </div>
          </>
        )}
        <SaveBtn saving={isPending} saved={geoSaved} onClick={saveGeo} />
      </Section>

      {/* ── Câmera ── */}
      <Section icon="📷" title="Política de Câmera">
        <Field label="Duração máxima do vídeo" hint="Tempo limite para gravação de evidências em vídeo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range" min="10" max="120" step="5"
              value={camMaxVideo}
              onChange={e => setCamMaxVideo(e.target.value)}
              style={{ flex: 1, accentColor: '#B8864E' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#B8864E', width: 60, textAlign: 'right' }}>{camMaxVideo}s</span>
          </div>
        </Field>
        <Field label="Acesso à galeria do dispositivo">
          <Toggle
            value={camGallery}
            onChange={setCamGallery}
            label={camGallery ? 'Permitido — colaboradores podem enviar fotos da galeria' : 'Bloqueado — somente câmera ao vivo (recomendado por segurança jurídica)'}
          />
        </Field>
        {camGallery && (
          <div style={{ padding: '10px 14px', background: '#FFF7ED', border: '1px solid #F97316', borderRadius: 8, fontSize: 12, color: '#C2410C', marginTop: 4 }}>
            ⚠️ Atenção: permitir galeria pode comprometer a autenticidade das evidências registradas.
          </div>
        )}
        <SaveBtn saving={isPending} saved={camSaved} onClick={saveCam} />
      </Section>

      {/* ── Horários dos Turnos ── */}
      <Section icon="⏰" title="Horários dos Turnos">
        {[
          { label: 'Turno Diurno',     start: morningStart, end: morningEnd, setStart: setMorningStart, setEnd: setMorningEnd },
          { label: 'Turno Vespertino', start: eveningStart, end: eveningEnd, setStart: setEveningStart, setEnd: setEveningEnd },
          { label: 'Turno Noturno',    start: nightStart,   end: nightEnd,   setStart: setNightStart,   setEnd: setNightEnd },
        ].map(shift => (
          <div key={shift.label} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#5C5248', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{shift.label}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Início">
                <input type="time" value={shift.start} onChange={e => shift.setStart(e.target.value)}
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1.5px solid #EDE0C8', background: 'white', fontSize: 13, color: '#1C1C1C', outline: 'none', boxSizing: 'border-box' as const }} />
              </Field>
              <Field label="Fim">
                <input type="time" value={shift.end} onChange={e => shift.setEnd(e.target.value)}
                  style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 8, border: '1.5px solid #EDE0C8', background: 'white', fontSize: 13, color: '#1C1C1C', outline: 'none', boxSizing: 'border-box' as const }} />
              </Field>
            </div>
          </div>
        ))}
        <SaveBtn saving={isPending} saved={shiftSaved} onClick={saveShifts} />
      </Section>

      {/* ── Segurança (informativo) ── */}
      <Section icon="🔒" title="Segurança e Acesso">
        {[
          { label: 'Autenticação',     value: 'JWT via Supabase Auth' },
          { label: 'Banco de dados',   value: 'RLS ativo em todas as tabelas' },
          { label: 'Storage',          value: 'Bucket privado · Service Role para uploads' },
          { label: 'Conformidade',     value: 'LGPD — dados de saúde protegidos' },
          { label: 'Sessão',           value: 'Token renovado automaticamente' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F7F0E3' }}>
            <span style={{ fontSize: 13, color: '#5C5248', fontWeight: 600 }}>{item.label}</span>
            <span style={{ fontSize: 12, color: '#9C8E80', fontFamily: 'var(--font-mono)' }}>{item.value}</span>
          </div>
        ))}
      </Section>

    </div>
  )
}
