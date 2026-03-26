'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PanoramaPage() {
  const [stats, setStats] = useState({ proyectos: 0, alcaldias: 0, unidades_total: 0, disponibles: 0, vendidas: 0, reservadas: 0, precio_m2_promedio: 0, absorcion_global: 0, nuevos_semana: 0 })
  const [zonas, setZonas] = useState<{alcaldia:string,proyectos:number,disponibles:number,vendidas:number,precio_promedio:number,absorcion:number}[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: projects }, { data: unidades }, { data: snapshots }] = await Promise.all([
        supabase.from('projects').select('id, alcaldia, precio_desde, m2_min, created_at').eq('publicado', true),
        supabase.from('unidades').select('project_id, estado, precio, m2_privados'),
        supabase.from('zona_snapshots').select('*').order('semana', { ascending: false }).limit(50),
      ])

      const projs = projects || []
      const uds = unidades || []
      const alcaldias = [...new Set(projs.map(p => p.alcaldia).filter(Boolean))]
      const disponibles = uds.filter(u => u.estado === 'disponible').length
      const vendidas = uds.filter(u => u.estado === 'vendido').length
      const reservadas = uds.filter(u => u.estado === 'reservado').length
      const total = uds.length || 1
      const preciosM2 = projs.filter(p => p.m2_min > 0).map(p => p.precio_desde / p.m2_min)
      const precioM2Prom = preciosM2.length > 0 ? Math.round(preciosM2.reduce((a, b) => a + b, 0) / preciosM2.length) : 0
      const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const nuevos = projs.filter(p => p.created_at >= semanaAtras).length

      setStats({
        proyectos: projs.length, alcaldias: alcaldias.length,
        unidades_total: uds.length, disponibles, vendidas, reservadas,
        precio_m2_promedio: precioM2Prom,
        absorcion_global: Math.round((vendidas + reservadas) / total * 100),
        nuevos_semana: nuevos,
      })

      // Stats por zona
      const zonaMap: Record<string, {proyectos:number,disponibles:number,vendidas:number,precios:number[]}> = {}
      projs.forEach(p => {
        if (!p.alcaldia) return
        if (!zonaMap[p.alcaldia]) zonaMap[p.alcaldia] = { proyectos: 0, disponibles: 0, vendidas: 0, precios: [] }
        zonaMap[p.alcaldia].proyectos++
        zonaMap[p.alcaldia].precios.push(p.precio_desde)
      })
      uds.forEach(u => {
        const proj = projs.find(p => p.id === u.project_id)
        if (!proj?.alcaldia || !zonaMap[proj.alcaldia]) return
        if (u.estado === 'disponible') zonaMap[proj.alcaldia].disponibles++
        if (u.estado === 'vendido') zonaMap[proj.alcaldia].vendidas++
      })

      setZonas(Object.entries(zonaMap).map(([alcaldia, z]) => ({
        alcaldia, proyectos: z.proyectos, disponibles: z.disponibles, vendidas: z.vendidas,
        precio_promedio: z.precios.length > 0 ? Math.round(z.precios.reduce((a, b) => a + b, 0) / z.precios.length) : 0,
        absorcion: (z.disponibles + z.vendidas) > 0 ? Math.round(z.vendidas / (z.disponibles + z.vendidas) * 100) : 0,
      })).sort((a, b) => b.absorcion - a.absorcion))

      setLoading(false)
    }
    load()
  }, [])

  const cardStyle = { background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '18px' }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando panorama...</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>🗺️ Panorama del mercado CDMX</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Resumen ejecutivo de vivienda nueva</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { l: 'Proyectos', v: stats.proyectos, icon: '🏗️' },
          { l: 'Alcaldías', v: stats.alcaldias, icon: '📍' },
          { l: 'Unidades', v: stats.unidades_total, icon: '🏠' },
          { l: 'Precio/m² prom.', v: `$${stats.precio_m2_promedio.toLocaleString('es-MX')}`, icon: '💰' },
          { l: 'Absorción global', v: `${stats.absorcion_global}%`, icon: '📈' },
        ].map((kpi, i) => (
          <div key={i} style={cardStyle}>
            <span style={{ fontSize: '14px', display: 'block', marginBottom: '6px' }}>{kpi.icon}</span>
            <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '2px' }}>{kpi.v}</div>
            <div style={{ fontSize: '11px', color: 'var(--mid)' }}>{kpi.l}</div>
          </div>
        ))}
      </div>

      {/* Inventario global */}
      <div style={{ ...cardStyle, marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>Inventario global</div>
        <div style={{ height: '28px', background: 'var(--bg2)', borderRadius: 'var(--rp)', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
          <div style={{ height: '100%', background: '#15803D', width: `${stats.unidades_total > 0 ? stats.vendidas / stats.unidades_total * 100 : 0}%` }} />
          <div style={{ height: '100%', background: '#F59E0B', width: `${stats.unidades_total > 0 ? stats.reservadas / stats.unidades_total * 100 : 0}%` }} />
          <div style={{ height: '100%', background: '#3B82F6', width: `${stats.unidades_total > 0 ? stats.disponibles / stats.unidades_total * 100 : 0}%` }} />
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
          <span style={{ color: '#15803D' }}>● Vendidas: {stats.vendidas} ({stats.unidades_total > 0 ? Math.round(stats.vendidas / stats.unidades_total * 100) : 0}%)</span>
          <span style={{ color: '#F59E0B' }}>● Reservadas: {stats.reservadas} ({stats.unidades_total > 0 ? Math.round(stats.reservadas / stats.unidades_total * 100) : 0}%)</span>
          <span style={{ color: '#3B82F6' }}>● Disponibles: {stats.disponibles} ({stats.unidades_total > 0 ? Math.round(stats.disponibles / stats.unidades_total * 100) : 0}%)</span>
        </div>
      </div>

      {/* Tabla por zona */}
      <div style={{ ...cardStyle }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>Resumen por alcaldía</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['Alcaldía', 'Proyectos', 'Disponibles', 'Vendidas', 'Precio prom.', 'Absorción'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--mid)', borderBottom: '1px solid var(--bd)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zonas.map(z => (
              <tr key={z.alcaldia} style={{ borderBottom: '1px solid var(--bd2)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--dk)' }}>{z.alcaldia}</td>
                <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{z.proyectos}</td>
                <td style={{ padding: '10px 12px', color: '#15803D' }}>{z.disponibles}</td>
                <td style={{ padding: '10px 12px', color: 'var(--dk)' }}>{z.vendidas}</td>
                <td style={{ padding: '10px 12px', color: 'var(--gr)' }}>${(z.precio_promedio / 1e6).toFixed(1)}M</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--rp)', background: z.absorcion >= 50 ? '#DCFCE7' : z.absorcion >= 25 ? '#FEF9C3' : '#FEE2E2', color: z.absorcion >= 50 ? '#15803D' : z.absorcion >= 25 ? '#A16207' : '#DC2626' }}>{z.absorcion}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {zonas.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--mid)' }}>Sin datos por zona</div>}
      </div>
    </div>
  )
}
