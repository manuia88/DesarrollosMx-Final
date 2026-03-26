'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AdminRevenuePage() {
  const [stats, setStats] = useState({ gmv: 0, revenue_proyectado: 0, revenue_cobrado: 0, pendiente: 0, unidades_vendidas: 0, ticket_promedio: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: uVendidas } = await supabase.from('unidades').select('precio').eq('estado', 'vendido')
      const vendidas = uVendidas || []
      const gmv = vendidas.reduce((s, u) => s + (u.precio || 0), 0)
      const ticket = vendidas.length > 0 ? Math.round(gmv / vendidas.length) : 0

      const { data: comisiones } = await supabase.from('comisiones').select('monto_estimado, estado')
      const cobrado = (comisiones || []).filter(c => c.estado === 'pagada').reduce((s, c) => s + (c.monto_estimado || 0), 0)
      const pendiente = (comisiones || []).filter(c => c.estado === 'confirmada').reduce((s, c) => s + (c.monto_estimado || 0), 0)

      const { data: projects } = await supabase.from('projects').select('comision_pct')
      const avgComision = projects && projects.length > 0 ? projects.reduce((s, p) => s + (p.comision_pct || 0), 0) / projects.length : 3
      const revProyectado = Math.round(gmv * avgComision / 100)

      setStats({ gmv, revenue_proyectado: revProyectado, revenue_cobrado: cobrado, pendiente, unidades_vendidas: vendidas.length, ticket_promedio: ticket })
      setLoading(false)
    }
    load()
  }, [])

  const cardStyle = { background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px' }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando revenue...</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>💎 Revenue</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Métricas financieras del marketplace</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { l: 'GMV (ventas totales)', v: `$${(stats.gmv / 1e6).toFixed(1)}M`, c: 'var(--dk)', icon: '💎' },
          { l: 'Revenue proyectado', v: `$${(stats.revenue_proyectado / 1e6).toFixed(1)}M`, c: 'var(--gr)', icon: '💰' },
          { l: 'Revenue cobrado', v: `$${(stats.revenue_cobrado / 1e6).toFixed(1)}M`, c: '#15803D', icon: '✅' },
        ].map((kpi, i) => (
          <div key={i} style={cardStyle}>
            <span style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>{kpi.icon}</span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: kpi.c, marginBottom: '2px' }}>{kpi.v}</div>
            <div style={{ fontSize: '12px', color: 'var(--mid)' }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { l: 'Pendiente de cobro', v: `$${(stats.pendiente / 1e6).toFixed(1)}M`, c: '#A16207', icon: '⏳' },
          { l: 'Unidades vendidas', v: stats.unidades_vendidas.toString(), c: 'var(--dk)', icon: '🏠' },
          { l: 'Ticket promedio', v: `$${(stats.ticket_promedio / 1e6).toFixed(1)}M`, c: 'var(--dk)', icon: '🎟️' },
        ].map((kpi, i) => (
          <div key={i} style={cardStyle}>
            <span style={{ fontSize: '18px', display: 'block', marginBottom: '8px' }}>{kpi.icon}</span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: kpi.c, marginBottom: '2px' }}>{kpi.v}</div>
            <div style={{ fontSize: '12px', color: 'var(--mid)' }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      {/* Revenue proyectado vs cobrado */}
      <div style={cardStyle}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>Revenue: proyectado vs cobrado</div>
        <div style={{ height: '24px', background: 'var(--bg2)', borderRadius: 'var(--rp)', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
          <div style={{ height: '100%', background: '#15803D', borderRadius: 'var(--rp)', width: stats.revenue_proyectado > 0 ? `${Math.min(100, stats.revenue_cobrado / stats.revenue_proyectado * 100)}%` : '0%', transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--mid)' }}>
          <span>Cobrado: ${(stats.revenue_cobrado / 1e6).toFixed(1)}M ({stats.revenue_proyectado > 0 ? Math.round(stats.revenue_cobrado / stats.revenue_proyectado * 100) : 0}%)</span>
          <span>Meta: ${(stats.revenue_proyectado / 1e6).toFixed(1)}M</span>
        </div>
      </div>
    </div>
  )
}
