'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProjectCard from './ProjectCard'

interface Project {
  id: string
  nombre: string
  estado: string
  colonia: string
  alcaldia: string
  precio_desde: number
  entrega_quarter?: string
  entrega_year?: number
  m2_min?: number
  m2_max?: number
  recamaras_min?: number
  recamaras_max?: number
  cajones_min?: number
  cajones_max?: number
  destacado?: boolean
  fotos?: { url: string; is_hero: boolean; orden: number }[]
}

export default function ExplorarView({
  onNavigate,
}: {
  onNavigate: (view: string, id?: string) => void
}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [mapaOn, setMapaOn] = useState(false)
  const [filtros, setFiltros] = useState({
    alcaldia: '',
    tipo: '',
    precio: '',
    recamaras: '',
    entrega: '',
  })
  const [orden, setOrden] = useState('recomendados')
  const sessionId = useRef<string>(Math.random().toString(36).slice(2))
  const searchStart = useRef<number>(Date.now())
  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [filtros, orden])

  // Track search log silencioso
  const logSearch = useCallback(async (results: Project[], hadResults: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const precioMap: Record<string, { min?: number; max?: number }> = {
        'menos4': { max: 4000000 },
        '4a7':    { min: 4000000, max: 7000000 },
        '7a12':   { min: 7000000, max: 12000000 },
        'mas12':  { min: 12000000 },
      }
      const precioRange = precioMap[filtros.precio] || {}
      await supabase.from('search_logs').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        alcaldia: filtros.alcaldia || null,
        precio_min: precioRange.min || null,
        precio_max: precioRange.max || null,
        recamaras: filtros.recamaras ? parseInt(filtros.recamaras) : null,
        entrega: filtros.entrega || null,
        results_count: results.length,
        had_results: hadResults,
      })
    } catch { /* silencioso */ }
  }, [filtros])

  // Track event genérico
  const trackEvent = useCallback(async (eventType: string, entityId?: string, metadata?: Record<string, unknown>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('events').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        event_type: eventType,
        entity_type: 'project',
        entity_id: entityId || null,
        metadata: metadata || {},
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      })
    } catch { /* silencioso */ }
  }, [])

  async function fetchProjects() {
    setLoading(true)
    searchStart.current = Date.now()
    let query = supabase
      .from('projects')
      .select('*, fotos(url, is_hero, orden)')
      .eq('publicado', true)

    if (filtros.alcaldia) query = query.eq('alcaldia', filtros.alcaldia)
    if (filtros.tipo) query = query.eq('tipo', filtros.tipo)
    if (filtros.precio === 'menos4') query = query.lt('precio_desde', 4000000)
    if (filtros.precio === '4a7') query = query.gte('precio_desde', 4000000).lt('precio_desde', 7000000)
    if (filtros.precio === '7a12') query = query.gte('precio_desde', 7000000).lt('precio_desde', 12000000)
    if (filtros.precio === 'mas12') query = query.gte('precio_desde', 12000000)
    if (filtros.recamaras === '1') query = query.eq('recamaras_min', 1)
    if (filtros.recamaras === '2') query = query.eq('recamaras_min', 2)
    if (filtros.recamaras === '3') query = query.eq('recamaras_min', 3)
    if (filtros.recamaras === '3+') query = query.gte('recamaras_min', 3)
    if (filtros.entrega === '2025') query = query.eq('entrega_year', 2025)
    if (filtros.entrega === '2026') query = query.eq('entrega_year', 2026)
    if (filtros.entrega === '2027') query = query.eq('entrega_year', 2027)
    if (filtros.entrega === 'inmediata') query = query.eq('estado', 'Entrega inmediata')

    if (orden === 'precio_asc') query = query.order('precio_desde', { ascending: true })
    else if (orden === 'precio_desc') query = query.order('precio_desde', { ascending: false })
    else query = query.order('destacado', { ascending: false }).order('created_at', { ascending: false })

    const { data } = await query
    const results = (data as Project[]) || []
    setProjects(results)
    setLoading(false)

    // Log búsqueda silencioso — solo si hay algún filtro activo
    const anyFilter = Object.values(filtros).some(v => v !== '')
    if (anyFilter) {
      logSearch(results, results.length > 0)
      // Si no hay resultados, es demanda no atendida
      if (results.length === 0 && filtros.alcaldia) {
        try {
          const precioMap: Record<string, number> = {
            'menos4': 4000000, '4a7': 7000000, '7a12': 12000000, 'mas12': 20000000
          }
          await supabase.from('unmet_demand').upsert({
            alcaldia: filtros.alcaldia,
            precio_max: precioMap[filtros.precio] || null,
            recamaras: filtros.recamaras ? parseInt(filtros.recamaras) : null,
            busquedas_count: 1,
            semana: new Date().toISOString().slice(0,10),
          }, {
            onConflict: 'alcaldia,precio_max,recamaras,semana',
            ignoreDuplicates: false
          }).then(({ error }) => {
            if (!error) {
              // Incrementar counter si ya existe
              supabase.rpc('increment_unmet_demand', {
                p_alcaldia: filtros.alcaldia,
                p_precio_max: precioMap[filtros.precio] || null,
                p_recamaras: filtros.recamaras ? parseInt(filtros.recamaras) : null,
              })
            }
          })
        } catch { /* silencioso */ }
      }
    }

    // Captura omnicanal → demand_queries
    if (anyFilter) {
      try {
        const precioRanges: Record<string, {min:number|null,max:number|null}> = {
          'menos4': {min:null,max:4000000}, '4a7': {min:4000000,max:7000000},
          '7a12': {min:7000000,max:12000000}, 'mas12': {min:12000000,max:null},
        }
        const pr = precioRanges[filtros.precio] || {min:null,max:null}
        await supabase.from('demand_queries').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
          fuente: 'web',
          alcaldia: filtros.alcaldia || null,
          recamaras_min: filtros.recamaras ? parseInt(filtros.recamaras) : null,
          precio_min: pr.min,
          precio_max: pr.max,
          results_count: results.length,
          gap_detected: results.length === 0 && anyFilter,
          gap_detail: results.length === 0 ? `Sin resultados: ${filtros.alcaldia || 'cualquier zona'}, ${filtros.recamaras || 'cualquier'} rec, ${filtros.precio || 'cualquier precio'}` : null,
        })
      } catch { /* silencioso */ }
    }

    // Track evento de búsqueda
    trackEvent('search', undefined, {
      filtros,
      results_count: results.length,
      duration_ms: Date.now() - searchStart.current,
    })
  }

  function updateFiltro(key: string, value: string) {
    setFiltros(prev => ({ ...prev, [key]: value }))
  }

  // Track click en proyecto
  function handleProjectClick(projectId: string, position: number) {
    trackEvent('view_project', projectId, { position, filtros })
    // Actualizar search_log con el proyecto clickeado
    supabase.from('search_logs')
      .select('id').eq('session_id', sessionId.current)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]?.id) {
          supabase.from('search_logs').update({
            clicked_project_id: projectId,
            clicked_position: position,
          }).eq('id', data[0].id).then(() => {})
        }
      })
    onNavigate('detail', projectId)
  }

  const pillStyle = {
    display:'inline-flex',alignItems:'center',gap:'4px',
    background:'var(--wh)',border:'1px solid var(--bd)',
    borderRadius:'var(--rp)',padding:'7px 14px',
    fontSize:'12px',color:'var(--dk)',cursor:'pointer',
    whiteSpace:'nowrap' as const,userSelect:'none' as const,
    fontFamily:'var(--sans)'
  }

  const selectStyle = {
    border:'none',background:'transparent',
    fontFamily:'var(--sans)',fontSize:'12px',
    color:'var(--dk)',cursor:'pointer',outline:'none',
    appearance:'none' as const
  }

  const sepStyle = {
    width:'1px',height:'18px',
    background:'var(--bd)',flexShrink:0
  }

  return (
    <div style={{maxWidth:'1200px',margin:'0 auto',padding:'0 40px'}}>

      {/* HEADER */}
      <div style={{padding:'24px 0 0'}}>
        <div style={{fontSize:'12px',color:'var(--mid)',marginBottom:'8px',display:'flex',gap:'5px'}}>
          <span onClick={() => onNavigate('home')} style={{cursor:'pointer'}}>Inicio</span>
          <span>›</span>
          <span>Comprar</span>
        </div>
        <div style={{fontSize:'30px',fontWeight:600,color:'var(--dk)',lineHeight:1.1,marginBottom:'3px'}}>
          Vivienda nueva en preventa y entrega inmediata
        </div>
        <div style={{fontSize:'30px',fontWeight:600,color:'var(--mid)',lineHeight:1.1,marginBottom:'10px'}}>
          Ciudad de México ↓
        </div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>
          <strong style={{color:'var(--dk)'}}>{projects.length}</strong> proyectos disponibles
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{
        display:'flex',gap:'7px',alignItems:'center',
        padding:'14px 0',borderBottom:'1px solid var(--bd)',
        marginBottom:'22px',overflowX:'auto',scrollbarWidth:'none'
      }}>
        <div style={pillStyle}>
          <select style={selectStyle} value={filtros.alcaldia} onChange={e => updateFiltro('alcaldia', e.target.value)}>
            <option value=''>Alcaldías</option>
            <option>Álvaro Obregón</option><option>Azcapotzalco</option>
            <option>Benito Juárez</option><option>Coyoacán</option>
            <option>Cuajimalpa</option><option>Cuauhtémoc</option>
            <option>GAM</option><option>Iztacalco</option>
            <option>Iztapalapa</option><option>Magdalena Contreras</option>
            <option>Miguel Hidalgo</option><option>Milpa Alta</option>
            <option>Tláhuac</option><option>Tlalpan</option>
            <option>Venustiano Carranza</option><option>Xochimilco</option>
          </select>
          <span style={{fontSize:'10px',color:'var(--mid)'}}>▾</span>
        </div>
        <div style={sepStyle} />
        <div style={pillStyle}>
          <select style={selectStyle} value={filtros.tipo} onChange={e => updateFiltro('tipo', e.target.value)}>
            <option value=''>Tipo</option>
            <option>Residencial</option><option>Boutique</option>
            <option>Corporativo</option><option>Mixto</option>
          </select>
          <span style={{fontSize:'10px',color:'var(--mid)'}}>▾</span>
        </div>
        <div style={sepStyle} />
        <div style={pillStyle}>
          <select style={selectStyle} value={filtros.precio} onChange={e => updateFiltro('precio', e.target.value)}>
            <option value=''>Precio</option>
            <option value='menos4'>Hasta $4M</option>
            <option value='4a7'>$4M–$7M</option>
            <option value='7a12'>$7M–$12M</option>
            <option value='mas12'>+$12M</option>
          </select>
          <span style={{fontSize:'10px',color:'var(--mid)'}}>▾</span>
        </div>
        <div style={sepStyle} />
        <div style={pillStyle}>
          <select style={selectStyle} value={filtros.recamaras} onChange={e => updateFiltro('recamaras', e.target.value)}>
            <option value=''>Recámaras</option>
            <option value='1'>1</option><option value='2'>2</option>
            <option value='3'>3</option><option value='3+'>3+</option>
          </select>
          <span style={{fontSize:'10px',color:'var(--mid)'}}>▾</span>
        </div>
        <div style={sepStyle} />
        <div style={pillStyle}>
          <select style={selectStyle} value={filtros.entrega} onChange={e => updateFiltro('entrega', e.target.value)}>
            <option value=''>Entrega</option>
            <option value='inmediata'>Inmediata</option>
            <option value='2025'>2025</option>
            <option value='2026'>2026</option>
            <option value='2027'>2027</option>
          </select>
          <span style={{fontSize:'10px',color:'var(--mid)'}}>▾</span>
        </div>
        <div style={sepStyle} />
        <div style={pillStyle} onClick={() => alert('Más filtros: m², amenidades, comisión…')}>
          Más filtros ⚙
        </div>

        {/* TOGGLE MAPA */}
        <div
          onClick={() => setMapaOn(!mapaOn)}
          style={{
            marginLeft:'auto',display:'flex',alignItems:'center',gap:'7px',
            fontSize:'12px',color:'var(--dk)',cursor:'pointer',
            whiteSpace:'nowrap' as const,userSelect:'none' as const
          }}
        >
          Mostrar mapa{' '}
          <span style={{
            fontSize:'9px',fontWeight:600,letterSpacing:'.06em',
            textTransform:'uppercase' as const,
            background:'var(--am-bg)',color:'var(--am)',
            border:'1px solid #FCD34D',padding:'1px 5px',borderRadius:'3px'
          }}>NUEVO</span>
          <div style={{
            width:'36px',height:'20px',borderRadius:'10px',
            background: mapaOn ? 'var(--dk)' : 'var(--bd)',
            position:'relative',transition:'background .2s',flexShrink:0
          }}>
            <div style={{
              position:'absolute',top:'3px',
              left: mapaOn ? '19px' : '3px',
              width:'14px',height:'14px',borderRadius:'50%',
              background:'#fff',transition:'left .2s'
            }} />
          </div>
        </div>
      </div>

      {/* SORT ROW */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
        <span style={{fontSize:'13px',color:'var(--mid)'}}>
          {loading ? 'Cargando...' : `${projects.length} proyectos`}
        </span>
        <select
          value={orden}
          onChange={e => setOrden(e.target.value)}
          style={{
            fontFamily:'var(--sans)',fontSize:'12px',color:'var(--dk)',
            border:'1px solid var(--bd)',background:'var(--wh)',
            padding:'7px 30px 7px 12px',borderRadius:'var(--rp)',
            cursor:'pointer',outline:'none',appearance:'none' as const,
            backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23212D30' stroke-opacity='.45' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat:'no-repeat',backgroundPosition:'right 10px center'
          }}
        >
          <option value='recomendados'>Recomendados</option>
          <option value='precio_asc'>Precio: menor a mayor</option>
          <option value='precio_desc'>Precio: mayor a menor</option>
        </select>
      </div>

      {/* CONTENIDO: GRID O SPLIT */}
      {mapaOn ? (
        <div style={{display:'flex',gap:'0'}}>
          <div style={{flex:'0 0 60%',paddingRight:'16px'}}>
            <div style={{display:'flex',flexDirection:'column',gap:'12px',paddingBottom:'72px'}}>
              {loading ? (
                <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando proyectos...</div>
              ) : projects.length === 0 ? (
                <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>No se encontraron proyectos con estos filtros.</div>
              ) : projects.map((p, idx) => (
                <div key={p.id} onClick={() => handleProjectClick(p.id, idx)}>
                  <ProjectCard project={p} onNavigate={onNavigate} size='list' />
                </div>
              ))}
            </div>
          </div>
          <div style={{
            flex:1,position:'sticky',top:'60px',
            height:'calc(100vh - 60px)',background:'#E2E8E4',
            display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',
            gap:'8px',borderRadius:'8px'
          }}>
            <div style={{fontSize:'40px',opacity:.2}}>🗺️</div>
            <div style={{fontSize:'12px',color:'var(--mid)'}}>Mapa CDMX</div>
          </div>
        </div>
      ) : (
        <div style={{
          display:'grid',gridTemplateColumns:'repeat(3,1fr)',
          gap:'14px',paddingBottom:'72px'
        }}>
          {loading ? (
            <div style={{gridColumn:'span 3',padding:'40px',textAlign:'center',color:'var(--mid)'}}>
              Cargando proyectos...
            </div>
          ) : projects.length === 0 ? (
            <div style={{gridColumn:'span 3',padding:'40px',textAlign:'center',color:'var(--mid)'}}>
              No se encontraron proyectos con estos filtros.
            </div>
          ) : projects.map((p, idx) => (
            <div key={p.id} onClick={() => handleProjectClick(p.id, idx)} style={{cursor:'pointer'}}>
              <ProjectCard project={p} onNavigate={onNavigate} size='grid' />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
