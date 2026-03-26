'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Lead {
  id: string
  nombre_lead: string
  email_lead: string
  whatsapp_lead: string
  estado: string
  fuente: string
  canal: string
  created_at: string
  projects?: { nombre: string; alcaldia: string }
  profiles?: { name: string }
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('all')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('leads')
      .select('*, projects(nombre, alcaldia), profiles:asesor_id(name)')
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setLeads((data as Lead[]) || []); setLoading(false) })
  }, [])

  const filtered = leads.filter(l => filtro === 'all' || l.estado === filtro)
  const counts = { all: leads.length, Nuevo: leads.filter(l => l.estado === 'Nuevo').length, Contactado: leads.filter(l => l.estado === 'Contactado').length, 'En proceso': leads.filter(l => l.estado === 'En proceso').length, Cerrado: leads.filter(l => l.estado === 'Cerrado').length }

  const estStyle = (e: string) => {
    if (e === 'Cerrado') return { bg: '#DCFCE7', color: '#15803D' }
    if (e === 'En proceso') return { bg: '#FEF9C3', color: '#A16207' }
    if (e === 'Contactado') return { bg: '#EBF0FA', color: '#1A4A9A' }
    if (e === 'Nuevo') return { bg: 'var(--bg2)', color: 'var(--dk)' }
    return { bg: 'var(--bg2)', color: 'var(--mid)' }
  }

  // Embudo
  const funnelData = [
    { label: 'Nuevos', count: counts.Nuevo, pct: 100, color: 'var(--dk)' },
    { label: 'Contactados', count: counts.Contactado, pct: counts.all > 0 ? Math.round((counts.all - counts.Nuevo) / counts.all * 100) : 0, color: '#1A4A9A' },
    { label: 'En proceso', count: counts['En proceso'], pct: counts.all > 0 ? Math.round((counts['En proceso'] + counts.Cerrado) / counts.all * 100) : 0, color: '#A16207' },
    { label: 'Cerrados', count: counts.Cerrado, pct: counts.all > 0 ? Math.round(counts.Cerrado / counts.all * 100) : 0, color: '#15803D' },
  ]

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando leads...</div>

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>🎯 Leads globales</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>{leads.length} leads en el sistema</div>
      </div>

      {/* EMBUDO */}
      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>Embudo de conversión</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'end', height: '80px' }}>
          {funnelData.map((f, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: f.color }}>{f.count}</div>
              <div style={{ background: f.color, borderRadius: '4px 4px 0 0', height: `${Math.max(10, f.pct * 0.6)}px`, marginTop: '4px', opacity: 0.8 }} />
              <div style={{ fontSize: '10px', color: 'var(--mid)', marginTop: '4px' }}>{f.label}</div>
              <div style={{ fontSize: '9px', color: 'var(--dim)' }}>{f.pct}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
        {Object.entries(counts).map(([v, c]) => (
          <button key={v} onClick={() => setFiltro(v)} style={{ fontFamily: 'var(--sans)', fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--rp)', border: filtro === v ? 'none' : '1px solid var(--bd)', background: filtro === v ? 'var(--dk)' : 'var(--wh)', color: filtro === v ? '#fff' : 'var(--mid)', cursor: 'pointer' }}>{v === 'all' ? 'Todos' : v} ({c})</button>
        ))}
      </div>

      {/* TABLA */}
      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['Lead', 'Proyecto', 'Asesor', 'Estado', 'Fuente', 'Fecha'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--mid)', borderBottom: '1px solid var(--bd)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const es = estStyle(l.estado)
              return (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--bd2)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--dk)' }}>{l.nombre_lead || 'Sin nombre'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--dim)' }}>{l.email_lead || l.whatsapp_lead || '—'}</div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{l.projects?.nombre || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{l.profiles?.name || '—'}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 7px', borderRadius: 'var(--rp)', background: es.bg, color: es.color }}>{l.estado}</span></td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{l.fuente || l.canal || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--dim)', fontSize: '11px' }}>{new Date(l.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Sin leads con estos filtros</div>}
      </div>
    </div>
  )
}
