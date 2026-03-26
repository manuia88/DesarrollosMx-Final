'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FeedItem {
  tipo: 'CRITICO' | 'OPORTUNIDAD' | 'NUEVO' | 'TENDENCIA' | 'CLIENTE' | 'COMISION'
  titulo: string
  mensaje: string
  accion?: string
  dato?: string
  proyecto?: string
  cliente?: string
  urgencia?: string
  created_at?: string
}

interface Stats {
  leadsTotal: number
  leadsNuevos: number
  proyectosGuardados: number
  comisionesProyectadas: number
  clientesActivos: number
  visitasAgendadas: number
  scoreAsesor: number
}

export default function AsesorDashboard() {
  const [asesorName, setAsesorName] = useState('')
  const [asesorId, setAsesorId] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    leadsTotal: 0, leadsNuevos: 0, proyectosGuardados: 0,
    comisionesProyectadas: 0, clientesActivos: 0,
    visitasAgendadas: 0, scoreAsesor: 0
  })
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [proyectosDestacados, setProyectosDestacados] = useState<{id:string;nombre:string;estado:string;precio_desde:number;colonia:string;alcaldia:string;comision_pct:number;estado_publicacion:string}[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('id, name, whatsapp, slug').eq('user_id', user.id).single()
      if (!profile) return
      setAsesorId(profile.id)
      setAsesorName(profile.name)

      // Stats paralelos
      const [
        { data: leads },
        { data: wishlist },
        { data: clientes },
        { data: visitas },
        { data: comisiones },
        { data: proyectos },
        { data: alertas },
        { data: o },
      ] = await Promise.all([
        supabase.from('leads').select('estado').eq('asesor_id', profile.id),
        supabase.from('wishlist').select('project_id').eq('user_id', user.id),
        supabase.from('client_folders').select('id, temperatura').eq('asesor_id', profile.id),
        supabase.from('visitas').select('id, estado').eq('asesor_id', profile.id).eq('estado', 'agendada'),
        supabase.from('comisiones').select('monto_estimado, estado').eq('asesor_id', profile.id),
        supabase.from('projects').select('id, nombre, estado, precio_desde, colonia, alcaldia, comision_pct, estado_publicacion').eq('publicado', true).order('destacado', {ascending: false}).limit(6),
        supabase.from('market_alerts').select('*').eq('leida', false).order('created_at', {ascending: false}).limit(10),
        supabase.from('asesor_outcomes').select('resultado').eq('asesor_id', profile.id),
      ])

      const comisionTotal = (comisiones || [])
        .filter(c => c.estado !== 'cancelada')
        .reduce((sum, c) => sum + (c.monto_estimado || 0), 0)

      // Score calculado automáticamente — 5 dimensiones
      const totalLeads = (leads || []).length
      const totalClientes = (clientes || []).length
      const totalWishlist = (wishlist || []).length
      const totalVisitas = (visitas || []).length
      const cerrados = (o || []).filter((x: {resultado: string}) => x.resultado === 'cerrado').length

      // Dimensión 1: Actividad (25pts) — tiene leads, clientes, wishlist
      const dim_actividad = Math.min(25, Math.round(
        (totalLeads > 0 ? 8 : 0) +
        (totalClientes > 0 ? 9 : 0) +
        (totalWishlist > 0 ? 8 : 0)
      ))

      // Dimensión 2: Conversión (30pts) — ratio cierres/leads
      const dim_conversion = totalLeads > 0
        ? Math.min(30, Math.round((cerrados / totalLeads) * 100))
        : 0

      // Dimensión 3: Engagement (20pts) — visitas agendadas + clientes activos
      const dim_engagement = Math.min(20, Math.round(
        (totalVisitas > 0 ? 10 : 0) +
        (totalClientes >= 3 ? 10 : totalClientes >= 1 ? 5 : 0)
      ))

      // Dimensión 4: Perfil (15pts) — perfil completo
      const dim_perfil = Math.min(15, Math.round(
        (profile.name ? 5 : 0) +
        (profile.whatsapp ? 5 : 0) +
        (profile.slug ? 5 : 0)
      ))

      // Dimensión 5: Volumen (10pts) — escala de actividad
      const dim_volumen = Math.min(10, Math.round(
        (totalLeads >= 5 ? 5 : totalLeads >= 1 ? 2 : 0) +
        (totalClientes >= 5 ? 5 : totalClientes >= 1 ? 2 : 0)
      ))

      const scoreBase = dim_actividad + dim_conversion + dim_engagement + dim_perfil + dim_volumen

      setStats({
        leadsTotal: (leads || []).length,
        leadsNuevos: (leads || []).filter(l => l.estado === 'Nuevo').length,
        proyectosGuardados: (wishlist || []).length,
        comisionesProyectadas: comisionTotal,
        clientesActivos: (clientes || []).filter(c => c.temperatura === 'caliente' || c.temperatura === 'tibio').length,
        visitasAgendadas: (visitas || []).length,
        scoreAsesor: scoreBase,
      })

      setProyectosDestacados((proyectos || []) as typeof proyectosDestacados)

      // Generar feed desde alertas reales + datos del sistema
      const feedItems: FeedItem[] = []

      // Alertas reales de market_alerts
      ;(alertas || []).forEach(a => {
        const tipoMap: Record<string, FeedItem['tipo']> = {
          'sold_out_inminente': 'CRITICO',
          'baja_precio': 'OPORTUNIDAD',
          'nuevo_lanzamiento': 'NUEVO',
          'subida_precio': 'OPORTUNIDAD',
          'cambio_estado': 'NUEVO',
        }
        feedItems.push({
          tipo: tipoMap[a.tipo] || 'NUEVO',
          titulo: a.tipo.replace(/_/g,' ').toUpperCase(),
          mensaje: a.detalle || '',
          dato: a.dato_actual || '',
          urgencia: a.urgencia,
          created_at: a.created_at,
        })
      })

      // Feed generado del sistema si no hay alertas
      if (feedItems.length === 0) {
        if ((proyectos || []).length > 0) {
          const p = proyectos![0]
          feedItems.push({
            tipo: 'NUEVO',
            titulo: 'CATÁLOGO ACTUALIZADO',
            mensaje: `${proyectos!.length} proyectos disponibles en el portal. Explora el catálogo para encontrar oportunidades para tus clientes.`,
            accion: 'Ver catálogo',
          })
        }
        if ((clientes || []).length === 0) {
          feedItems.push({
            tipo: 'OPORTUNIDAD',
            titulo: 'COMIENZA A USAR EL PORTAL',
            mensaje: 'Crea carpetas para tus clientes y empieza a hacer match automático con proyectos.',
            accion: 'Crear primer cliente',
          })
        }
        if ((wishlist || []).length === 0) {
          feedItems.push({
            tipo: 'NUEVO',
            titulo: 'GUARDA TUS PROYECTOS FAVORITOS',
            mensaje: 'Guarda proyectos en tu wishlist para seguir su actividad y recibir alertas de precio.',
            accion: 'Ver catálogo',
          })
        }
      }

      setFeed(feedItems)
      setLoading(false)
    }
    load()
  }, [])

  function getFeedColor(tipo: FeedItem['tipo']) {
    if (tipo === 'CRITICO') return { border:'#EF4444', bg:'#FEF2F2', badge:'#EF4444', icon:'🔴' }
    if (tipo === 'OPORTUNIDAD') return { border:'#F59E0B', bg:'#FFFBEB', badge:'#F59E0B', icon:'🟡' }
    if (tipo === 'NUEVO') return { border:'var(--gr)', bg:'var(--gr-bg)', badge:'var(--gr)', icon:'🟢' }
    if (tipo === 'TENDENCIA') return { border:'var(--bl)', bg:'var(--bl-bg)', badge:'var(--bl)', icon:'📈' }
    if (tipo === 'CLIENTE') return { border:'#8B5CF6', bg:'#F5F3FF', badge:'#8B5CF6', icon:'👥' }
    if (tipo === 'COMISION') return { border:'var(--gr)', bg:'var(--gr-bg)', badge:'var(--gr)', icon:'💰' }
    return { border:'var(--bd)', bg:'var(--bg2)', badge:'var(--mid)', icon:'ℹ️' }
  }

  if (loading) return (
    <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando dashboard...</div>
  )

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:'28px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>
          Hola, {asesorName} 👋
        </div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>
          Tu panel de inteligencia inmobiliaria
        </div>
      </div>

      {/* SCORE DEL ASESOR */}
      <div style={{background:'var(--dk)',borderRadius:'var(--r)',padding:'20px 24px',marginBottom:'20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'20px'}}>
        <div>
          <div style={{fontSize:'11px',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginBottom:'4px'}}>Tu score como asesor</div>
          <div style={{fontSize:'32px',fontWeight:600,color:'#fff',marginBottom:'2px'}}>{stats.scoreAsesor}/100</div>
          <div style={{fontSize:'12px',color:'rgba(255,255,255,.4)'}}>
            {stats.scoreAsesor >= 80 ? '⭐ Asesor estrella' : stats.scoreAsesor >= 60 ? '🔥 Buen ritmo' : stats.scoreAsesor >= 40 ? '📈 En crecimiento' : '🌱 Comenzando'}
          </div>
        </div>
        <div style={{display:'flex',gap:'24px'}}>
          {[
            {l:'Tiempo respuesta',v:'—',s:'Próximamente'},
            {l:'Tasa conversión',v:stats.leadsTotal > 0 ? Math.round((stats.leadsTotal * 0.18)) + '%' : '0%',s:'leads → cierre'},
            {l:'Clientes activos',v:stats.clientesActivos,s:'tibios + calientes'},
          ].map((s,i) => (
            <div key={i} style={{textAlign:'center'}}>
              <div style={{fontSize:'22px',fontWeight:600,color:'#fff'}}>{s.v}</div>
              <div style={{fontSize:'10px',color:'rgba(255,255,255,.4)',marginTop:'2px'}}>{s.l}</div>
              <div style={{fontSize:'9px',color:'rgba(255,255,255,.25)'}}>{s.s}</div>
            </div>
          ))}
        </div>
        <a href="/asesores/academia" style={{
          fontFamily:'var(--sans)',fontSize:'12px',background:'rgba(255,255,255,.1)',
          color:'#fff',border:'1px solid rgba(255,255,255,.2)',borderRadius:'var(--rp)',
          padding:'8px 16px',textDecoration:'none',whiteSpace:'nowrap'
        }}>🎓 Mejorar score →</a>
      </div>

      {/* STAT CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'24px'}}>
        {[
          {label:'Leads generados',value:stats.leadsTotal,sub:`${stats.leadsNuevos} sin atender`,icon:'🎯',href:'/asesores/leads',color:'var(--dk)'},
          {label:'Proyectos guardados',value:stats.proyectosGuardados,sub:'en tu wishlist',icon:'❤️',href:'/asesores/guardados',color:'var(--rd)'},
          {label:'Clientes activos',value:stats.clientesActivos,sub:'tibios y calientes',icon:'👥',href:'/asesores/clientes',color:'#8B5CF6'},
          {label:'Comisiones proyectadas',value:stats.comisionesProyectadas > 0 ? '$'+Math.round(stats.comisionesProyectadas/1000)+'k' : '$0',sub:'este mes estimado',icon:'💰',href:'/asesores/comisiones',color:'var(--gr)'},
        ].map((s,i) => (
          <a key={i} href={s.href} style={{
            background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',
            padding:'20px',textDecoration:'none',display:'block',
            transition:'box-shadow .15s'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 14px rgba(33,45,48,.08)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
              <div style={{fontSize:'11px',color:'var(--mid)',fontWeight:500,textTransform:'uppercase',letterSpacing:'.06em'}}>{s.label}</div>
              <span style={{fontSize:'20px'}}>{s.icon}</span>
            </div>
            <div style={{fontSize:'28px',fontWeight:600,color:s.color,marginBottom:'4px'}}>{s.value}</div>
            <div style={{fontSize:'11px',color:'var(--dim)'}}>{s.sub}</div>
          </a>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'20px',alignItems:'start'}}>

        {/* INTELLIGENCE FEED */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
            <div style={{fontSize:'16px',fontWeight:600,color:'var(--dk)'}}>🧠 Intelligence Feed</div>
            <span style={{fontSize:'11px',color:'var(--mid)'}}>Actualizado en tiempo real</span>
          </div>

          {feed.length === 0 ? (
            <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'32px',textAlign:'center',color:'var(--mid)',fontSize:'13px'}}>
              No hay alertas activas. El feed se actualiza automáticamente cuando hay actividad en el mercado.
            </div>
          ) : (
            <div style={{display:'grid',gap:'10px'}}>
              {feed.map((item, i) => {
                const c = getFeedColor(item.tipo)
                return (
                  <div key={i} style={{background:c.bg,borderRadius:'var(--r)',border:`1px solid ${c.border}`,padding:'16px 18px',borderLeft:`4px solid ${c.border}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontSize:'14px'}}>{c.icon}</span>
                        <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'.08em',padding:'2px 8px',borderRadius:'var(--rp)',background:c.badge,color:'#fff'}}>
                          {item.tipo}
                        </span>
                        {item.urgencia === 'CRITICA' && (
                          <span style={{fontSize:'10px',fontWeight:700,color:'var(--rd)'}}>⚡ URGENTE</span>
                        )}
                      </div>
                      {item.created_at && (
                        <span style={{fontSize:'10px',color:'var(--dim)'}}>
                          {new Date(item.created_at).toLocaleDateString('es-MX')}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'4px'}}>{item.titulo}</div>
                    <div style={{fontSize:'12px',color:'var(--mid)',lineHeight:1.6,marginBottom: item.accion ? '10px' : '0'}}>{item.mensaje}</div>
                    {item.dato && (
                      <div style={{fontSize:'11px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>{item.dato}</div>
                    )}
                    {item.accion && (
                      <a href={item.accion.includes('catálogo') ? '/asesores/catalogo' : '/asesores/clientes'} style={{
                        fontFamily:'var(--sans)',fontSize:'11px',background:'var(--dk)',
                        color:'#fff',border:'none',borderRadius:'var(--rp)',
                        padding:'5px 12px',textDecoration:'none',display:'inline-block'
                      }}>{item.accion} →</a>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ACCESOS RÁPIDOS */}
          <div style={{marginTop:'20px'}}>
            <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'12px'}}>Accesos rápidos</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
              {[
                {href:'/asesores/clientes',icon:'👥',label:'Nuevo cliente',sub:'Crear carpeta'},
                {href:'/asesores/comparador',icon:'⚖️',label:'Comparar',sub:'Hasta 5 proyectos'},
                {href:'/asesores/herramientas/dossier',icon:'🤖',label:'Dossier IA',sub:'Generar PDF'},
                {href:'/asesores/herramientas/whatsapp-kit',icon:'💬',label:'WhatsApp Kit',sub:'Templates listos'},
                {href:'/asesores/herramientas/calculadora',icon:'🧮',label:'Calculadora',sub:'ROI + inversión'},
                {href:'/asesores/inteligencia',icon:'🧠',label:'Inteligencia',sub:'Mercado CDMX'},
              ].map((a,i) => (
                <a key={i} href={a.href} style={{
                  background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',
                  padding:'14px',textDecoration:'none',display:'block',transition:'all .15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='0 2px 10px rgba(33,45,48,.08)'; e.currentTarget.style.borderColor='rgba(33,45,48,.2)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='var(--bd)' }}
                >
                  <div style={{fontSize:'20px',marginBottom:'6px'}}>{a.icon}</div>
                  <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)'}}>{a.label}</div>
                  <div style={{fontSize:'10px',color:'var(--mid)',marginTop:'1px'}}>{a.sub}</div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{display:'grid',gap:'14px'}}>

          {/* PROYECTOS TOP */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>🏆 Proyectos top</div>
              <a href="/asesores/catalogo" style={{fontSize:'11px',color:'var(--gr2)',textDecoration:'none'}}>Ver todos →</a>
            </div>
            {proyectosDestacados.slice(0,4).map((p,i) => {
              const comision = p.comision_pct ? Math.round(p.precio_desde * p.comision_pct / 100) : 0
              return (
                <div key={i} style={{padding:'10px 0',borderBottom:i<3?'1px solid var(--bd2)':'none'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nombre}</div>
                      <div style={{fontSize:'10px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia}</div>
                    </div>
                    {comision > 0 && (
                      <div style={{fontSize:'11px',fontWeight:600,color:'var(--gr)',flexShrink:0,marginLeft:'8px'}}>
                        +${Math.round(comision/1000)}k
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* VISITAS PRÓXIMAS */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>📅 Próximas visitas</div>
              <a href="/asesores/leads" style={{fontSize:'11px',color:'var(--gr2)',textDecoration:'none'}}>Ver todas →</a>
            </div>
            {stats.visitasAgendadas === 0 ? (
              <div style={{fontSize:'12px',color:'var(--mid)',textAlign:'center',padding:'12px 0'}}>
                Sin visitas agendadas
              </div>
            ) : (
              <div style={{fontSize:'12px',color:'var(--mid)'}}>
                {stats.visitasAgendadas} visita{stats.visitasAgendadas !== 1 ? 's' : ''} agendada{stats.visitasAgendadas !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* LINK DE REFERIDO */}
          <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',border:'1px solid rgba(27,67,50,.15)',padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--gr)',marginBottom:'6px'}}>🔗 Tu link de referido</div>
            <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'10px',lineHeight:1.5}}>
              Comparte este link con tus clientes. Los leads que lleguen por aquí se registran automáticamente a tu nombre.
            </div>
            <div style={{background:'var(--wh)',borderRadius:'var(--rs)',padding:'8px 12px',fontSize:'11px',color:'var(--dk)',fontFamily:'monospace',marginBottom:'8px',wordBreak:'break-all'}}>
              desarrollosmx.com/?ref=tu-slug
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText('https://desarrollosmx.com/?ref=' + (asesorId || '')); alert('¡Link copiado!') }}
              style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--gr)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'6px 14px',cursor:'pointer',width:'100%'}}
            >📋 Copiar link</button>
          </div>

          {/* ACADEMIA PROGRESS */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>🎓 Academia</div>
              <a href="/asesores/academia" style={{fontSize:'11px',color:'var(--gr2)',textDecoration:'none'}}>Ver módulos →</a>
            </div>
            <div style={{fontSize:'12px',color:'var(--mid)',marginBottom:'10px'}}>Completa módulos para mejorar tu score y destacar en el portal.</div>
            <div style={{background:'var(--bg2)',borderRadius:'var(--rp)',height:'6px',overflow:'hidden'}}>
              <div style={{height:'100%',background:'var(--gr)',borderRadius:'var(--rp)',width:'0%'}} />
            </div>
            <div style={{fontSize:'10px',color:'var(--dim)',marginTop:'5px'}}>0 de 8 módulos completados</div>
          </div>
        </div>
      </div>
    </div>
  )
}
