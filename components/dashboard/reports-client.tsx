'use client'

import { useMemo, useState } from 'react'
import { SectionHeader, Card, Badge, Btn } from './ui'

interface ExecRow {
  id: string
  status: string
  started_at: string | null
  completed_at: string | null
  resident_id: string
  pop_id: string
  resident: { id: string; name: string; room_number: string } | null
  pop: { id: string; name: string } | null
  user: { id: string; name: string } | null
}

interface ResidentRow { id: string; name: string; room_number: string }
interface IncidentRow { id: string; resident_id: string; severity: string; occurred_at: string }

interface Props {
  executions: ExecRow[]
  residents: ResidentRow[]
  incidents: IncidentRow[]
}

const PERIODS = [
  { id: '7',  label: 'Últimos 7 dias' },
  { id: '14', label: 'Últimos 14 dias' },
  { id: '30', label: 'Últimos 30 dias' },
]

const STATUS_LABELS: Record<string, string> = {
  completed: 'Concluída', in_progress: 'Em andamento', late: 'Atrasada',
  pending: 'Pendente', incomplete: 'Incompleta',
}

async function exportToPDF(rows: ResidentReportRow[], period: string, kpis: { label: string; value: string }[]) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const today = new Date().toLocaleDateString('pt-BR')
  const W = doc.internal.pageSize.getWidth()

  // header
  doc.setFillColor(184, 134, 78)
  doc.rect(0, 0, W, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Villa Amor — Relatório de Conformidade', 14, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Período: últimos ${period} dias · Gerado em ${today}`, W - 14, 11, { align: 'right' })

  // KPI row
  let x = 14
  doc.setTextColor(28, 28, 28)
  kpis.forEach(k => {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(k.value, x, 32)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(156, 142, 128)
    doc.text(k.label.toUpperCase(), x, 38)
    doc.setTextColor(28, 28, 28)
    x += W / 4
  })

  // separator
  doc.setDrawColor(237, 224, 200)
  doc.line(14, 42, W - 14, 42)

  // table
  autoTable(doc, {
    startY: 46,
    head: [['Residente', 'Quarto', 'Execuções', 'Concluídas', 'Atrasadas', 'Incid.', 'Conformidade %']],
    body: rows.map(r => {
      const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : null
      return [r.name, r.room_number, r.total, r.completed, r.late, r.incidents, pct !== null ? `${pct}%` : '—']
    }),
    headStyles: { fillColor: [184, 134, 78], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: [28, 28, 28] },
    alternateRowStyles: { fillColor: [253, 250, 245] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  doc.save(`relatorio_conformidade_${period}d_${new Date().toISOString().split('T')[0]}.pdf`)
}

function exportToCSV(rows: ResidentReportRow[], period: string) {
  const headers = ['Residente', 'Quarto', 'Total Execuções', 'Concluídas', 'Conformidade (%)', 'Incidências']
  const data = rows.map(r => [
    r.name, r.room_number,
    String(r.total), String(r.completed),
    r.total > 0 ? String(Math.round((r.completed / r.total) * 100)) : '0',
    String(r.incidents),
  ])
  const csv = [headers, ...data]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio_conformidade_${period}d_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface ResidentReportRow {
  id: string
  name: string
  room_number: string
  total: number
  completed: number
  late: number
  incidents: number
  lastExecution: string | null
}

export function ReportsClient({ executions, residents, incidents }: Props) {
  const [period, setPeriod] = useState('7')

  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - Number(period))
    return d
  }, [period])

  const filteredExec = useMemo(
    () => executions.filter(e => e.started_at && new Date(e.started_at) >= cutoff),
    [executions, cutoff]
  )

  const filteredIncidents = useMemo(
    () => incidents.filter(i => i.occurred_at && new Date(i.occurred_at) >= cutoff),
    [incidents, cutoff]
  )

  const conformidade = useMemo(() => {
    const completed = filteredExec.filter(e => e.status === 'completed').length
    return filteredExec.length > 0 ? Math.round((completed / filteredExec.length) * 100) : 0
  }, [filteredExec])

  const uniqueCollaborators = useMemo(
    () => new Set(filteredExec.map(e => e.user?.id).filter(Boolean)).size,
    [filteredExec]
  )

  const residentRows = useMemo<ResidentReportRow[]>(() => {
    return residents.map(r => {
      const rExecs = filteredExec.filter(e => e.resident_id === r.id)
      const rIncidents = filteredIncidents.filter(i => i.resident_id === r.id)
      const sorted = [...rExecs].sort((a, b) =>
        (b.started_at ?? '').localeCompare(a.started_at ?? '')
      )
      return {
        id: r.id,
        name: r.name,
        room_number: r.room_number,
        total: rExecs.length,
        completed: rExecs.filter(e => e.status === 'completed').length,
        late: rExecs.filter(e => e.status === 'late').length,
        incidents: rIncidents.length,
        lastExecution: sorted[0]?.started_at ?? null,
      }
    }).sort((a, b) => {
      const pA = a.total > 0 ? a.completed / a.total : 0
      const pB = b.total > 0 ? b.completed / b.total : 0
      return pA - pB
    })
  }, [residents, filteredExec, filteredIncidents])

  const kpis = [
    { label: 'Execuções no período', value: String(filteredExec.length), icon: '◈', color: '#B8864E' },
    { label: 'Conformidade geral', value: `${conformidade}%`, icon: '✓', color: conformidade >= 80 ? '#22C55E' : conformidade >= 60 ? '#F59E0B' : '#EF4444' },
    { label: 'Incidências', value: String(filteredIncidents.length), icon: '⚠', color: '#EF4444' },
    { label: 'Colaboradores ativos', value: String(uniqueCollaborators), icon: '◷', color: '#5C5248' },
  ]

  return (
    <div>
      <SectionHeader
        eyebrow="Análise"
        title="Relatórios de Conformidade"
        sub="Indicadores operacionais por período"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                style={{
                  padding: '7px 13px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${period === p.id ? '#B8864E' : '#EDE0C8'}`,
                  background: period === p.id ? '#B8864E' : 'white',
                  color: period === p.id ? 'white' : '#5C5248',
                  fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-lato)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {kpis.map(k => (
          <Card key={k.label} style={{ padding: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Conformidade por residente */}
      <Card>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F7F0E3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-playfair)', fontSize: 16, fontWeight: 700, color: '#1C1C1C' }}>Conformidade por Residente</div>
            <div style={{ fontSize: 11, color: '#9C8E80', marginTop: 2 }}>Ordenado por menor conformidade primeiro</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" size="sm" onClick={() => exportToCSV(residentRows, period)}>⬇ CSV</Btn>
            <Btn variant="secondary" size="sm" onClick={() => exportToPDF(residentRows, period, kpis)}>⬇ PDF</Btn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 80px 80px 120px', gap: 12, padding: '10px 20px', borderBottom: '2px solid #F7F0E3', background: '#FDFAF5' }}>
          {['Residente', 'Quarto', 'Execuções', 'Concluídas', 'Atrasadas', 'Incid.', 'Conformidade'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#9C8E80' }}>{h}</span>
          ))}
        </div>

        {residentRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9C8E80', fontSize: 13 }}>Nenhum dado no período selecionado</div>
        ) : residentRows.map((r, i) => {
          const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : null
          const barColor = pct === null ? '#EDE0C8' : pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444'
          return (
            <div
              key={r.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 80px 80px 120px', gap: 12, padding: '12px 20px', borderBottom: i < residentRows.length - 1 ? '1px solid #F7F0E3' : 'none', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1C' }}>{r.name}</div>
                {r.lastExecution && (
                  <div style={{ fontSize: 10, color: '#9C8E80', marginTop: 1 }}>
                    Última: {new Date(r.lastExecution).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#5C5248' }}>{r.room_number}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: '#1C1C1C' }}>{r.total}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22C55E', fontWeight: 700 }}>{r.completed}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.late > 0 ? '#EF4444' : '#9C8E80', fontWeight: r.late > 0 ? 700 : 400 }}>{r.late}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: r.incidents > 0 ? '#F59E0B' : '#9C8E80', fontWeight: r.incidents > 0 ? 700 : 400 }}>{r.incidents}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F7F0E3', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: barColor, width: `${pct ?? 0}%`, transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 32, textAlign: 'right' }}>
                  {pct !== null ? `${pct}%` : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
