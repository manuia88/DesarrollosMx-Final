'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ZonaStat {
  alcaldia: string
  proyectos: number
  precio_promedio: number
  precio_m2_promedio: number
  unidades_disponibles: number
  unidades_vendidas: number
  absorcion_pct: number
  indice_presion: number
}

interface UnmetDemand {
  alcaldia: string
  precio_max: number
  recamaras: number
  busquedas_count: number
}

interface SearchTrend {
  alcaldia: string
  count: number
}

export default function InteligenciaPage() {
  const [zonaStats, setZonaStats] = useState<ZonaStat[]>([])
  const [unmetDemand, setUnmetDemand] = useState<UnmetDemand[]>([])
  const [searchTrends, setSearchTrends] = useState<SearchTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('mercado')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: projects }, { data: unidades }, { data: searches }, { data: unmet }] = await Promise.all([
        supabase.from('projects').select('id, alcaldia, colonia, precio_desde, m2_min, total_unidades').eq('publicado', true),
        supabase.from('unidades').select('project_id, estado, precio, m2_privados'),
        supabase.from('search_logs').select('alcaldia').not('alcaldia', 'is', null),
        supabase.from('unmet_demand').select('*').order('busquedas_count', { ascending: false }).limit(10),
      ])

      // Calcular stats por zona
      const zonaMap: Record<string, ZonaStat> = {}
      ;(projects || []).forEach(p => {
        if (!p.alcaldia) return
        if (!zonaMap[p.alcaldia]) {
          zonaMap[p.alcaldia] = { alcaldia: p.alcaldia, proyectos: 0, precio_promedio: 0, precio_m2_promedio: 0, unidades_disponibles: 0, unidades_vendidas: 0, absorcion_pct: 0, indice_presion: 0 }
        }
        zonaMap[p.alcaldia].proyectos++
        zonaMap[p.alcaldia].precio_promedio += p.precio_desde
      })

      // Agregar unidades por zona
      ;(projects || []).forEach(p => {
        const uds = (unidades || []).filter(u => u.project_id === p.id)
        if (zonaMap[p.alcaldia]) {
          zonaMap[p.alcaldia].unidades_disponibles += uds.filter(u => u.estado === 'disponible').length
          zonaMap[p.alcaldia].unidades_vendidas += uds.filter(u => u.estado === 'vendido').length
        }
      })

      // Calcular promedios y absorción
      Object.values(zonaMap).forEach(z => {
        z.precio_promedio = z.proyectos > 0 ? Math.round(z.precio_promedio / z.proyectos) : 0
        const total = z.unidades_disponibles + z.unidades_vendidas
        z.absorcion_pct = total > 0 ? Math.round(z.unidades_vendidas / total * 100) : 0
        z.indice_presion = Math.min(10, Math.round(z.absorcion_pct / 10 + z.proyectos / 2))
      })

      setZonaStats(Object.values(zonaMap).sort((a, b) => b.indice_presion - a.indice_presion))

      // Tendencias de búsqueda
      const trendMap: Record<string, number> = {}
      ;(searches || []).forEach(s => { if (s.alcaldia) trendMap[s.alcaldia] = (trendMap[s.alcaldia] || 0) + 1 })
      setSearchTrends(Object.entries(trendMap).map(([alcaldia, count]) => ({ alcaldia, count })).sort((a, b) => b.count - a.count).slice(0, 8))

      setUnmetDemand((unmet as UnmetDemand[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  function getPresionStyle(p: number) {
    if (p >= 7) return { color:'#15803D', bg:'#DCFCE7', label:'Alta' }
    if (p >= 4) return { color:'#A16207', bg:'#FEF9C3', label:'Media' }
    return { color:'#DC2626', bg:'#FEE2E2', label:'Baja' }
  }

  function getAbsStyle(p: number) {
    if (p >= 15) return { color:'#15803D', label:'🟢 VERDE' }
    if (p >= 8) return { color:'#A16207', label:'🟡 AMARILLO' }
    return { color:'#DC2626', label:'🔴 ROJO' }
  }

  const tabStyle = (id: string) => ({
    fontSize:'13px', padding:'10px 0', marginRight:'22px',
    color: activeTab===id ? 'var(--dk)' : 'var(--mid)',
    borderTop:'none', borderLeft:'none', borderRight:'none',
    borderBottomWidth:'2px', borderBottomStyle:'solid' as const,
    borderBottomColor: activeTab===id ? 'var(--dk)' : 'transparent',
    marginBottom:'-1px', cursor:'pointer',
    fontWeight: activeTab===id ? 500 : 400,
    background:'transparent', fontFamily:'var(--sans)',
    whiteSpace:'nowrap' as const
  })

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando inteligencia de mercado...</div>

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>🧠 Inteligencia de mercado</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Datos reales del mercado de vivienda nueva en CDMX</div>
      </div>

      {/* TABS */}
      <div style={{borderBottom:'1px solid var(--bd)',marginBottom:'24px',display:'flex',overflowX:'auto',scrollbarWidth:'none'}}>
        {[{id:'mercado',l:'Mercado por zona'},{id:'demanda',l:'Demanda no atendida'},{id:'tendencias',l:'Tendencias de búsqueda'}].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>{t.l}</button>
        ))}
      </div>

      {/* TAB: MERCADO POR ZONA */}
      {activeTab === 'mercado' && (
        <div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'16px',lineHeight:1.6}}>
            Análisis de actividad por alcaldía. El índice de presión combina absorción + número de proyectos + demanda de búsquedas.
          </div>
          {zonaStats.length === 0 ? (
            <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'40px',textAlign:'center',color:'var(--mid)'}}>
              Los datos de mercado se generan automáticamente con el uso de la plataforma
            </div>
          ) : (
            <div style={{display:'grid',gap:'10px'}}>
              {zonaStats.map((z, i) => {
                const presStyle = getPresionStyle(z.indice_presion)
                const absStyle = getAbsStyle(z.absorcion_pct)
                return (
                  <div key={z.alcaldia} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px 20px',display:'flex',gap:'16px',alignItems:'center'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'var(--dk)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,flexShrink:0}}>
                      {i+1}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'4px'}}>{z.alcaldia}</div>
                      <div style={{display:'flex',gap:'14px',fontSize:'11px',color:'var(--mid)',flexWrap:'wrap'}}>
                        <span>🏗️ {z.proyectos} proyecto{z.proyectos!==1?'s':''}</span>
                        <span>🏠 {z.unidades_disponibles} disponibles</span>
                        <span>✅ {z.unidades_vendidas} vendidas</span>
                        {z.precio_promedio > 0 && <span>💰 Prom. ${Math.round(z.precio_promedio/1e6*10)/10}M</span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'10px',alignItems:'center',flexShrink:0}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'11px',color:absStyle.color,fontWeight:600}}>{absStyle.label}</div>
                        <div style={{fontSize:'10px',color:'var(--mid)'}}>{z.absorcion_pct}% absorción</div>
                      </div>
                      <div style={{textAlign:'center',background:presStyle.bg,padding:'8px 14px',borderRadius:'var(--rs)'}}>
                        <div style={{fontSize:'20px',fontWeight:700,color:presStyle.color}}>{z.indice_presion}/10</div>
                        <div style={{fontSize:'9px',color:presStyle.color,fontWeight:600}}>Presión {presStyle.label}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: DEMANDA NO ATENDIDA */}
      {activeTab === 'demanda' && (
        <div>
          <div style={{background:'var(--am-bg)',borderRadius:'var(--r)',border:'1px solid #FCD34D',padding:'14px 16px',marginBottom:'20px',fontSize:'12px',color:'var(--am)',lineHeight:1.6}}>
            ⚡ <strong>Oportunidad de mercado:</strong> Estas son las búsquedas que no encontraron proyectos disponibles. Zonas y rangos de precio con demanda real sin oferta.
          </div>
          {unmetDemand.length === 0 ? (
            <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'40px',textAlign:'center',color:'var(--mid)'}}>
              <div style={{fontSize:'24px',marginBottom:'12px'}}>📊</div>
              <div style={{fontSize:'14px',fontWeight:500,marginBottom:'8px'}}>Los datos se acumulan con el uso</div>
              <div style={{fontSize:'12px'}}>Cuando los usuarios busquen sin encontrar resultados, aparecerán aquí las oportunidades de mercado</div>
            </div>
          ) : (
            <div style={{display:'grid',gap:'10px'}}>
              {unmetDemand.map((d, i) => (
                <div key={i} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'4px'}}>
                      {d.alcaldia} · {d.recamaras} rec. · Hasta ${(d.precio_max/1e6).toFixed(1)}M
                    </div>
                    <div style={{fontSize:'11px',color:'var(--mid)'}}>Búsquedas sin resultado esta semana</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'24px',fontWeight:700,color:'var(--am)'}}>{d.busquedas_count}</div>
                    <div style={{fontSize:'10px',color:'var(--mid)'}}>búsquedas</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: TENDENCIAS */}
      {activeTab === 'tendencias' && (
        <div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'16px'}}>
            Zonas más buscadas en el portal. Basado en filtros de búsqueda reales.
          </div>
          {searchTrends.length === 0 ? (
            <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'40px',textAlign:'center',color:'var(--mid)'}}>
              Las tendencias aparecerán aquí cuando los usuarios empiecen a buscar proyectos
            </div>
          ) : (
            <div style={{display:'grid',gap:'8px'}}>
              {searchTrends.map((t, i) => {
                const maxCount = searchTrends[0].count
                const pct = Math.round(t.count / maxCount * 100)
                return (
                  <div key={t.alcaldia} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <span style={{fontSize:'12px',fontWeight:600,color:'var(--mid)',minWidth:'20px'}}>#{i+1}</span>
                        <span style={{fontSize:'14px',fontWeight:500,color:'var(--dk)'}}>{t.alcaldia}</span>
                      </div>
                      <span style={{fontSize:'13px',fontWeight:600,color:'var(--dk)'}}>{t.count} búsquedas</span>
                    </div>
                    <div style={{background:'var(--bg2)',borderRadius:'var(--rp)',height:'6px',overflow:'hidden'}}>
                      <div style={{height:'100%',background:'var(--dk)',borderRadius:'var(--rp)',width:`${pct}%`,transition:'width .4s'}} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* INSIGHT */}
          <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',border:'1px solid rgba(27,67,50,.15)',padding:'16px',marginTop:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--gr)',marginBottom:'8px'}}>💡 Cómo usar esta información</div>
            <div style={{fontSize:'12px',color:'var(--mid)',lineHeight:1.7}}>
              Las zonas con más búsquedas son donde tus clientes están buscando. Si tienes proyectos en esas zonas, son los que debes promover primero. Si no tienes, explora el catálogo filtrando por esas alcaldías.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
