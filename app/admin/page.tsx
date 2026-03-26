'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DailyStats {
  fecha: string
  proyectos_activos: number
  unidades_totales: number
  unidades_disponibles: number
  unidades_vendidas: number
  unidades_reservadas: number
  gmv: number
  revenue_proyectado: number
  leads_generados: number
  leads_cerrados: number
  busquedas: number
  vistas_proyectos: number
  tasa_conversion: number
  ticket_promedio: number
}

interface Alert {
  type: string
  severity: string
  message: string
  entity_id?: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [prevStats, setPrevStats] = useState<DailyStats | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [userCounts, setUserCounts] = useState({ asesores: 0, desarrolladores: 0, compradores: 0, total: 0 })
  const [recentLeads, setRecentLeads] = useState<{id:string,nombre_lead:string,project_id:string,estado:string,created_at:string}[]>([])
  const [topProjects, setTopProjects] = useState<{id:string,nombre:string,alcaldia:string,vistas_count:number}[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Generar stats de hoy
      await supabase.rpc('generate_daily_stats')

      // Stats de hoy
      const { data: today } = await supabase.from('marketplace_daily_stats')
        .select('*').order('fecha', { ascending: false }).limit(1).single()
      setStats(today as DailyStats)

      // Stats de ayer para comparativa
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const { data: prev } = await supabase.from('marketplace_daily_stats')
        .select('*').eq('fecha', yesterday.toISOString().slice(0, 10)).single()
      if (prev) setPrevStats(prev as DailyStats)

      // Conteo de usuarios por rol
      const { data: profiles } = await supabase.from('profiles').select('role')
      if (profiles) {
        setUserCounts({
          asesores: profiles.filter(p => p.role === 'asesor').length,
          desarrolladores: profiles.filter(p => p.role === 'desarrollador').length,
          compradores: profiles.filter(p => p.role === 'comprador' || !p.role).length,
          total: profiles.length,
        })
      }

      // Leads recientes
      const { data: leads } = await supabase.from('leads')
        .select('id, nombre_lead, project_id, estado, created_at')
        .order('created_at', { ascending: false }).limit(5)
      setRecentLeads((leads || []) as typeof recentLeads)

      // Top proyectos por vistas
      const { data: top } = await supabase.from('projects')
        .select('id, nombre, alcaldia, vistas_count')
        .eq('publicado', true).order('vistas_count', { ascending: false }).limit(5)
      setTopProjects((top || []) as typeof topProjects)

      // Alertas
      const alertList: Alert[] = []

      // Proyectos pendientes de revisión
      const { count: pendingProjects } = await supabase.from('projects')
        .select('id', { count: 'exact' }).eq('estado_publicacion', 'en_revision')
      if (pendingProjects && pendingProjects > 0) {
        alertList.push({ type: 'pending_project', severity: 'alta', message: `${pendingProjects} proyecto(s) pendientes de revisión` })
      }

      // Desarrolladoras sin verificar
      const { count: unverifiedDevs } = await supabase.from('desarrolladoras')
        .select('id', { count: 'exact' }).eq('verificacion_constitucion', false)
      if (unverifiedDevs && unverifiedDevs > 0) {
        alertList.push({ type: 'unverified_dev', severity: 'media', message: `${unverifiedDevs} desarrolladora(s) sin verificar` })
      }

      // Proyectos fantasma (sin actividad 30+ días)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { count: ghostProjects } = await supabase.from('projects')
        .select('id', { count: 'exact' }).eq('publicado', true).lt('updated_at', thirtyDaysAgo)
      if (ghostProjects && ghostProjects > 0) {
        alertList.push({ type: 'ghost_project', severity: 'media', message: `${ghostProjects} proyecto(s) sin actualizar en 30+ días` })
      }

      // Cambios de precio recientes
      const { count: priceChanges } = await supabase.from('price_change_log')
        .select('id', { count: 'exact' }).gte('detectado_en', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      if (priceChanges && priceChanges > 0) {
        alertList.push({ type: 'price_change', severity: 'baja', message: `${priceChanges} cambio(s) de precio esta semana` })
      }

      setAlerts(alertList)
      setLoading(false)
    }
    load()
  }, [])

  function delta(current: number, previous: number | undefined): { pct: number; dir: string } {
    if (!previous || previous === 0) return { pct: 0, dir: 'neutral' }
    const pct = Math.round((current - previous) / previous * 100)
    return { pct, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral' }
  }

  const cardStyle = { background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '18px' }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando dashboard...</div>

  const s = stats || { proyectos_activos: 0, unidades_totales: 0, unidades_disponibles: 0, unidades_vendidas: 0, unidades_reservadas: 0, gmv: 0, revenue_proyectado: 0, leads_generados: 0, leads_cerrados: 0, busquedas: 0, vistas_proyectos: 0, tasa_conversion: 0, ticket_promedio: 0, fecha: '' }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>📊 Dashboard</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>
          {s.fecha ? `Datos al ${new Date(s.fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'Sin datos aún'}
        </div>
      </div>

      {/* ALERTAS */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'grid', gap: '8px' }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: 'var(--rs)',
              background: a.severity === 'alta' ? '#FEE2E2' : a.severity === 'media' ? '#FEF9C3' : 'var(--bg2)',
              border: `1px solid ${a.severity === 'alta' ? '#FECACA' : a.severity === 'media' ? '#FDE68A' : 'var(--bd)'}`,
            }}>
              <span style={{ fontSize: '14px' }}>{a.severity === 'alta' ? '🚨' : a.severity === 'media' ? '⚠️' : 'ℹ️'}</span>
              <span style={{ fontSize: '12px', color: a.severity === 'alta' ? '#DC2626' : a.severity === 'media' ? '#A16207' : 'var(--mid)', flex: 1 }}>{a.message}</span>
              {a.type === 'pending_project' && <a href="/admin/proyectos" style={{ fontSize: '11px', color: 'var(--gr2)', textDecoration: 'none' }}>Revisar →</a>}
              {a.type === 'unverified_dev' && <a href="/admin/desarrolladoras" style={{ fontSize: '11px', color: 'var(--gr2)', textDecoration: 'none' }}>Verificar →</a>}
            </div>
          ))}
        </div>
      )}

      {/* KPIs ROW 1 — Marketplace */}
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '8px' }}>Marketplace</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { l: 'Proyectos activos', v: s.proyectos_activos, prev: prevStats?.proyectos_activos, icon: '🏗️' },
          { l: 'Unidades totales', v: s.unidades_totales, prev: prevStats?.unidades_totales, icon: '🏠' },
          { l: 'Disponibles', v: s.unidades_disponibles, prev: prevStats?.unidades_disponibles, icon: '✅' },
          { l: 'Vendidas + Reservadas', v: s.unidades_vendidas + s.unidades_reservadas, prev: prevStats ? prevStats.unidades_vendidas + prevStats.unidades_reservadas : undefined, icon: '📈' },
        ].map((kpi, i) => {
          const d = delta(kpi.v, kpi.prev)
          return (
            <div key={i} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px' }}>{kpi.icon}</span>
                {d.pct !== 0 && <span style={{ fontSize: '10px', fontWeight: 600, color: d.dir === 'up' ? '#15803D' : '#DC2626' }}>{d.dir === 'up' ? '↑' : '↓'}{Math.abs(d.pct)}%</span>}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--dk)', marginBottom: '2px' }}>{kpi.v.toLocaleString('es-MX')}</div>
              <div style={{ fontSize: '11px', color: 'var(--mid)' }}>{kpi.l}</div>
            </div>
          )
        })}
      </div>

      {/* KPIs ROW 2 — Revenue */}
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '8px' }}>Revenue</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { l: 'GMV (ventas totales)', v: `$${(s.gmv / 1e6).toFixed(1)}M`, raw: s.gmv, icon: '💎' },
          { l: 'Revenue proyectado', v: `$${(s.revenue_proyectado / 1e6).toFixed(1)}M`, raw: s.revenue_proyectado, icon: '💰' },
          { l: 'Ticket promedio', v: s.ticket_promedio > 0 ? `$${(s.ticket_promedio / 1e6).toFixed(1)}M` : '—', raw: s.ticket_promedio, icon: '🎟️' },
          { l: 'Tasa de conversión', v: `${s.tasa_conversion}%`, raw: s.tasa_conversion, icon: '🎯' },
        ].map((kpi, i) => (
          <div key={i} style={cardStyle}>
            <span style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>{kpi.icon}</span>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--gr)', marginBottom: '2px' }}>{kpi.v}</div>
            <div style={{ fontSize: '11px', color: 'var(--mid)' }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      {/* KPIs ROW 3 — Actividad */}
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '8px' }}>Actividad hoy</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { l: 'Búsquedas', v: s.busquedas, icon: '🔍' },
          { l: 'Vistas de proyectos', v: s.vistas_proyectos, icon: '👁️' },
          { l: 'Leads generados', v: s.leads_generados, icon: '🎯' },
          { l: 'Leads cerrados', v: s.leads_cerrados, icon: '✅' },
        ].map((kpi, i) => (
          <div key={i} style={cardStyle}>
            <span style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>{kpi.icon}</span>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--dk)', marginBottom: '2px' }}>{kpi.v}</div>
            <div style={{ fontSize: '11px', color: 'var(--mid)' }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      {/* KPIs ROW 4 — Usuarios */}
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '8px' }}>Usuarios</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { l: 'Total registrados', v: userCounts.total, icon: '👥' },
          { l: 'Asesores', v: userCounts.asesores, icon: '🧑‍💼' },
          { l: 'Desarrolladores', v: userCounts.desarrolladores, icon: '🏢' },
          { l: 'Compradores', v: userCounts.compradores, icon: '🏠' },
        ].map((kpi, i) => (
          <div key={i} style={cardStyle}>
            <span style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>{kpi.icon}</span>
            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--dk)', marginBottom: '2px' }}>{kpi.v}</div>
            <div style={{ fontSize: '11px', color: 'var(--mid)' }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      {/* BOTTOM ROW — Leads recientes + Top proyectos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Leads recientes */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)' }}>🎯 Leads recientes</div>
            <a href="/admin/leads" style={{ fontSize: '11px', color: 'var(--gr2)', textDecoration: 'none' }}>Ver todos →</a>
          </div>
          {recentLeads.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--mid)', textAlign: 'center', padding: '20px' }}>Sin leads aún</div>
          ) : recentLeads.map(lead => (
            <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--bd2)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dk)' }}>{lead.nombre_lead || 'Sin nombre'}</div>
                <div style={{ fontSize: '10px', color: 'var(--mid)' }}>{new Date(lead.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--rp)',
                background: lead.estado === 'Cerrado' ? '#DCFCE7' : lead.estado === 'Nuevo' ? '#EBF0FA' : '#FEF9C3',
                color: lead.estado === 'Cerrado' ? '#15803D' : lead.estado === 'Nuevo' ? '#1A4A9A' : '#A16207',
              }}>{lead.estado}</span>
            </div>
          ))}
        </div>

        {/* Top proyectos */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)' }}>🏗️ Top proyectos por vistas</div>
            <a href="/admin/proyectos" style={{ fontSize: '11px', color: 'var(--gr2)', textDecoration: 'none' }}>Ver todos →</a>
          </div>
          {topProjects.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--mid)', textAlign: 'center', padding: '20px' }}>Sin datos aún</div>
          ) : topProjects.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--bd2)' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--dk)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dk)' }}>{p.nombre}</div>
                <div style={{ fontSize: '10px', color: 'var(--mid)' }}>{p.alcaldia}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dk)' }}>{p.vistas_count || 0} vistas</div>
            </div>
          ))}
        </div>
      </div>

      {/* SALUD DEL MARKETPLACE */}
      <div style={{ ...cardStyle, marginTop: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>🏥 Salud del marketplace</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          {(() => {
            const absorcion = s.unidades_totales > 0 ? Math.round((s.unidades_vendidas + s.unidades_reservadas) / s.unidades_totales * 100) : 0
            const healthScore = Math.min(10, Math.round(
              (s.proyectos_activos > 0 ? 2 : 0) +
              (absorcion > 10 ? 3 : absorcion > 5 ? 2 : 0) +
              (s.leads_generados > 0 ? 2 : 0) +
              (alerts.filter(a => a.severity === 'alta').length === 0 ? 2 : 0) +
              (s.busquedas > 0 ? 1 : 0)
            ))
            return [
              { l: 'Score de salud', v: `${healthScore}/10`, c: healthScore >= 7 ? '#15803D' : healthScore >= 4 ? '#A16207' : '#DC2626', bg: healthScore >= 7 ? '#DCFCE7' : healthScore >= 4 ? '#FEF9C3' : '#FEE2E2' },
              { l: 'Absorción global', v: `${absorcion}%`, c: absorcion >= 15 ? '#15803D' : absorcion >= 8 ? '#A16207' : '#DC2626', bg: absorcion >= 15 ? '#DCFCE7' : absorcion >= 8 ? '#FEF9C3' : '#FEE2E2' },
              { l: 'Alertas activas', v: `${alerts.length}`, c: alerts.length === 0 ? '#15803D' : alerts.length <= 2 ? '#A16207' : '#DC2626', bg: alerts.length === 0 ? '#DCFCE7' : alerts.length <= 2 ? '#FEF9C3' : '#FEE2E2' },
            ].map((item, i) => (
              <div key={i} style={{ background: item.bg, borderRadius: 'var(--rs)', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: item.c }}>{item.v}</div>
                <div style={{ fontSize: '11px', color: item.c, fontWeight: 500, marginTop: '2px' }}>{item.l}</div>
              </div>
            ))
          })()}
        </div>
      </div>
    </div>
  )
}
