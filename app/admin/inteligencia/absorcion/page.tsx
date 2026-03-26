'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AbsorcionPage() {
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: projects } = await supabase.from('projects').select('id, nombre, alcaldia, colonia, precio_desde').eq('publicado', true)
      const { data: unidades } = await supabase.from('unidades').select('project_id, estado')
      const list: any[] = []
      for (const p of (projects || []) as any[]) {
        const uds = (unidades || []).filter((u: any) => u.project_id === p.id)
        const total = uds.length || 1
        const vendidas = uds.filter((u: any) => u.estado === 'vendido').length
        const reservadas = uds.filter((u: any) => u.estado === 'reservado').length
        const disponibles = uds.filter((u: any) => u.estado === 'disponible').length
        let vel = { ventas_por_mes: 0, meses_para_sold_out: 99, tendencia: 'estable' }
        try { const { data: v } = await supabase.rpc('get_project_velocity', { p_project_id: p.id }); if (v?.[0]) vel = v[0] } catch {}
        list.push({ ...p, total, vendidas, reservadas, disponibles, absorcion: Math.round((vendidas + reservadas) / total * 100), ...vel })
      }
      setProyectos(list.sort((a, b) => b.ventas_por_mes - a.ventas_por_mes))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando absorción...</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>⚡ Absorción y velocity</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Velocidad de venta real por proyecto</div>
      </div>

      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['Proyecto', 'Zona', 'Inventario', 'Absorción', 'Velocity', 'Sold out', 'Tendencia'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--mid)', borderBottom: '1px solid var(--bd)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proyectos.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--bd2)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--dk)' }}>{p.nombre}</div>
                  <div style={{ fontSize: '10px', color: 'var(--gr)' }}>${(p.precio_desde / 1e6).toFixed(1)}M</div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{p.colonia}, {p.alcaldia}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: '4px', fontSize: '11px' }}>
                    <span style={{ color: '#15803D' }}>{p.disponibles}d</span>·<span style={{ color: '#F59E0B' }}>{p.reservadas}r</span>·<span style={{ color: '#DC2626' }}>{p.vendidas}v</span>/{p.total}
                  </div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ width: '60px', height: '8px', background: 'var(--bg2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: p.absorcion >= 50 ? '#15803D' : p.absorcion >= 25 ? '#F59E0B' : '#DC2626', width: `${Math.min(p.absorcion, 100)}%` }} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--mid)' }}>{p.absorcion}%</span>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '14px', fontWeight: 700, color: 'var(--dk)' }}>{p.ventas_por_mes}/mes</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: p.meses_para_sold_out <= 3 ? '#DC2626' : p.meses_para_sold_out <= 6 ? '#A16207' : 'var(--mid)' }}>{p.meses_para_sold_out < 99 ? `${p.meses_para_sold_out}m` : '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 'var(--rp)', background: p.tendencia === 'acelerando' ? '#DCFCE7' : p.tendencia === 'desacelerando' ? '#FEE2E2' : 'var(--bg2)', color: p.tendencia === 'acelerando' ? '#15803D' : p.tendencia === 'desacelerando' ? '#DC2626' : 'var(--mid)' }}>{p.tendencia === 'acelerando' ? '🔥' : p.tendencia === 'desacelerando' ? '⚠️' : '→'} {p.tendencia}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
