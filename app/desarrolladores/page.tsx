'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  nombre: string
  estado: string
  estado_publicacion: string
  precio_desde: number
  colonia: string
  alcaldia: string
  total_unidades: number
  publicado: boolean
  created_at: string
}

interface Stats {
  totalProyectos: number
  proyectosPublicados: number
  proyectosBorrador: number
  proyectosRevision: number
  totalUnidades: number
  unidadesDisponibles: number
  unidadesVendidas: number
  unidadesReservadas: number
  totalLeads: number
  leadsNuevos: number
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Stats>({
    totalProyectos:0, proyectosPublicados:0, proyectosBorrador:0,
    proyectosRevision:0, totalUnidades:0, unidadesDisponibles:0,
    unidadesVendidas:0, unidadesReservadas:0, totalLeads:0, leadsNuevos:0
  })
  const [devId, setDevId] = useState<string | null>(null)
  const [devName, setDevName] = useState('')
  const [loading, setLoading] = useState(true)
  const [velocity, setVelocity] = useState<{project:string,ventas_por_mes:number,meses_sold_out:number,tendencia:string}[]>([])
  const [zonaComparison, setZonaComparison] = useState<{alcaldia:string,mi_precio_m2:number,zona_precio_m2:number,delta:number}[]>([])
  const [tipologia, setTipologia] = useState<{tipo:string,total:number,vendidas:number,pct:number}[]>([])
  const [compMode, setCompMode] = useState<'auto'|'manual'>('auto')
  const [manualCompIds, setManualCompIds] = useState<Set<string>>(new Set())
  const [allProjects, setAllProjects] = useState<{id:string,nombre:string,alcaldia:string,colonia:string}[]>([])
  const [competitors, setCompetitors] = useState<{project:string,comps:{nombre:string,precio_m2:number,absorcion_pct:number,ventas_por_mes:number,comision_pct:number,similarity_score:number,tipo_competencia:string}[]}[]>([])
  const [insights, setInsights] = useState<{project:string,insights:{insight_type:string,severity:string,message:string,data_point:string}[]}[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { console.error('No user session'); setLoading(false); return }

      const { data: dev } = await supabase
        .from('desarrolladoras')
        .select('id, nombre')
        .eq('user_id', user.id)
        .single()

      if (!dev) { console.error('No dev found for user:', user.id); setLoading(false); return }
      setDevId(dev.id)
      setDevName(dev.nombre)

      const { data: projs } = await supabase
        .from('projects')
        .select('*')
        .eq('desarrolladora_id', dev.id)
        .order('created_at', { ascending: false })

      const projList = (projs as Project[]) || []
      setProjects(projList)

      const projIds = projList.map(p => p.id)

      let unidades: {estado: string}[] = []
      let leads: {estado: string}[] = []

      if (projIds.length > 0) {
        const { data: u } = await supabase
          .from('unidades')
          .select('estado')
          .in('project_id', projIds)
        unidades = u || []

        const { data: l } = await supabase
          .from('leads')
          .select('estado')
          .in('project_id', projIds)
        leads = l || []
      }

      setStats({
        totalProyectos: projList.length,
        proyectosPublicados: projList.filter(p => p.estado_publicacion === 'publicado').length,
        proyectosBorrador: projList.filter(p => p.estado_publicacion === 'borrador').length,
        proyectosRevision: projList.filter(p => p.estado_publicacion === 'en_revision').length,
        totalUnidades: unidades.length,
        unidadesDisponibles: unidades.filter(u => u.estado === 'disponible').length,
        unidadesVendidas: unidades.filter(u => u.estado === 'vendido').length,
        unidadesReservadas: unidades.filter(u => u.estado === 'reservado').length,
        totalLeads: leads.length,
        leadsNuevos: leads.filter(l => l.estado === 'Nuevo').length,
      })

      // Velocity por proyecto
      const velList: typeof velocity = []
      for (const p of projList.filter(p => p.publicado)) {
        try {
          const { data: v } = await supabase.rpc('get_project_velocity', { p_project_id: p.id })
          if (v?.[0]) velList.push({ project: p.nombre, ventas_por_mes: v[0].ventas_por_mes || 0, meses_sold_out: Math.min(v[0].meses_para_sold_out || 99, 99), tendencia: v[0].tendencia || 'estable' })
        } catch {}
      }
      setVelocity(velList.sort((a, b) => b.ventas_por_mes - a.ventas_por_mes))

      // Performance vs competencia (precio/m² vs zona)
      if (projIds.length > 0) {
        const { data: allProjs } = await supabase.from('projects').select('alcaldia, precio_desde, m2_min').eq('publicado', true)
        const zonaAvg: Record<string, number[]> = {}
        ;(allProjs || []).forEach((p: any) => { if (p.alcaldia && p.m2_min > 0) { if (!zonaAvg[p.alcaldia]) zonaAvg[p.alcaldia] = []; zonaAvg[p.alcaldia].push(p.precio_desde / p.m2_min) } })
        const comparisons: typeof zonaComparison = []
        projList.filter(p => p.publicado).forEach((p: any) => {
          if (!p.alcaldia || !p.m2_min || p.m2_min <= 0) return
          const miPrecio = Math.round(p.precio_desde / p.m2_min)
          const zonaPrecios = zonaAvg[p.alcaldia] || []
          const zonaProm = zonaPrecios.length > 0 ? Math.round(zonaPrecios.reduce((a: number, b: number) => a + b, 0) / zonaPrecios.length) : 0
          if (zonaProm > 0) comparisons.push({ alcaldia: p.alcaldia, mi_precio_m2: miPrecio, zona_precio_m2: zonaProm, delta: Math.round((miPrecio - zonaProm) / zonaProm * 100) })
        })
        setZonaComparison(comparisons)
      }

      // Concentración de riesgo por tipología
      if (projIds.length > 0) {
        const { data: udsDetalle } = await supabase.from('unidades').select('recamaras, estado').in('project_id', projIds)
        const tipoMap: Record<string, { total: number, vendidas: number }> = {}
        ;(udsDetalle || []).forEach((u: any) => {
          const key = u.recamaras + ' rec.'
          if (!tipoMap[key]) tipoMap[key] = { total: 0, vendidas: 0 }
          tipoMap[key].total++
          if (u.estado === 'vendido') tipoMap[key].vendidas++
        })
        setTipologia(Object.entries(tipoMap).map(([tipo, v]) => ({ tipo, total: v.total, vendidas: v.vendidas, pct: v.total > 0 ? Math.round(v.vendidas / v.total * 100) : 0 })).sort((a, b) => b.pct - a.pct))
      }

      // Competencia e insights por proyecto
      const compList: typeof competitors = []
      const insList: typeof insights = []
      for (const p of projList.filter(p => p.publicado)) {
        try {
          const [{ data: comps }, { data: ins }] = await Promise.all([
            supabase.rpc('get_project_competitors', { p_project_id: p.id }),
            supabase.rpc('get_competitive_insights', { p_project_id: p.id }),
          ])
          if (comps && comps.length > 0) compList.push({ project: p.nombre, comps: comps as any[] })
          if (ins && ins.length > 0) insList.push({ project: p.nombre, insights: ins as any[] })
        } catch {}
      }
      setCompetitors(compList)
      setInsights(insList)

      // Cargar todos los proyectos para selector manual
      const { data: ap } = await supabase.from('projects').select('id, nombre, alcaldia, colonia').eq('publicado', true).order('nombre')
      setAllProjects(((ap || []) as typeof allProjects).filter(p => !projIds.includes(p.id)))

      setLoading(false)
    }
    load()
  }, [])

  function getEstadoPubStyle(ep: string) {
    if (ep === 'publicado') return { bg: '#DCFCE7', color: '#15803D', label: 'Publicado' }
    if (ep === 'en_revision') return { bg: '#FEF9C3', color: '#A16207', label: 'En revisión' }
    if (ep === 'rechazado') return { bg: '#FEE2E2', color: '#DC2626', label: 'Rechazado' }
    return { bg: 'var(--bg2)', color: 'var(--mid)', label: 'Borrador' }
  }

  if (loading) return (
    <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando dashboard...</div>
  )

  const statCards = [
    { label:'Proyectos activos', value: stats.proyectosPublicados, icon:'🏗️', sub:`${stats.proyectosBorrador} en borrador · ${stats.proyectosRevision} en revisión` },
    { label:'Unidades disponibles', value: stats.unidadesDisponibles, icon:'🏠', sub:`${stats.unidadesVendidas} vendidas · ${stats.unidadesReservadas} reservadas` },
    { label:'Total leads', value: stats.totalLeads, icon:'👥', sub:`${stats.leadsNuevos} nuevos sin atender` },
    { label:'% Vendido', value: stats.totalUnidades > 0 ? Math.round(stats.unidadesVendidas/stats.totalUnidades*100)+'%' : '0%', icon:'📈', sub:`${stats.unidadesVendidas} de ${stats.totalUnidades} unidades` },
  ]

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:'28px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>
          Bienvenido, {devName}
        </div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>
          Resumen de tus proyectos y actividad reciente
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'28px'}}>
        {statCards.map((s,i) => (
          <div key={i} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
              <div style={{fontSize:'11px',color:'var(--mid)',fontWeight:500,textTransform:'uppercase',letterSpacing:'.06em'}}>{s.label}</div>
              <span style={{fontSize:'20px'}}>{s.icon}</span>
            </div>
            <div style={{fontSize:'28px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>{s.value}</div>
            <div style={{fontSize:'11px',color:'var(--dim)'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* CTA si no hay proyectos */}
      {projects.length === 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'2px dashed var(--bd)',padding:'48px',textAlign:'center',marginBottom:'28px'}}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}>🏗️</div>
          <div style={{fontSize:'18px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>
            Aún no tienes proyectos
          </div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'20px'}}>
            Crea tu primer proyecto y empieza a recibir leads de compradores y asesores
          </div>
          <a href="/desarrolladores/proyectos/nuevo" style={{
            display:'inline-flex',alignItems:'center',gap:'6px',
            background:'var(--dk)',color:'#fff',borderRadius:'var(--rp)',
            padding:'10px 24px',fontSize:'13px',fontWeight:500,textDecoration:'none'
          }}>➕ Crear primer proyecto</a>
        </div>
      )}

      {/* PROYECTOS RECIENTES */}
      {projects.length > 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',marginBottom:'28px'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>Mis proyectos</div>
            <a href="/desarrolladores/proyectos/nuevo" style={{
              display:'inline-flex',alignItems:'center',gap:'5px',
              background:'var(--dk)',color:'#fff',borderRadius:'var(--rp)',
              padding:'7px 16px',fontSize:'12px',textDecoration:'none'
            }}>➕ Nuevo proyecto</a>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'var(--bg2)'}}>
                {['Proyecto','Ubicación','Estado','Publicación','Unidades','Leads','Acciones'].map((h,i) => (
                  <th key={i} style={{padding:'10px 16px',textAlign:'left',fontSize:'11px',fontWeight:600,color:'var(--mid)',letterSpacing:'.04em',textTransform:'uppercase',borderBottom:'1px solid var(--bd)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p,idx) => {
                const epStyle = getEstadoPubStyle(p.estado_publicacion || 'borrador')
                return (
                  <tr key={p.id} style={{borderBottom:'1px solid var(--bd2)',background:idx%2===0?'transparent':'rgba(33,45,48,.015)'}}>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>{p.nombre}</div>
                      <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.estado}</div>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'12px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:'var(--bg2)',color:'var(--mid)'}}>{p.estado}</span>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:epStyle.bg,color:epStyle.color}}>{epStyle.label}</span>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'12px',color:'var(--mid)'}}>{p.total_unidades || '—'}</td>
                    <td style={{padding:'12px 16px',fontSize:'12px',color:'var(--mid)'}}>—</td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex',gap:'6px'}}>
                        <a href={`/desarrolladores/proyectos/${p.id}`} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'5px 12px',cursor:'pointer',textDecoration:'none'}}>Editar</a>
                        <a href={`/desarrolladores/proyectos/${p.id}/unidades`} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'transparent',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'5px 12px',cursor:'pointer',textDecoration:'none'}}>Unidades</a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FUNNEL DE INVENTARIO */}
      {stats.totalUnidades > 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'28px'}}>
          <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>📊 Funnel de inventario</div>
          <div style={{height:'28px',background:'var(--bg2)',borderRadius:'var(--rp)',overflow:'hidden',display:'flex',marginBottom:'10px'}}>
            <div style={{height:'100%',background:'#DC2626',width:`${stats.unidadesVendidas/stats.totalUnidades*100}%`}} />
            <div style={{height:'100%',background:'#F59E0B',width:`${stats.unidadesReservadas/stats.totalUnidades*100}%`}} />
            <div style={{height:'100%',background:'#15803D',width:`${stats.unidadesDisponibles/stats.totalUnidades*100}%`}} />
          </div>
          <div style={{display:'flex',gap:'20px',fontSize:'12px'}}>
            <span style={{color:'#DC2626'}}>● Vendidas: {stats.unidadesVendidas} ({Math.round(stats.unidadesVendidas/stats.totalUnidades*100)}%)</span>
            <span style={{color:'#F59E0B'}}>● Reservadas: {stats.unidadesReservadas} ({Math.round(stats.unidadesReservadas/stats.totalUnidades*100)}%)</span>
            <span style={{color:'#15803D'}}>● Disponibles: {stats.unidadesDisponibles} ({Math.round(stats.unidadesDisponibles/stats.totalUnidades*100)}%)</span>
          </div>
        </div>
      )}

      {/* VELOCITY POR PROYECTO */}
      {velocity.length > 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'28px'}}>
          <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>⚡ Velocity de ventas</div>
          <div style={{display:'grid',gap:'8px'}}>
            {velocity.map((v,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',padding:'10px 14px',background:'var(--bg2)',borderRadius:'var(--rs)'}}>
                <div style={{flex:1,fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>{v.project}</div>
                <div style={{textAlign:'center',minWidth:'60px'}}>
                  <div style={{fontSize:'16px',fontWeight:700,color:'var(--dk)'}}>{v.ventas_por_mes}</div>
                  <div style={{fontSize:'9px',color:'var(--mid)'}}>ventas/mes</div>
                </div>
                <div style={{textAlign:'center',minWidth:'50px'}}>
                  <div style={{fontSize:'14px',fontWeight:600,color:v.meses_sold_out<=3?'#DC2626':v.meses_sold_out<=6?'#A16207':'var(--mid)'}}>{v.meses_sold_out<99?v.meses_sold_out+'m':'—'}</div>
                  <div style={{fontSize:'9px',color:'var(--mid)'}}>sold out</div>
                </div>
                <span style={{fontSize:'10px',padding:'3px 8px',borderRadius:'var(--rp)',background:v.tendencia==='acelerando'?'#DCFCE7':v.tendencia==='desacelerando'?'#FEE2E2':'var(--bg2)',color:v.tendencia==='acelerando'?'#15803D':v.tendencia==='desacelerando'?'#DC2626':'var(--mid)'}}>{v.tendencia==='acelerando'?'🔥':v.tendencia==='desacelerando'?'⚠️':'→'} {v.tendencia}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'28px'}}>
        {/* PERFORMANCE VS COMPETENCIA */}
        {zonaComparison.length > 0 && (
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px'}}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>📊 Precio/m² vs zona</div>
            {zonaComparison.map((z,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--bd2)'}}>
                <div style={{fontSize:'12px',color:'var(--dk)',fontWeight:500}}>{z.alcaldia}</div>
                <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                  <span style={{fontSize:'11px',color:'var(--mid)'}}>Tú: ${z.mi_precio_m2.toLocaleString('es-MX')}/m²</span>
                  <span style={{fontSize:'11px',color:'var(--dim)'}}>Zona: ${z.zona_precio_m2.toLocaleString('es-MX')}/m²</span>
                  <span style={{fontSize:'11px',fontWeight:600,padding:'2px 6px',borderRadius:'var(--rp)',background:z.delta<=-5?'#DCFCE7':z.delta>=5?'#FEE2E2':'var(--bg2)',color:z.delta<=-5?'#15803D':z.delta>=5?'#DC2626':'var(--mid)'}}>{z.delta>0?'+':''}{z.delta}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONCENTRACIÓN DE RIESGO */}
        {tipologia.length > 0 && (
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px'}}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>🎯 Concentración por tipología</div>
            {tipologia.map((t,i) => (
              <div key={i} style={{marginBottom:'10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
                  <span style={{color:'var(--dk)',fontWeight:500}}>{t.tipo}</span>
                  <span style={{color:'var(--mid)'}}>{t.vendidas}v / {t.total} total · {t.pct}% absorción</span>
                </div>
                <div style={{height:'8px',background:'var(--bg2)',borderRadius:'4px',overflow:'hidden'}}>
                  <div style={{height:'100%',background:t.pct>=50?'#15803D':t.pct>=25?'#F59E0B':'#DC2626',borderRadius:'4px',width:`${Math.min(t.pct,100)}%`}} />
                </div>
              </div>
            ))}
            {tipologia.length === 1 && (
              <div style={{fontSize:'11px',color:'#A16207',background:'#FEF9C3',padding:'8px 10px',borderRadius:'var(--rs)',marginTop:'8px'}}>⚠️ Concentración alta: todo tu inventario es de un solo tipo</div>
            )}
          </div>
        )}
      </div>

      {/* INSIGHTS COMPETITIVOS */}
      {insights.length > 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'28px'}}>
          <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>💡 Insights competitivos</div>
          <div style={{display:'grid',gap:'8px'}}>
            {insights.map((proj,pi) => (
              proj.insights.map((ins,ii) => (
                <div key={`${pi}-${ii}`} style={{display:'flex',gap:'10px',padding:'10px 14px',borderRadius:'var(--rs)',background:ins.severity==='alta'?'#FEE2E2':ins.severity==='positivo'?'#DCFCE7':ins.severity==='media'?'#FEF9C3':'var(--bg2)',border:`1px solid ${ins.severity==='alta'?'#FECACA':ins.severity==='positivo'?'#BBF7D0':ins.severity==='media'?'#FDE68A':'var(--bd)'}`}}>
                  <span style={{fontSize:'14px'}}>{ins.severity==='alta'?'🚨':ins.severity==='positivo'?'✅':ins.severity==='media'?'⚠️':'ℹ️'}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'12px',fontWeight:500,color:ins.severity==='alta'?'#DC2626':ins.severity==='positivo'?'#15803D':ins.severity==='media'?'#A16207':'var(--dk)',marginBottom:'2px'}}>{proj.project}</div>
                    <div style={{fontSize:'12px',color:'var(--dk)',lineHeight:1.5}}>{ins.message}</div>
                    {ins.data_point && <div style={{fontSize:'11px',color:'var(--mid)',marginTop:'3px'}}>{ins.data_point}</div>}
                  </div>
                </div>
              ))
            ))}
          </div>
        </div>
      )}

      {/* COMPETENCIA POR PROYECTO */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'28px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
          <div>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>🏟️ Análisis de competencia</div>
            <div style={{fontSize:'11px',color:'var(--mid)'}}>IA detecta tu competencia automáticamente o elige manualmente</div>
          </div>
          <div style={{display:'flex',gap:'4px'}}>
            <button onClick={() => setCompMode('auto')} style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'5px 12px',borderRadius:'var(--rp)',border:compMode==='auto'?'none':'1px solid var(--bd)',background:compMode==='auto'?'var(--dk)':'var(--wh)',color:compMode==='auto'?'#fff':'var(--mid)',cursor:'pointer'}}>🤖 IA automática</button>
            <button onClick={() => setCompMode('manual')} style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'5px 12px',borderRadius:'var(--rp)',border:compMode==='manual'?'none':'1px solid var(--bd)',background:compMode==='manual'?'var(--dk)':'var(--wh)',color:compMode==='manual'?'#fff':'var(--mid)',cursor:'pointer'}}>✏️ Elegir manual</button>
          </div>
        </div>

        {/* MODO MANUAL — Selector */}
        {compMode === 'manual' && (
          <div style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'14px',marginBottom:'14px'}}>
            <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'8px'}}>Selecciona proyectos para comparar:</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap',maxHeight:'120px',overflowY:'auto'}}>
              {allProjects.map(p => {
                const selected = manualCompIds.has(p.id)
                return (
                  <button key={p.id} onClick={() => {
                    const next = new Set(manualCompIds)
                    if (selected) next.delete(p.id); else if (next.size < 5) next.add(p.id)
                    setManualCompIds(next)
                  }} style={{fontFamily:'var(--sans)',fontSize:'10px',padding:'4px 10px',borderRadius:'var(--rp)',border:selected?'2px solid var(--gr)':'1px solid var(--bd)',background:selected?'var(--gr-bg)':'var(--wh)',color:selected?'var(--gr)':'var(--mid)',cursor:'pointer'}}>
                    {selected ? '✓ ' : ''}{p.nombre} · {p.colonia}
                  </button>
                )
              })}
            </div>
            {manualCompIds.size > 0 && <div style={{fontSize:'10px',color:'var(--gr)',marginTop:'6px'}}>{manualCompIds.size} seleccionado{manualCompIds.size>1?'s':''} (máx. 5)</div>}
          </div>
        )}

        {/* TABLA DE COMPETENCIA */}
        {competitors.map((proj,pi) => {
          const compsToShow = compMode === 'manual' && manualCompIds.size > 0
            ? proj.comps.filter(c => manualCompIds.has((c as any).competitor_id || ''))
            : proj.comps
          const allComps = compMode === 'manual' && manualCompIds.size > 0 ? proj.comps : proj.comps

          return (
            <div key={pi} style={{marginBottom:pi<competitors.length-1?'16px':'0'}}>
              <div style={{fontSize:'13px',fontWeight:600,color:'var(--dk)',marginBottom:'8px',padding:'6px 0',borderBottom:'1px solid var(--bd)'}}>
                {proj.project}
                {compMode === 'auto' && <span style={{fontSize:'10px',fontWeight:400,color:'var(--mid)',marginLeft:'8px'}}>· {allComps.length} competidores detectados por IA</span>}
              </div>

              {/* RADAR VISUAL — 6 dimensiones */}
              {allComps.length > 0 && (() => {
                const avgPrecio = allComps.reduce((s,c) => s + (c.precio_m2||0), 0) / allComps.length
                const avgAbsorcion = allComps.reduce((s,c) => s + (c.absorcion_pct||0), 0) / allComps.length
                const avgVelocity = allComps.reduce((s,c) => s + (c.ventas_por_mes||0), 0) / allComps.length
                const avgComision = allComps.reduce((s,c) => s + (c.comision_pct||0), 0) / allComps.length
                const dims = [
                  {l:'Precio/m²',comp:`$${Math.round(avgPrecio).toLocaleString('es-MX')}`,better:true},
                  {l:'Absorción',comp:`${Math.round(avgAbsorcion)}%`,better:false},
                  {l:'Velocity',comp:`${avgVelocity.toFixed(1)}/mes`,better:false},
                  {l:'Comisión',comp:`${avgComision.toFixed(1)}%`,better:false},
                  {l:'Competidores',comp:`${allComps.length}`,better:false},
                  {l:'Directos',comp:`${allComps.filter(c=>c.tipo_competencia==='directa').length}`,better:false},
                ]
                return (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'6px',marginBottom:'12px'}}>
                    {dims.map((d,i) => (
                      <div key={i} style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'8px',textAlign:'center'}}>
                        <div style={{fontSize:'13px',fontWeight:600,color:'var(--dk)'}}>{d.comp}</div>
                        <div style={{fontSize:'9px',color:'var(--mid)',marginTop:'2px'}}>{d.l} (prom.)</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                <thead>
                  <tr style={{background:'var(--bg2)'}}>
                    {['Competidor','Tipo','Precio/m²','Absorción','Velocity','Comisión','Similitud'].map(h => (
                      <th key={h} style={{padding:'7px 10px',textAlign:'left',fontWeight:500,color:'var(--mid)',borderBottom:'1px solid var(--bd)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(compMode === 'manual' && manualCompIds.size > 0 ? allComps : allComps).map((c,ci) => (
                    <tr key={ci} style={{borderBottom:'1px solid var(--bd2)'}}>
                      <td style={{padding:'7px 10px',fontWeight:500,color:'var(--dk)'}}>{c.nombre}</td>
                      <td style={{padding:'7px 10px'}}><span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'var(--rp)',background:c.tipo_competencia==='directa'?'#FEE2E2':c.tipo_competencia==='indirecta'?'#FEF9C3':'#EBF0FA',color:c.tipo_competencia==='directa'?'#DC2626':c.tipo_competencia==='indirecta'?'#A16207':'#1A4A9A'}}>{c.tipo_competencia}</span></td>
                      <td style={{padding:'7px 10px',color:'var(--gr)'}}>${c.precio_m2?.toLocaleString('es-MX')}/m²</td>
                      <td style={{padding:'7px 10px',fontWeight:600,color:c.absorcion_pct>=50?'#15803D':c.absorcion_pct>=25?'#A16207':'#DC2626'}}>{c.absorcion_pct}%</td>
                      <td style={{padding:'7px 10px',color:'var(--dk)'}}>{c.ventas_por_mes}/mes</td>
                      <td style={{padding:'7px 10px',color:'var(--mid)'}}>{c.comision_pct}%</td>
                      <td style={{padding:'7px 10px'}}>
                        <div style={{width:'40px',height:'6px',background:'var(--bg2)',borderRadius:'3px',overflow:'hidden'}}>
                          <div style={{height:'100%',background:c.similarity_score>=70?'#DC2626':c.similarity_score>=40?'#F59E0B':'#3B82F6',width:`${c.similarity_score}%`}} />
                        </div>
                        <span style={{fontSize:'9px',color:'var(--dim)'}}>{c.similarity_score}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
        {competitors.length === 0 && <div style={{textAlign:'center',color:'var(--mid)',padding:'20px',fontSize:'12px'}}>La competencia se detecta automáticamente cuando hay proyectos publicados en la misma zona</div>}
      </div>

      {/* ALERTAS DE MERCADO */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',marginBottom:'28px'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--bd)'}}>
          <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>🔔 Alertas recientes</div>
        </div>
        <div style={{padding:'20px',color:'var(--mid)',fontSize:'13px',textAlign:'center'}}>
          Las alertas aparecerán aquí cuando haya actividad en tus proyectos
        </div>
      </div>
    </div>
  )
}
