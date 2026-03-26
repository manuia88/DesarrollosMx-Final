'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DevRanking {
  id: string
  nombre: string
  score_total: number
  score_absorcion: number
  score_verificacion: number
  proyectos_count: number
  unidades_vendidas: number
  revenue_generado: number
  churn_risk: string
  last_activity: string
}

interface AsesorRanking {
  id: string
  name: string
  email: string
  leads_total: number
  leads_cerrados: number
  conversion_pct: number
  revenue_estimado: number
  clientes_activos: number
  last_search: string | null
}

interface ProjectRanking {
  id: string
  nombre: string
  alcaldia: string
  colonia: string
  precio_desde: number
  total: number
  disponibles: number
  vendidas: number
  reservadas: number
  absorcion_pct: number
  ventas_por_mes: number
  meses_sold_out: number
  tendencia: string
  vistas_count: number
  leads_count: number
}

export default function ParticipantesPage() {
  const [tab, setTab] = useState<'devs'|'asesores'|'proyectos'>('devs')
  const [devs, setDevs] = useState<DevRanking[]>([])
  const [asesores, setAsesores] = useState<AsesorRanking[]>([])
  const [proyectos, setProyectos] = useState<ProjectRanking[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)

    // Desarrolladores con scores
    const { data: devScores } = await supabase.from('developer_scores').select('*')
    const { data: devsData } = await supabase.from('desarrolladoras').select('id, nombre')
    const devMap: Record<string, string> = {}
    ;(devsData || []).forEach((d: {id:string,nombre:string}) => { devMap[d.id] = d.nombre })
    setDevs(((devScores || []) as any[]).map(s => ({
      id: s.desarrolladora_id,
      nombre: devMap[s.desarrolladora_id] || 'Sin nombre',
      score_total: s.score_total || 0,
      score_absorcion: s.score_absorcion || 0,
      score_verificacion: s.score_verificacion || 0,
      proyectos_count: s.proyectos_count || 0,
      unidades_vendidas: s.unidades_vendidas || 0,
      revenue_generado: s.revenue_generado || 0,
      churn_risk: s.churn_risk || 'bajo',
      last_activity: s.last_activity || '',
    })).sort((a, b) => b.score_total - a.score_total))

    // Asesores con métricas
    const { data: asesorProfiles } = await supabase.from('profiles').select('id, name, email, user_id').eq('role', 'asesor')
    const asesorList: AsesorRanking[] = []
    for (const a of (asesorProfiles || []) as {id:string,name:string,email:string,user_id:string}[]) {
      const [{ data: leads }, { data: clientes }, { data: outcomes }] = await Promise.all([
        supabase.from('leads').select('id, estado').eq('asesor_id', a.id),
        supabase.from('client_folders').select('id').eq('asesor_id', a.id),
        supabase.from('asesor_outcomes').select('resultado, comision_estimada').eq('asesor_id', a.id),
      ])
      const totalLeads = (leads || []).length
      const cerrados = (leads || []).filter((l: {estado:string}) => l.estado === 'Cerrado').length
      const revEstimado = (outcomes || []).filter((o: {resultado:string}) => o.resultado === 'cerrado').reduce((s: number, o: {comision_estimada:number}) => s + (o.comision_estimada || 0), 0)
      asesorList.push({
        id: a.id, name: a.name || 'Sin nombre', email: a.email || '',
        leads_total: totalLeads, leads_cerrados: cerrados,
        conversion_pct: totalLeads > 0 ? Math.round(cerrados / totalLeads * 100) : 0,
        revenue_estimado: revEstimado,
        clientes_activos: (clientes || []).length,
        last_search: null,
      })
    }
    setAsesores(asesorList.sort((a, b) => b.leads_cerrados - a.leads_cerrados))

    // Proyectos con velocity
    const { data: projs } = await supabase.from('projects').select('id, nombre, alcaldia, colonia, precio_desde, vistas_count').eq('publicado', true)
    const { data: allUnidades } = await supabase.from('unidades').select('project_id, estado')
    const { data: allLeads } = await supabase.from('leads').select('project_id')
    const projList: ProjectRanking[] = []
    for (const p of (projs || []) as any[]) {
      const uds = (allUnidades || []).filter((u: {project_id:string}) => u.project_id === p.id)
      const disponibles = uds.filter((u: {estado:string}) => u.estado === 'disponible').length
      const vendidas = uds.filter((u: {estado:string}) => u.estado === 'vendido').length
      const reservadas = uds.filter((u: {estado:string}) => u.estado === 'reservado').length
      const total = uds.length || 1
      const leads_count = (allLeads || []).filter((l: {project_id:string}) => l.project_id === p.id).length
      let vel = { ventas_por_mes: 0, meses_para_sold_out: 99, tendencia: 'estable' }
      try {
        const { data: v } = await supabase.rpc('get_project_velocity', { p_project_id: p.id })
        if (v && v[0]) vel = v[0]
      } catch {}
      projList.push({
        id: p.id, nombre: p.nombre, alcaldia: p.alcaldia, colonia: p.colonia,
        precio_desde: p.precio_desde, total, disponibles, vendidas, reservadas,
        absorcion_pct: Math.round((vendidas + reservadas) / total * 100),
        ventas_por_mes: vel.ventas_por_mes || 0,
        meses_sold_out: Math.min(vel.meses_para_sold_out || 99, 99),
        tendencia: vel.tendencia || 'estable',
        vistas_count: p.vistas_count || 0, leads_count,
      })
    }
    setProyectos(projList.sort((a, b) => b.ventas_por_mes - a.ventas_por_mes))
    setLoading(false)
  }

  const tabStyle = (id: string) => ({
    fontSize: '13px', padding: '10px 0', marginRight: '22px',
    color: tab === id ? 'var(--dk)' : 'var(--mid)',
    borderBottom: tab === id ? '2px solid var(--dk)' : '2px solid transparent',
    cursor: 'pointer', fontWeight: tab === id ? 500 : 400,
    background: 'transparent', border: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
    fontFamily: 'var(--sans)',
  })

  const tendenciaStyle = (t: string) => t === 'acelerando' ? { bg: '#DCFCE7', color: '#15803D', label: '🔥 Acelerando' } : t === 'desacelerando' ? { bg: '#FEE2E2', color: '#DC2626', label: '⚠️ Desacelerando' } : { bg: 'var(--bg2)', color: 'var(--mid)', label: '→ Estable' }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando participantes...</div>

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>👥 Participantes</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Rankings y métricas de desarrolladores, asesores y proyectos</div>
      </div>

      <div style={{ borderBottom: '1px solid var(--bd)', marginBottom: '20px', display: 'flex' }}>
        <button onClick={() => setTab('devs')} style={tabStyle('devs')}>🏢 Desarrolladores ({devs.length})</button>
        <button onClick={() => setTab('asesores')} style={tabStyle('asesores')}>🧑‍💼 Asesores ({asesores.length})</button>
        <button onClick={() => setTab('proyectos')} style={tabStyle('proyectos')}>🏗️ Proyectos ({proyectos.length})</button>
      </div>

      {/* DESARROLLADORES */}
      {tab === 'devs' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {devs.map((d, i) => (
            <div key={d.id} style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: i < 3 ? 'var(--dk)' : 'var(--bg2)', color: i < 3 ? '#fff' : 'var(--mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '3px' }}>{d.nombre}</div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--mid)' }}>
                  <span>{d.proyectos_count} proyectos</span>
                  <span>{d.unidades_vendidas} vendidas</span>
                  <span>Rev: ${(d.revenue_generado / 1e6).toFixed(1)}M</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: d.score_total >= 7 ? '#15803D' : d.score_total >= 4 ? '#A16207' : '#DC2626' }}>{d.score_total.toFixed(1)}</div>
                  <div style={{ fontSize: '9px', color: 'var(--mid)' }}>Score</div>
                </div>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', background: d.churn_risk === 'alto' ? '#FEE2E2' : d.churn_risk === 'medio' ? '#FEF9C3' : '#DCFCE7', color: d.churn_risk === 'alto' ? '#DC2626' : d.churn_risk === 'medio' ? '#A16207' : '#15803D' }}>Churn: {d.churn_risk}</span>
              </div>
            </div>
          ))}
          {devs.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Sin datos de desarrolladores</div>}
        </div>
      )}

      {/* ASESORES */}
      {tab === 'asesores' && (
        <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {['#', 'Asesor', 'Leads', 'Cerrados', 'Conversión', 'Revenue est.', 'Clientes'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--mid)', borderBottom: '1px solid var(--bd)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {asesores.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--bd2)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: i < 3 ? 'var(--dk)' : 'var(--mid)' }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--dk)' }}>{a.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--dim)' }}>{a.email}</div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--dk)' }}>{a.leads_total}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#15803D' }}>{a.leads_cerrados}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--rp)', background: a.conversion_pct >= 20 ? '#DCFCE7' : a.conversion_pct >= 10 ? '#FEF9C3' : '#FEE2E2', color: a.conversion_pct >= 20 ? '#15803D' : a.conversion_pct >= 10 ? '#A16207' : '#DC2626' }}>{a.conversion_pct}%</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--gr)' }}>${(a.revenue_estimado / 1e6).toFixed(1)}M</td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{a.clientes_activos}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {asesores.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Sin asesores registrados</div>}
        </div>
      )}

      {/* PROYECTOS */}
      {tab === 'proyectos' && (
        <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {['Proyecto', 'Zona', 'Inventario', 'Absorción', 'Velocity', 'Sold out', 'Tendencia', 'Vistas', 'Leads'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--mid)', borderBottom: '1px solid var(--bd)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proyectos.map(p => {
                const ts = tendenciaStyle(p.tendencia)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--bd2)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--dk)' }}>{p.nombre}</div>
                      <div style={{ fontSize: '10px', color: 'var(--gr)' }}>${p.precio_desde?.toLocaleString('es-MX')}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{p.colonia}, {p.alcaldia}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: '#15803D' }}>{p.disponibles}d</span> · <span style={{ color: '#A16207' }}>{p.reservadas}r</span> · <span style={{ color: '#DC2626' }}>{p.vendidas}v</span> / {p.total}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: p.absorcion_pct >= 50 ? '#15803D' : p.absorcion_pct >= 25 ? '#A16207' : '#DC2626' }}>{p.absorcion_pct}%</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--dk)' }}>{p.ventas_por_mes}/mes</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: p.meses_sold_out <= 3 ? '#DC2626' : p.meses_sold_out <= 6 ? '#A16207' : 'var(--mid)' }}>{p.meses_sold_out < 99 ? `${p.meses_sold_out}m` : '—'}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}><span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 'var(--rp)', background: ts.bg, color: ts.color }}>{ts.label}</span></td>
                    <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{p.vistas_count}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{p.leads_count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {proyectos.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Sin proyectos publicados</div>}
        </div>
      )}
    </div>
  )
}
