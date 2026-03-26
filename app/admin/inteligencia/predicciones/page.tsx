'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PrediccionesPage() {
  const [proyecciones, setProyecciones] = useState<any[]>([])
  const [patrones, setPatrones] = useState<{hora:number,count:number}[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Proyecciones de inventario
      const { data: projects } = await supabase.from('projects').select('id, nombre, alcaldia, precio_desde').eq('publicado', true)
      const list: any[] = []
      for (const p of (projects || []).slice(0, 15) as any[]) {
        try {
          const { data: vel } = await supabase.rpc('get_project_velocity', { p_project_id: p.id })
          if (vel?.[0]) {
            list.push({ ...p, ...vel[0] })
          }
        } catch {}
      }
      setProyecciones(list.sort((a, b) => (a.meses_para_sold_out || 99) - (b.meses_para_sold_out || 99)))

      // Patrones de hora de actividad
      const { data: events } = await supabase.from('events').select('created_at').limit(500)
      const horaMap: Record<number, number> = {}
      ;(events || []).forEach((e: any) => {
        const h = new Date(e.created_at).getHours()
        horaMap[h] = (horaMap[h] || 0) + 1
      })
      setPatrones(Array.from({ length: 24 }, (_, h) => ({ hora: h, count: horaMap[h] || 0 })))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando predicciones...</div>

  const maxHora = Math.max(...patrones.map(p => p.count), 1)

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>🔮 Predicciones y patrones</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Proyecciones de inventario + patrones de actividad</div>
      </div>

      {/* Proyecciones de sold out */}
      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>Proyección de agotamiento</div>
        {proyecciones.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--mid)', padding: '20px' }}>Sin datos suficientes para proyecciones</div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {proyecciones.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', background: 'var(--bg2)', borderRadius: 'var(--rs)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dk)' }}>{p.nombre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--mid)' }}>{p.alcaldia} · {p.disponibles} disponibles de {p.total_unidades}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--dk)' }}>{p.ventas_por_mes}/mes</div>
                  <div style={{ fontSize: '9px', color: 'var(--mid)' }}>velocity</div>
                </div>
                <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 'var(--rs)', background: p.meses_para_sold_out <= 3 ? '#FEE2E2' : p.meses_para_sold_out <= 6 ? '#FEF9C3' : '#DCFCE7' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: p.meses_para_sold_out <= 3 ? '#DC2626' : p.meses_para_sold_out <= 6 ? '#A16207' : '#15803D' }}>
                    {p.meses_para_sold_out < 99 ? `${p.meses_para_sold_out}m` : '—'}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--mid)' }}>sold out</div>
                </div>
                {p.fecha_estimada_sold_out && (
                  <div style={{ fontSize: '11px', color: 'var(--mid)', minWidth: '70px' }}>
                    ~{new Date(p.fecha_estimada_sold_out).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patrón de actividad por hora */}
      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '4px' }}>Patrón de actividad por hora</div>
        <div style={{ fontSize: '11px', color: 'var(--mid)', marginBottom: '14px' }}>¿Cuándo buscan los usuarios? Datos basados en eventos reales</div>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'end', height: '100px' }}>
          {patrones.map(p => (
            <div key={p.hora} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '100%', background: p.count > maxHora * 0.7 ? 'var(--gr)' : p.count > maxHora * 0.3 ? '#F59E0B' : 'var(--bg2)', borderRadius: '2px 2px 0 0', height: `${Math.max(4, (p.count / maxHora) * 80)}px` }} />
              <span style={{ fontSize: '8px', color: 'var(--dim)' }}>{p.hora}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--mid)', marginTop: '8px' }}>
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
        {patrones.some(p => p.count > 0) && (
          <div style={{ fontSize: '11px', color: 'var(--gr)', marginTop: '10px', fontWeight: 500 }}>
            💡 Hora pico: {patrones.reduce((max, p) => p.count > max.count ? p : max, patrones[0]).hora}:00 hrs
          </div>
        )}
      </div>
    </div>
  )
}
