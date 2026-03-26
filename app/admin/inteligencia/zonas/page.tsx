'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ZonasPage() {
  const [zonas, setZonas] = useState<any[]>([])
  const [selectedZona, setSelectedZona] = useState('')
  const [proyectosZona, setProyectosZona] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: projects } = await supabase.from('projects').select('id, nombre, alcaldia, colonia, precio_desde, m2_min, total_unidades, estado, comision_pct, vistas_count').eq('publicado', true)
      const { data: unidades } = await supabase.from('unidades').select('project_id, estado, precio, m2_privados')
      const { data: snapshots } = await supabase.from('zona_snapshots').select('*').order('semana', { ascending: false })
      const { data: searches } = await supabase.from('search_logs').select('alcaldia').not('alcaldia', 'is', null)

      const zonaMap: Record<string, any> = {}
      ;(projects || []).forEach(p => {
        if (!p.alcaldia) return
        if (!zonaMap[p.alcaldia]) zonaMap[p.alcaldia] = { alcaldia: p.alcaldia, proyectos: [], uds: [], busquedas: 0, snapshots: [] }
        zonaMap[p.alcaldia].proyectos.push(p)
      })
      ;(unidades || []).forEach(u => {
        const proj = (projects || []).find(p => p.id === u.project_id)
        if (proj?.alcaldia && zonaMap[proj.alcaldia]) zonaMap[proj.alcaldia].uds.push(u)
      })
      ;(searches || []).forEach(s => { if (s.alcaldia && zonaMap[s.alcaldia]) zonaMap[s.alcaldia].busquedas++ })
      ;(snapshots || []).forEach(s => { if (zonaMap[s.alcaldia]) zonaMap[s.alcaldia].snapshots.push(s) })

      const zonaList = Object.values(zonaMap).map((z: any) => {
        const disponibles = z.uds.filter((u: any) => u.estado === 'disponible').length
        const vendidas = z.uds.filter((u: any) => u.estado === 'vendido').length
        const total = z.uds.length || 1
        const precios = z.proyectos.map((p: any) => p.precio_desde).filter(Boolean)
        const preciosM2 = z.proyectos.filter((p: any) => p.m2_min > 0).map((p: any) => p.precio_desde / p.m2_min)
        return {
          ...z, disponibles, vendidas, total,
          absorcion: Math.round((vendidas) / total * 100),
          precio_min: precios.length > 0 ? Math.min(...precios) : 0,
          precio_max: precios.length > 0 ? Math.max(...precios) : 0,
          precio_m2_prom: preciosM2.length > 0 ? Math.round(preciosM2.reduce((a: number, b: number) => a + b, 0) / preciosM2.length) : 0,
        }
      }).sort((a: any, b: any) => b.busquedas - a.busquedas)

      setZonas(zonaList)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedZona) {
      const z = zonas.find(z => z.alcaldia === selectedZona)
      setProyectosZona(z?.proyectos || [])
    }
  }, [selectedZona, zonas])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando análisis por zona...</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>📍 Análisis por zona</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Drill down por alcaldía — selecciona una para ver detalle</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedZona ? '1fr 1fr' : '1fr', gap: '16px' }}>
        {/* Lista de zonas */}
        <div style={{ display: 'grid', gap: '8px' }}>
          {zonas.map(z => (
            <div key={z.alcaldia} onClick={() => setSelectedZona(z.alcaldia === selectedZona ? '' : z.alcaldia)} style={{ background: z.alcaldia === selectedZona ? 'var(--dk)' : 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: z.alcaldia === selectedZona ? '#fff' : 'var(--dk)' }}>{z.alcaldia}</div>
                <div style={{ fontSize: '11px', color: z.alcaldia === selectedZona ? 'rgba(255,255,255,.6)' : 'var(--mid)', marginTop: '2px' }}>
                  {z.proyectos.length} proy. · {z.disponibles} disp. · {z.busquedas} búsquedas
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: z.alcaldia === selectedZona ? '#fff' : 'var(--gr)' }}>${z.precio_m2_prom.toLocaleString('es-MX')}</div>
                  <div style={{ fontSize: '9px', color: z.alcaldia === selectedZona ? 'rgba(255,255,255,.5)' : 'var(--dim)' }}>/m²</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--rp)', background: z.absorcion >= 50 ? '#DCFCE7' : z.absorcion >= 25 ? '#FEF9C3' : '#FEE2E2', color: z.absorcion >= 50 ? '#15803D' : z.absorcion >= 25 ? '#A16207' : '#DC2626' }}>{z.absorcion}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle de zona seleccionada */}
        {selectedZona && (() => {
          const z = zonas.find(z => z.alcaldia === selectedZona)
          if (!z) return null
          return (
            <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px', position: 'sticky', top: '84px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--dk)', marginBottom: '14px' }}>{selectedZona}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: '16px' }}>
                {[
                  { l: 'Proyectos', v: z.proyectos.length },
                  { l: 'Unidades', v: z.total },
                  { l: 'Disponibles', v: z.disponibles },
                  { l: 'Vendidas', v: z.vendidas },
                  { l: 'Precio/m²', v: `$${z.precio_m2_prom.toLocaleString('es-MX')}` },
                  { l: 'Absorción', v: `${z.absorcion}%` },
                  { l: 'Rango precio', v: `$${(z.precio_min / 1e6).toFixed(1)}M – $${(z.precio_max / 1e6).toFixed(1)}M` },
                  { l: 'Búsquedas', v: z.busquedas },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg2)', borderRadius: 'var(--rs)', padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dk)' }}>{s.v}</div>
                    <div style={{ fontSize: '9px', color: 'var(--mid)' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dk)', marginBottom: '8px' }}>Proyectos en {selectedZona}</div>
              {proyectosZona.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--bd2)', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--dk)' }}>{p.nombre}</div>
                    <div style={{ fontSize: '10px', color: 'var(--mid)' }}>{p.colonia} · {p.estado}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 500, color: 'var(--gr)' }}>${(p.precio_desde / 1e6).toFixed(1)}M</div>
                    <div style={{ fontSize: '10px', color: 'var(--mid)' }}>{p.vistas_count || 0} vistas</div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* CONCENTRACIÓN DE COMPETENCIA POR ZONA */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginTop:'20px'}}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'4px'}}>🏟️ Concentración de competencia por zona</div>
        <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'14px'}}>Cuántos proyectos compiten entre sí por alcaldía</div>
        <div style={{display:'grid',gap:'8px'}}>
          {zonas.filter(z => z.proyectos.length > 1).map(z => {
            const concentration = z.proyectos.length
            const level = concentration >= 5 ? 'Alta' : concentration >= 3 ? 'Media' : 'Baja'
            const levelColor = concentration >= 5 ? '#DC2626' : concentration >= 3 ? '#A16207' : '#15803D'
            const levelBg = concentration >= 5 ? '#FEE2E2' : concentration >= 3 ? '#FEF9C3' : '#DCFCE7'
            return (
              <div key={z.alcaldia} style={{display:'flex',alignItems:'center',gap:'14px',padding:'10px 14px',background:'var(--bg2)',borderRadius:'var(--rs)'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>{z.alcaldia}</div>
                  <div style={{fontSize:'11px',color:'var(--mid)'}}>{concentration} proyectos compitiendo · {z.disponibles} unidades disponibles</div>
                </div>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'16px',fontWeight:700,color:'var(--dk)'}}>{concentration}</div>
                    <div style={{fontSize:'9px',color:'var(--mid)'}}>proyectos</div>
                  </div>
                  <span style={{fontSize:'10px',fontWeight:600,padding:'3px 10px',borderRadius:'var(--rp)',background:levelBg,color:levelColor}}>Competencia {level}</span>
                </div>
              </div>
            )
          })}
          {zonas.filter(z => z.proyectos.length > 1).length === 0 && (
            <div style={{textAlign:'center',color:'var(--mid)',padding:'20px',fontSize:'12px'}}>Se necesitan múltiples proyectos por zona para detectar competencia</div>
          )}
        </div>
      </div>
    </div>
  )
}
