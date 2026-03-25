'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  nombre: string
  estado: string
  colonia: string
  alcaldia: string
  calle: string
  cp?: string
  descripcion?: string
  precio_desde: number
  precio_hasta?: number
  entrega_quarter?: string
  entrega_year?: number
  m2_min?: number
  m2_max?: number
  recamaras_min?: number
  recamaras_max?: number
  cajones_min?: number
  cajones_max?: number
  plusvalia_pct?: number
  etapa_actual?: string
  etapas?: {name: string; date: string}[]
  plan_pagos?: {enganche_pct: number; mensualidades_num: number}
  historial_precios?: {date: string; precio: number}[]
  amenidades?: string[]
  destacado?: boolean
  desarrolladoras?: {
    nombre: string
    logo_url?: string
    verificacion_constitucion: boolean
    verificacion_antecedentes: boolean
    verificacion_profeco: boolean
    proyectos_entregados: number
    unidades_vendidas: number
    ano_fundacion: number
  }
  fotos?: {url: string; is_hero: boolean; orden: number}[]
}

export default function DetailView({
  projectId,
  onNavigate,
}: {
  projectId?: string
  onNavigate: (view: string, id?: string) => void
}) {
  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState('desc')
  const [roiVal, setRoiVal] = useState(8)
  const [engancheVal, setEngancheVal] = useState(20)
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!projectId) return
    supabase
      .from('projects')
      .select(`*, desarrolladoras(nombre, logo_url, verificacion_constitucion, verificacion_antecedentes, verificacion_profeco, proyectos_entregados, unidades_vendidas, ano_fundacion), fotos(url, is_hero, orden)`)
      .eq('id', projectId)
      .single()
      .then(({ data }) => { if (data) setProject(data as Project) })
  }, [projectId])

  if (!project) return (
    <div style={{padding:'80px 40px',textAlign:'center',fontFamily:'var(--sans)',color:'var(--mid)'}}>
      Cargando proyecto...
    </div>
  )

  const etapas = project.etapas || []
  const etapaActual = project.etapa_actual || ''
  const historial = project.historial_precios || []
  const amenidades = project.amenidades || []
  const planPagos = project.plan_pagos || {enganche_pct:20, mensualidades_num:18}
  const dev = project.desarrolladoras

  // Calculadora ROI
  const roiValorFuturo = Math.round(project.precio_desde * (1 + roiVal/100 * 1.2))
  const roiGanancia = roiValorFuturo - project.precio_desde

  // Calculadora pagos
  const enganche = Math.round(project.precio_desde * engancheVal / 100)
  const resto = project.precio_desde - enganche
  const mensualidades = planPagos.mensualidades_num > 0
    ? Math.round(resto * 0.4 / planPagos.mensualidades_num)
    : 0
  const pagoFinal = Math.round(resto * (planPagos.mensualidades_num > 0 ? 0.6 : 1))

  const tabStyle = (id: string) => ({
    fontSize:'13px',
    padding:'10px 0',
    marginRight:'22px',
    color: activeTab === id ? 'var(--dk)' : 'var(--mid)',
    marginBottom:'-1px',
    cursor:'pointer',
    fontWeight: activeTab === id ? 500 : 400,
    background:'transparent',
    borderTop:'none',
    borderLeft:'none',
    borderRight:'none',
    borderBottomWidth:'2px',
    borderBottomStyle:'solid' as const,
    borderBottomColor: activeTab === id ? 'var(--dk)' : 'transparent',
    fontFamily:'var(--sans)',
    whiteSpace:'nowrap' as const
  })

  const faqs = [
    {id:'q1',q:'¿Cómo funciona el proceso de compra en preventa?',a:'El proceso inicia con un apartado que reserva tu unidad. Se firma contrato de promesa de compraventa y se acuerda el plan de pagos: enganche, mensualidades durante construcción y pago final al escriturar.'},
    {id:'q2',q:'¿Puedo usar crédito hipotecario?',a:'Sí. INFONAVIT, FOVISSSTE y bancos aceptan créditos para preventa. El crédito se formaliza en la entrega. Durante construcción puedes usar recursos propios o crédito puente.'},
    {id:'q3',q:'¿Qué garantías tengo si la entrega se retrasa?',a:'El contrato incluye penalizaciones por retraso. ARQ Capital Group usa fiduciaria que protege los recursos del comprador durante todo el proceso de construcción.'},
    {id:'q4',q:'¿Los precios incluyen estacionamiento y bodega?',a:'Los cajones están incluidos en prototipos B, C y PH. La bodega tiene costo adicional de $120,000 MXN. El prototipo A puede adquirir cajón por separado.'},
    {id:'q5',q:'¿Cuánto son los gastos de escrituración en CDMX?',a:'En CDMX representan 5–7% del valor del inmueble: ISAI, honorarios notariales, derechos de registro y avalúo catastral.'},
  ]

  return (
    <div>
      {/* BREADCRUMB */}
      <div
        onClick={() => onNavigate('explorar')}
        style={{
          padding:'10px 40px',background:'var(--wh)',
          borderBottom:'1px solid var(--bd)',fontSize:'12px',
          color:'var(--mid)',display:'flex',alignItems:'center',
          gap:'5px',cursor:'pointer',transition:'color .15s'
        }}
        onMouseEnter={e => e.currentTarget.style.color='var(--dk)'}
        onMouseLeave={e => e.currentTarget.style.color='var(--mid)'}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        Regresar a la búsqueda · {dev?.nombre} · {project.nombre}
      </div>

      {/* STICKY TOOLBAR */}
      <div style={{
        background:'var(--wh)',borderBottom:'1px solid var(--bd)',
        padding:'11px 40px',display:'flex',alignItems:'center',
        justifyContent:'space-between',gap:'16px',
        position:'sticky',top:'60px',zIndex:400
      }}>
        <div>
          <div style={{fontSize:'16px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>
            {dev?.nombre} · {project.nombre}
          </div>
          <div style={{display:'flex',gap:'12px',fontSize:'11px',color:'var(--mid)'}}>
            {project.m2_min && <span>📐 {project.m2_min}–{project.m2_max} m²</span>}
            {project.recamaras_min && <span>🛏 {project.recamaras_min}–{project.recamaras_max} rec.</span>}
            <span>📍 {project.colonia}, {project.alcaldia}</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'19px',fontWeight:500,color:'var(--gr)'}}>
            ${project.precio_desde.toLocaleString('es-MX')} MXN
          </span>
          <span style={{fontSize:'10px',color:'var(--mid)',background:'var(--bg2)',padding:'2px 8px',borderRadius:'4px',marginLeft:'7px'}}>
            {project.estado}
          </span>
        </div>
        <div style={{display:'flex',gap:'7px',flexShrink:0}}>
          <button style={{
            fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',
            color:'var(--dk)',border:'1px solid rgba(33,45,48,.3)',
            borderRadius:'var(--rp)',padding:'7px 16px',cursor:'pointer'
          }}>Agendar visita</button>
          <button
            onClick={() => setActiveTab('precios')}
            style={{
              fontFamily:'var(--sans)',fontSize:'12px',background:'var(--dk)',
              color:'#fff',border:'none',borderRadius:'var(--rp)',
              padding:'8px 18px',cursor:'pointer'
            }}
          >¡Ver precios! ›</button>
        </div>
      </div>

      {/* GALERÍA */}
      <div style={{
        display:'grid',gridTemplateColumns:'1fr 184px',
        gridTemplateRows:'222px 222px',gap:'3px',background:'var(--bd)'
      }}>
        <div style={{
          gridRow:'span 2',display:'flex',alignItems:'center',
          justifyContent:'center',position:'relative',cursor:'pointer',
          background:'linear-gradient(145deg,#0d2318,#1a5c3a)'
        }}>
          <span style={{fontSize:'52px',opacity:.1}}>🏙️</span>
          <div style={{position:'absolute',top:'12px',left:'12px',display:'flex',gap:'5px'}}>
            {project.destacado && (
              <span style={{fontSize:'10px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'rgba(255,255,255,.9)',color:'var(--dk)'}}>⭐ Destacado</span>
            )}
            <span style={{fontSize:'10px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'rgba(255,255,255,.9)',color:'#2a5cb0'}}>{project.estado}</span>
          </div>
          <button style={{
            position:'absolute',bottom:'12px',right:'12px',
            background:'rgba(255,255,255,.88)',border:'none',borderRadius:'6px',
            padding:'5px 10px',fontSize:'11px',fontWeight:500,cursor:'pointer',
            fontFamily:'var(--sans)'
          }}>📷 Ver todas las fotos</button>
        </div>
        {[
          {bg:'linear-gradient(135deg,#1a2535,#2a4a6a)',em:'🛋️'},
          {bg:'linear-gradient(135deg,#251535,#4a2a6a)',em:'🚿'},
          {bg:'linear-gradient(135deg,#2a1510,#5a2a1a)',em:'🏗️'},
          {bg:'linear-gradient(135deg,#201408,#5a3a10)',em:'🌿',more:true},
        ].map((t,i) => (
          <div key={i} style={{
            display:'flex',alignItems:'center',justifyContent:'center',
            position:'relative',cursor:'pointer',background:t.bg
          }}>
            <span style={{fontSize:'24px',opacity:.15}}>{t.em}</span>
            {t.more && (
              <div style={{
                position:'absolute',inset:0,background:'rgba(0,0,0,.44)',
                display:'flex',alignItems:'center',justifyContent:'center',
                color:'#fff',fontSize:'12px',fontWeight:500
              }}>+4 fotos</div>
            )}
          </div>
        ))}
      </div>

      {/* BODY */}
      <div style={{
        maxWidth:'1200px',margin:'0 auto',padding:'32px 40px 80px',
        display:'grid',gridTemplateColumns:'1fr 340px',gap:'48px',alignItems:'start'
      }}>

        {/* COLUMNA PRINCIPAL */}
        <div>
          <div style={{fontSize:'10px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--mid)',marginBottom:'7px'}}>
            {project.colonia}, {project.alcaldia} · CDMX
          </div>
          <h1 style={{fontSize:'26px',fontWeight:600,color:'var(--dk)',lineHeight:1.1,marginBottom:'5px'}}>
            {dev?.nombre} · {project.nombre}
          </h1>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'12px'}}>
            📍 {project.calle}, Col. {project.colonia}, CP {project.cp}
          </div>
          <div style={{display:'flex',gap:'5px',marginBottom:'22px',flexWrap:'wrap'}}>
            <span style={{fontSize:'11px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'var(--gr-bg)',color:'var(--gr)'}}>✓ Verificado</span>
            <span style={{fontSize:'11px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'var(--bl-bg)',color:'var(--bl)'}}>{project.estado}</span>
            {project.destacado && <span style={{fontSize:'11px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'var(--bg2)',color:'var(--dk)'}}>⭐ Destacado</span>}
          </div>

          {/* TABS */}
          <div style={{
            position:'sticky',top:'118px',zIndex:300,background:'var(--wh)',
            borderBottom:'1px solid var(--bd)',margin:'0 -40px',padding:'0 40px',
            display:'flex',marginBottom:'24px',overflowX:'auto',scrollbarWidth:'none'
          }}>
            {[
              {id:'desc',label:'Descripción'},
              {id:'precios',label:'Lista de precios',new:true},
              {id:'avance',label:'Avance de obra'},
              {id:'am',label:'Amenidades'},
              {id:'loc',label:'Localización'},
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>
                {t.label}{t.new && (
                  <span style={{
                    fontSize:'9px',fontWeight:600,letterSpacing:'.06em',
                    textTransform:'uppercase',background:'var(--am-bg)',
                    color:'var(--am)',border:'1px solid #FCD34D',
                    padding:'1px 5px',borderRadius:'3px',marginLeft:'5px',
                    verticalAlign:'middle'
                  }}>NUEVO</span>
                )}
              </button>
            ))}
          </div>

          {/* TAB: DESCRIPCIÓN */}
          {activeTab === 'desc' && (
            <div>
              {/* SPECS */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'18px'}}>
                {[
                  {i:'📐',v:`${project.m2_min}–${project.m2_max}`,l:'m² privados'},
                  {i:'🛏',v:`${project.recamaras_min}–${project.recamaras_max}`,l:'Recámaras'},
                  {i:'🚗',v:`${project.cajones_min}–${project.cajones_max}`,l:'Cajones'},
                  {i:'🗓',v:project.entrega_quarter?`${project.entrega_quarter} ${project.entrega_year}`:'—',l:'Entrega est.'},
                ].map((s,i) => (
                  <div key={i} style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'12px',textAlign:'center'}}>
                    <span style={{fontSize:'16px',display:'block',marginBottom:'3px'}}>{s.i}</span>
                    <span style={{fontSize:'15px',fontWeight:600,display:'block',color:'var(--dk)',marginBottom:'1px'}}>{s.v}</span>
                    <span style={{fontSize:'10px',color:'var(--mid)'}}>{s.l}</span>
                  </div>
                ))}
              </div>

              {/* DESCRIPCIÓN */}
              <p style={{fontSize:'13px',lineHeight:1.8,color:'var(--mid)',marginBottom:'20px'}}>
                {project.descripcion}
              </p>

              {/* TIMELINE */}
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'7px'}}>Etapa del proyecto</div>
              <div style={{display:'flex',background:'var(--bg2)',borderRadius:'var(--r)',padding:'14px 16px',marginBottom:'18px'}}>
                {etapas.map((e, i) => {
                  const isDone = etapas.findIndex(x => x.name === etapaActual) > i
                  const isAct = e.name === etapaActual
                  return (
                    <div key={i} style={{flex:1,textAlign:'center',position:'relative'}}>
                      {i < etapas.length - 1 && (
                        <div style={{
                          position:'absolute',top:'8px',left:'50%',right:'-50%',
                          height:'2px',background: isDone ? 'var(--gr)' : 'var(--bd)'
                        }} />
                      )}
                      <div style={{
                        width:'18px',height:'18px',borderRadius:'50%',
                        margin:'0 auto 6px',position:'relative',zIndex:1,
                        background: isDone ? 'var(--gr)' : isAct ? 'var(--bg2)' : 'var(--bd)',
                        border: isAct ? '3px solid var(--gr)' : '3px solid var(--bg2)',
                        boxShadow: isAct ? '0 0 0 3px rgba(27,67,50,.15)' : 'none'
                      }} />
                      <div style={{fontSize:'9px',color: isAct ? 'var(--gr)' : isDone ? 'var(--dk)' : 'var(--mid)',fontWeight: isAct ? 500 : 400}}>{e.name}</div>
                      <div style={{fontSize:'8px',color:'var(--dim)'}}>{e.date}</div>
                    </div>
                  )
                })}
              </div>

              {/* HISTORIAL PRECIO */}
              {historial.length > 0 && (
                <>
                  <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'9px'}}>Historial de precio</div>
                  <div style={{height:'3px',background:'var(--bd)',borderRadius:'2px',marginBottom:'10px',position:'relative'}}>
                    <div style={{position:'absolute',left:0,top:0,height:'100%',background:'var(--gr)',borderRadius:'2px',width:'38%'}} />
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'7px'}}>
                    {[...historial, {date:'Hoy',precio:project.precio_desde}].map((h,i,arr) => (
                      <div key={i} style={{textAlign:'center'}}>
                        <div style={{width:'7px',height:'7px',borderRadius:'50%',background: i===arr.length-1 ? 'var(--gr)' : 'var(--bd)',margin:'0 auto 3px'}} />
                        <div style={{fontSize:'10px',color: i===arr.length-1 ? 'var(--gr)' : 'var(--mid)',fontWeight: i===arr.length-1 ? 500 : 400}}>
                          ${(h.precio/1000000).toFixed(1)}M
                        </div>
                        <div style={{fontSize:'9px',color:'var(--dim)'}}>{h.date}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--gr)',marginBottom:'18px'}}>
                    ↑ +{Math.round((project.precio_desde/historial[0].precio-1)*100)}% desde lanzamiento en preventa
                  </div>
                </>
              )}

              {/* DESARROLLADORA */}
              {dev && (
                <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px 18px',marginBottom:'18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'11px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'7px',background:'var(--dk)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>🏗️</div>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'1px'}}>{dev.nombre}</div>
                      <div style={{fontSize:'11px',color:'var(--mid)'}}>Desarrolladora · CDMX · desde {dev.ano_fundacion}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'11px'}}>
                    {dev.verificacion_constitucion && <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:'var(--wh)',border:'1px solid var(--bd)',color:'var(--dk)'}}>✓ Constitución legal verificada</span>}
                    {dev.verificacion_antecedentes && <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:'var(--wh)',border:'1px solid var(--bd)',color:'var(--dk)'}}>✓ Sin antecedentes judiciales</span>}
                    {dev.verificacion_profeco && <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:'var(--wh)',border:'1px solid var(--bd)',color:'var(--dk)'}}>✓ Sin quejas PROFECO</span>}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px'}}>
                    {[
                      {v:dev.proyectos_entregados,l:'Proyectos entregados'},
                      {v:dev.unidades_vendidas,l:'Unidades vendidas'},
                      {v:`${new Date().getFullYear()-dev.ano_fundacion} años`,l:'De experiencia'},
                    ].map((s,i) => (
                      <div key={i} style={{background:'var(--wh)',borderRadius:'var(--rs)',padding:'9px',textAlign:'center'}}>
                        <span style={{fontSize:'15px',fontWeight:600,color:'var(--dk)',display:'block'}}>{s.v}</span>
                        <span style={{fontSize:'9px',color:'var(--mid)'}}>{s.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHARE */}
              <div style={{border:'1px solid var(--bd)',borderRadius:'var(--r)',padding:'14px 16px',marginBottom:'18px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}>
                <div>
                  <div style={{fontSize:'12px',color:'var(--dk)',lineHeight:1.55}}>Comparte con tu asesor</div>
                  <div style={{fontSize:'11px',color:'var(--mid)',marginTop:'1px'}}>El link incluye toda la información del proyecto</div>
                </div>
                <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                  <button
                    onClick={() => alert('Link copiado al portapapeles')}
                    style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'6px 12px',borderRadius:'var(--rp)',cursor:'pointer',background:'var(--bg2)',color:'var(--dk)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:'5px'}}
                  >📋 Copiar link</button>
                  <button style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'6px 12px',borderRadius:'var(--rp)',cursor:'pointer',background:'#25D366',color:'#fff',border:'none',display:'flex',alignItems:'center',gap:'5px'}}>
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* FAQ */}
              <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'9px'}}>Preguntas frecuentes</div>
              {faqs.map(faq => (
                <div key={faq.id} style={{borderBottom:'1px solid var(--bd2)'}}>
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    style={{
                      display:'flex',justifyContent:'space-between',alignItems:'center',
                      padding:'11px 0',cursor:'pointer',fontSize:'13px',color:'var(--dk)',
                      background:'none',border:'none',width:'100%',textAlign:'left',
                      fontFamily:'var(--sans)',lineHeight:1.4
                    }}
                  >
                    {faq.q}
                    <span style={{
                      fontSize:'15px',color:'var(--mid)',
                      transform: openFaq === faq.id ? 'rotate(45deg)' : 'none',
                      transition:'transform .2s',flexShrink:0,marginLeft:'8px'
                    }}>+</span>
                  </button>
                  {openFaq === faq.id && (
                    <div style={{fontSize:'12px',color:'var(--mid)',lineHeight:1.7,paddingBottom:'11px'}}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB: LISTA DE PRECIOS */}
          {activeTab === 'precios' && (
            <div style={{padding:'20px 0',color:'var(--mid)',fontSize:'13px'}}>
              Lista de precios — Fase 4
            </div>
          )}

          {/* TAB: AVANCE DE OBRA */}
          {activeTab === 'avance' && (
            <div>
              <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px 18px',marginBottom:'18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'10px'}}>
                  <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>Avance de construcción</div>
                  <div style={{fontSize:'11px',color:'var(--mid)'}}>Actualizado Mar 2025</div>
                </div>
                <div style={{display:'flex',alignItems:'baseline',gap:'6px',marginBottom:'12px'}}>
                  <span style={{fontSize:'20px',fontWeight:600,color:'var(--gr)'}}>65%</span>
                  <span style={{fontSize:'11px',color:'var(--mid)'}}>completado</span>
                </div>
                <div style={{height:'5px',background:'rgba(33,45,48,.1)',borderRadius:'3px',overflow:'hidden',marginBottom:'12px'}}>
                  <div style={{height:'100%',background:'var(--gr)',borderRadius:'3px',width:'65%'}} />
                </div>
                <div style={{display:'flex'}}>
                  {etapas.map((e,i) => {
                    const isDone = etapas.findIndex(x => x.name === etapaActual) > i
                    const isAct = e.name === etapaActual
                    return (
                      <div key={i} style={{flex:1,textAlign:'center',fontSize:'8px',color:'var(--mid)',position:'relative',paddingTop:'13px'}}>
                        <div style={{position:'absolute',top:'3px',left:0,right:0,height:'2px',background: isDone ? 'var(--gr)' : 'rgba(33,45,48,.1)'}} />
                        <div style={{
                          position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',
                          width:'7px',height:'7px',borderRadius:'50%',
                          background: isDone ? 'var(--gr)' : isAct ? 'var(--bg2)' : 'rgba(33,45,48,.15)',
                          border: isAct ? '2px solid var(--gr)' : '2px solid var(--bg2)',
                          boxShadow: isAct ? '0 0 0 2px rgba(27,67,50,.18)' : 'none'
                        }} />
                        {e.name}
                      </div>
                    )
                  })}
                </div>
              </div>
              {[
                {d:'Mar 2025',t:'Estructura nivel 6 completada',s:'Se terminó la losa del piso 6. Avance de estructura al 75%.'},
                {d:'Ene 2025',t:'Instalaciones hidrosanitarias',s:'Completadas instalaciones de agua y drenaje en niveles 1-4.'},
                {d:'Nov 2024',t:'Inicio de construcción',s:'Primer colado de cimentación. Obra blanca iniciada.'},
              ].map((log,i) => (
                <div key={i} style={{display:'flex',gap:'12px',padding:'11px 0',borderBottom:'1px solid var(--bd2)'}}>
                  <div style={{fontSize:'11px',color:'var(--mid)',minWidth:'62px',whiteSpace:'nowrap'}}>{log.d}</div>
                  <div>
                    <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>{log.t}</div>
                    <div style={{fontSize:'11px',color:'var(--mid)'}}>{log.s}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: AMENIDADES */}
          {activeTab === 'am' && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
              {amenidades.map((a,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',color:'var(--dk)',background:'var(--bg2)',borderRadius:'var(--rs)',padding:'10px 12px'}}>
                  ✓ {a}
                </div>
              ))}
            </div>
          )}

          {/* TAB: LOCALIZACIÓN */}
          {activeTab === 'loc' && (
            <div>
              <div style={{background:'var(--bg2)',borderRadius:'var(--r)',height:'190px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px',opacity:.25,marginBottom:'11px'}}>
                🗺️
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px'}}>
                {[
                  {l:'Metro más cercano',v:'Chilpancingo (5 min)'},
                  {l:'Supermercado',v:'Superama (3 min)'},
                  {l:'Hospital',v:'Hospital Español (8 min)'},
                  {l:'Parque',v:'Parque México (10 min)'},
                ].map((p,i) => (
                  <div key={i} style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'10px 12px'}}>
                    <div style={{fontSize:'10px',color:'var(--mid)',marginBottom:'2px'}}>{p.l}</div>
                    <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)'}}>{p.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{position:'sticky',top:'190px'}}>
          {/* PRECIO */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'10px'}}>
            <div style={{fontSize:'10px',textTransform:'uppercase',letterSpacing:'.08em',color:'var(--mid)',marginBottom:'3px'}}>Precio desde</div>
            <div style={{fontSize:'24px',fontWeight:500,color:'var(--gr)',lineHeight:1,marginBottom:'3px'}}>
              ${project.precio_desde.toLocaleString('es-MX')} MXN
            </div>
            <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'16px'}}>precio base prototipo A</div>
            <div style={{height:'1px',background:'var(--bd2)',margin:'14px 0'}} />
            {[
              {label:'Agendar visita',bg:'transparent',color:'var(--dk)',border:'1px solid rgba(33,45,48,.3)'},
              {label:'Solicitar información',bg:'var(--dk)',color:'#fff',border:'none'},
              {label:'💬 WhatsApp',bg:'#25D366',color:'#fff',border:'none'},
            ].map((b,i) => (
              <button key={i} style={{
                width:'100%',padding:'10px',borderRadius:'var(--rp)',
                fontFamily:'var(--sans)',fontSize:'12px',cursor:'pointer',
                marginBottom:'6px',display:'flex',alignItems:'center',
                justifyContent:'center',gap:'5px',
                background:b.bg,color:b.color,border:b.border
              }}>{b.label}</button>
            ))}
          </div>

          {/* CALCULADORA ROI */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'10px'}}>
            <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'8px'}}>Calculadora de plusvalía</div>
            <div style={{marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--mid)',marginBottom:'4px'}}>
                <span>Plusvalía anual</span>
                <span style={{color:'var(--dk)',fontWeight:500}}>{roiVal}%</span>
              </div>
              <input
                type="range" min="4" max="15" value={roiVal}
                onChange={e => setRoiVal(+e.target.value)}
                style={{width:'100%',height:'2px',borderRadius:'2px',background:'var(--bd)',outline:'none',cursor:'pointer',appearance:'none'}}
              />
            </div>
            <div style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'12px',marginBottom:'12px'}}>
              <div style={{fontSize:'10px',color:'var(--mid)',marginBottom:'10px'}}>Proyección a 1.2 años</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'5px',marginTop:'8px'}}>
                {[
                  {v:`$${(roiValorFuturo/1000000).toFixed(1)}M`,l:'Valor futuro'},
                  {v:`+$${Math.round(roiGanancia/1000)}k`,l:'Ganancia est.'},
                  {v:`${roiVal}%`,l:'Plusvalía'},
                ].map((r,i) => (
                  <div key={i} style={{background:'var(--wh)',borderRadius:'var(--rs)',padding:'8px',textAlign:'center'}}>
                    <span style={{fontSize:'13px',fontWeight:500,color:'var(--gr)',display:'block',marginBottom:'1px'}}>{r.v}</span>
                    <span style={{fontSize:'9px',color:'var(--mid)'}}>{r.l}</span>
                  </div>
                ))}
              </div>
              <div style={{fontSize:'9px',color:'var(--dim)',marginTop:'7px',lineHeight:1.5}}>
                *Proyección estimada. No garantiza rendimientos futuros.
              </div>
            </div>
          </div>

          {/* CALCULADORA PAGOS */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'10px'}}>
            <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'8px'}}>Plan de pagos estimado</div>
            <div style={{marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--mid)',marginBottom:'4px'}}>
                <span>Enganche</span>
                <span style={{color:'var(--dk)',fontWeight:500}}>{engancheVal}%</span>
              </div>
              <input
                type="range" min="10" max="50" value={engancheVal}
                onChange={e => setEngancheVal(+e.target.value)}
                style={{width:'100%',height:'2px',borderRadius:'2px',background:'var(--bd)',outline:'none',cursor:'pointer',appearance:'none'}}
              />
            </div>
            {[
              {l:'Enganche',v:`$${enganche.toLocaleString('es-MX')}`},
              {l:`Mensualidades (${planPagos.mensualidades_num} pagos)`,v: planPagos.mensualidades_num > 0 ? `$${mensualidades.toLocaleString('es-MX')}/mes` : '—'},
              {l:'Pago final (escrituración)',v:`$${pagoFinal.toLocaleString('es-MX')}`},
            ].map((r,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--bd2)',fontSize:'11px'}}>
                <span style={{color:'var(--mid)'}}>{r.l}</span>
                <span style={{fontWeight:500}}>{r.v}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',paddingTop:'8px'}}>
              <span style={{fontSize:'12px',fontWeight:500}}>Total</span>
              <span style={{fontSize:'15px',fontWeight:500,color:'var(--gr)'}}>
                ${project.precio_desde.toLocaleString('es-MX')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SIMILARES */}
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'0 40px 72px',borderTop:'1px solid var(--bd)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'26px 0 16px'}}>
          <div style={{fontSize:'18px',fontWeight:600}}>Proyectos similares</div>
          <span onClick={() => onNavigate('explorar')} style={{fontSize:'12px',color:'var(--gr2)',cursor:'pointer'}}>Ver todos →</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
          {[
            {n:'Sonora Haus',p:'$4,800,000',l:'Roma Norte, Cuauhtémoc',e:'Entrega inmediata'},
            {n:'Dakota Residences',p:'$4,200,000',l:'Nápoles, Benito Juárez',e:'En construcción'},
            {n:'Velázquez 58',p:'$2,900,000',l:'Del Valle Sur, Benito Juárez',e:'Preventa'},
          ].map((s,i) => (
            <div
              key={i}
              onClick={() => onNavigate('explorar')}
              style={{background:'var(--wh)',borderRadius:'var(--r)',overflow:'hidden',cursor:'pointer',border:'1px solid var(--bd2)'}}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 18px rgba(33,45,48,.09)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
            >
              <div style={{height:'140px',display:'flex',alignItems:'center',justifyContent:'center',background:`linear-gradient(145deg,${['#0d2318,#1a5c3a','#0e1e2e,#1a3d5a','#1e0d0d,#4a1818'][i]})`}}>
                <span style={{fontSize:'28px',opacity:.13}}>{['🏢','🏗️','🏙️'][i]}</span>
              </div>
              <div style={{padding:'12px 14px'}}>
                <div style={{fontSize:'16px',fontWeight:500,color:'var(--gr)',marginBottom:'2px'}}>{s.p}</div>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>{s.n}</div>
                <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'9px'}}>{s.l}</div>
                <div style={{display:'flex',gap:'5px'}}>
                  <button style={{flex:1,fontFamily:'var(--sans)',fontSize:'11px',borderRadius:'var(--rp)',padding:'6px',cursor:'pointer',background:'transparent',color:'var(--dk)',border:'1px solid rgba(33,45,48,.3)'}}>Agendar</button>
                  <button style={{flex:1,fontFamily:'var(--sans)',fontSize:'11px',borderRadius:'var(--rp)',padding:'6px',cursor:'pointer',background:'var(--dk)',color:'#fff',border:'none'}}>Ver →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
