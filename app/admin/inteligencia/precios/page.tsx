'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PreciosPage() {
  const [priceChanges, setPriceChanges] = useState<any[]>([])
  const [zonaPrecios, setZonaPrecios] = useState<{alcaldia:string,precio_m2:number,proyectos:number}[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: changes }, { data: projects }] = await Promise.all([
        supabase.from('price_change_log').select('*, projects(nombre, alcaldia)').order('detectado_en', { ascending: false }).limit(50),
        supabase.from('projects').select('alcaldia, precio_desde, m2_min').eq('publicado', true),
      ])
      setPriceChanges((changes || []) as any[])

      const zonaMap: Record<string, { precios_m2: number[], count: number }> = {}
      ;(projects || []).forEach((p: any) => {
        if (!p.alcaldia || !p.m2_min || p.m2_min <= 0) return
        if (!zonaMap[p.alcaldia]) zonaMap[p.alcaldia] = { precios_m2: [], count: 0 }
        zonaMap[p.alcaldia].precios_m2.push(p.precio_desde / p.m2_min)
        zonaMap[p.alcaldia].count++
      })
      setZonaPrecios(Object.entries(zonaMap).map(([alcaldia, z]) => ({
        alcaldia, proyectos: z.count,
        precio_m2: Math.round(z.precios_m2.reduce((a, b) => a + b, 0) / z.precios_m2.length),
      })).sort((a, b) => b.precio_m2 - a.precio_m2))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando precios...</div>

  const maxPrecio = zonaPrecios.length > 0 ? zonaPrecios[0].precio_m2 : 1

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>💰 Precios y tendencias</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Precio/m² por zona + historial de cambios de precio</div>
      </div>

      {/* Precio/m² por zona — bar chart visual */}
      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>Precio/m² promedio por alcaldía</div>
        {zonaPrecios.map(z => (
          <div key={z.alcaldia} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '130px', fontSize: '12px', color: 'var(--dk)', fontWeight: 500, flexShrink: 0 }}>{z.alcaldia}</div>
            <div style={{ flex: 1, background: 'var(--bg2)', borderRadius: 'var(--rp)', height: '24px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--gr)', borderRadius: 'var(--rp)', width: `${(z.precio_m2 / maxPrecio) * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
                <span style={{ fontSize: '10px', color: '#fff', fontWeight: 600 }}>${z.precio_m2.toLocaleString('es-MX')}/m²</span>
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--dim)', minWidth: '50px' }}>{z.proyectos} proy.</div>
          </div>
        ))}
        {zonaPrecios.length === 0 && <div style={{ textAlign: 'center', color: 'var(--mid)', padding: '20px' }}>Sin datos de precios</div>}
      </div>

      {/* Cambios de precio recientes */}
      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>Cambios de precio detectados</div>
        {priceChanges.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--mid)', padding: '20px' }}>Los cambios se detectan automáticamente cuando un desarrollador modifica el precio</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {['Proyecto', 'Anterior', 'Nuevo', 'Cambio', 'Dirección', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--mid)', borderBottom: '1px solid var(--bd)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {priceChanges.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--bd2)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--dk)' }}>{c.projects?.nombre || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>${(c.precio_anterior / 1e6).toFixed(2)}M</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--dk)' }}>${(c.precio_nuevo / 1e6).toFixed(2)}M</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: c.direccion === 'subida' ? '#DC2626' : '#15803D' }}>{c.cambio_pct > 0 ? '+' : ''}{c.cambio_pct}%</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 'var(--rp)', background: c.direccion === 'subida' ? '#FEE2E2' : '#DCFCE7', color: c.direccion === 'subida' ? '#DC2626' : '#15803D' }}>{c.direccion === 'subida' ? '📈 Subida' : '📉 Bajada'}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--dim)' }}>{new Date(c.detectado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
