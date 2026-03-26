'use client'
import { useState, useEffect, use } from 'react'
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
  historial_precios?: {date: string; precio: number}[]
  amenidades?: string[]
  comision_pct?: number
  desarrolladoras?: {
    nombre: string
    verificacion_constitucion: boolean
    verificacion_antecedentes: boolean
    verificacion_profeco: boolean
    proyectos_entregados: number
    unidades_vendidas: number
    ano_fundacion: number
  }
}

interface Unidad {
  id: string
  unit_id_display: string
  nivel: number
  m2_privados: number
  recamaras: number
  banos: number
  precio: number
  estado: string
}

interface Esquema {
  id: string
  nombre: string
  enganche_pct: number
  mensualidades_num: number
  pct_mensualidades: number
  pct_pago_final: number
  ajuste_precio_pct: number
  es_default: boolean
}

export default function PresentacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [esquemas, setEsquemas] = useState<Esquema[]>([])
  const [selectedEsquema, setSelectedEsquema] = useState('')
  const [slide, setSlide] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    supabase.from('projects')
      .select('*, desarrolladoras(nombre, verificacion_constitucion, verificacion_antecedentes, verificacion_profeco, proyectos_entregados, unidades_vendidas, ano_fundacion)')
      .eq('id', id).single()
      .then(({ data }) => { if (data) setProject(data as Project) })
    supabase.from('unidades').select('id, unit_id_display, nivel, m2_privados, recamaras, banos, precio, estado')
      .eq('project_id', id).eq('estado', 'disponible').order('precio')
      .then(({ data }) => setUnidades((data as Unidad[]) || []))
    supabase.from('esquemas_pago').select('*').eq('project_id', id).order('orden')
      .then(({ data }) => {
        const esqs = (data as Esquema[]) || []
        setEsquemas(esqs)
        const def = esqs.find(e => e.es_default) || esqs[0]
        if (def) setSelectedEsquema(def.id)
      })
  }, [id])

  if (!project) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',color:'var(--mid)',background:'var(--bg)'}}>
      Cargando presentación...
    </div>
  )

  const dev = project.desarrolladoras
  const etapas = project.etapas || []
  const historial = project.historial_precios || []
  const amenidades = project.amenidades || []
  const esqActivo = esquemas.find(e => e.id === selectedEsquema)
  const precioAjustado = esqActivo ? Math.round(project.precio_desde * (1 + esqActivo.ajuste_precio_pct / 100)) : project.precio_desde

  const disponibles = unidades.length
  const totalEstimado = project.m2_min ? Math.max(disponibles, 10) : disponibles

  const slides = [
    // SLIDE 0: Portada
    () => (
      <div style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',background:'var(--dk)',color:'#fff',padding:'60px'}}>
        <div style={{fontSize:'11px',letterSpacing:'.15em',textTransform:'uppercase',opacity:.4,marginBottom:'16px'}}>{dev?.nombre} presenta</div>
        <div style={{fontSize:'48px',fontWeight:600,lineHeight:1.1,textAlign:'center',marginBottom:'12px'}}>{project.nombre}</div>
        <div style={{fontSize:'16px',opacity:.5,marginBottom:'32px'}}>📍 {project.calle}, Col. {project.colonia}, {project.alcaldia}</div>
        <div style={{display:'flex',gap:'20px',fontSize:'14px',opacity:.6}}>
          {project.m2_min && <span>📐 {project.m2_min}–{project.m2_max} m²</span>}
          {project.recamaras_min && <span>🛏 {project.recamaras_min}–{project.recamaras_max} rec.</span>}
          <span>🗓 {project.entrega_quarter} {project.entrega_year}</span>
        </div>
      </div>
    ),

    // SLIDE 1: Precio y plan de pagos
    () => (
      <div style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px',background:'var(--bg)'}}>
        <div style={{fontSize:'14px',color:'var(--mid)',marginBottom:'8px'}}>Inversión</div>
        <div style={{fontSize:'42px',fontWeight:600,color:'var(--gr)',marginBottom:'8px'}}>Desde ${precioAjustado.toLocaleString('es-MX')} MXN</div>
        {esqActivo && esqActivo.ajuste_precio_pct !== 0 && (
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'20px'}}>Precio lista: ${project.precio_desde.toLocaleString('es-MX')} · Esquema: {esqActivo.nombre} ({esqActivo.ajuste_precio_pct > 0 ? '+' : ''}{esqActivo.ajuste_precio_pct}%)</div>
        )}
        {esquemas.length > 0 && (
          <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
            {esquemas.map(e => (
              <button key={e.id} onClick={() => setSelectedEsquema(e.id)} style={{fontFamily:'var(--sans)',fontSize:'13px',padding:'10px 20px',borderRadius:'var(--rp)',border:selectedEsquema===e.id?'2px solid var(--gr)':'1px solid var(--bd)',background:selectedEsquema===e.id?'var(--gr-bg)':'var(--wh)',color:selectedEsquema===e.id?'var(--gr)':'var(--mid)',cursor:'pointer'}}>{e.nombre}</button>
            ))}
          </div>
        )}
        {esqActivo && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'14px',maxWidth:'600px'}}>
            {[
              {l:'Enganche',v:`$${Math.round(precioAjustado*esqActivo.enganche_pct/100).toLocaleString('es-MX')}`,s:`${esqActivo.enganche_pct}%`},
              {l:'Mensualidades',v:esqActivo.mensualidades_num>0?`$${Math.round((precioAjustado-precioAjustado*esqActivo.enganche_pct/100)*esqActivo.pct_mensualidades/100/esqActivo.mensualidades_num).toLocaleString('es-MX')}/mes`:'—',s:esqActivo.mensualidades_num>0?`${esqActivo.mensualidades_num} pagos`:'Sin mensualidades'},
              {l:'Pago final',v:`$${Math.round((precioAjustado-precioAjustado*esqActivo.enganche_pct/100)*esqActivo.pct_pago_final/100).toLocaleString('es-MX')}`,s:'Al escriturar'},
            ].map((item,i) => (
              <div key={i} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'18px',fontWeight:600,color:'var(--gr)',marginBottom:'4px'}}>{item.v}</div>
                <div style={{fontSize:'12px',color:'var(--mid)'}}>{item.l}</div>
                <div style={{fontSize:'10px',color:'var(--dim)'}}>{item.s}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),

    // SLIDE 2: Disponibilidad
    () => (
      <div style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px',background:'var(--bg)'}}>
        <div style={{fontSize:'14px',color:'var(--mid)',marginBottom:'8px'}}>Disponibilidad</div>
        <div style={{fontSize:'36px',fontWeight:600,color:'var(--dk)',marginBottom:'24px'}}>{disponibles} unidades disponibles</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'10px',maxHeight:'60vh',overflowY:'auto'}}>
          {unidades.slice(0, 12).map(u => (
            <div key={u.id} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)'}}>{u.unit_id_display}</div>
                <div style={{fontSize:'11px',color:'var(--mid)'}}>Nivel {u.nivel} · {u.m2_privados} m² · {u.recamaras} rec · {u.banos} baños</div>
              </div>
              <div style={{fontSize:'15px',fontWeight:600,color:'var(--gr)'}}>${u.precio.toLocaleString('es-MX')}</div>
            </div>
          ))}
        </div>
        {unidades.length > 12 && <div style={{fontSize:'12px',color:'var(--mid)',marginTop:'12px'}}>+{unidades.length - 12} unidades más</div>}
      </div>
    ),

    // SLIDE 3: Etapas y avance
    () => (
      <div style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px',background:'var(--bg)'}}>
        <div style={{fontSize:'14px',color:'var(--mid)',marginBottom:'8px'}}>Avance del proyecto</div>
        <div style={{fontSize:'36px',fontWeight:600,color:'var(--dk)',marginBottom:'32px'}}>Etapa actual: {project.etapa_actual}</div>
        {etapas.length > 0 && (
          <div style={{display:'flex',gap:'0',maxWidth:'700px'}}>
            {etapas.map((e, i) => {
              const isDone = etapas.findIndex(x => x.name === project.etapa_actual) > i
              const isAct = e.name === project.etapa_actual
              return (
                <div key={i} style={{flex:1,textAlign:'center',position:'relative'}}>
                  {i < etapas.length - 1 && <div style={{position:'absolute',top:'14px',left:'50%',right:'-50%',height:'3px',background:isDone?'var(--gr)':'var(--bd)'}} />}
                  <div style={{width:'30px',height:'30px',borderRadius:'50%',margin:'0 auto 8px',position:'relative',zIndex:1,background:isDone?'var(--gr)':isAct?'var(--bg)':'var(--bd)',border:isAct?'4px solid var(--gr)':'4px solid var(--bg2)',boxShadow:isAct?'0 0 0 4px rgba(27,67,50,.15)':'none'}} />
                  <div style={{fontSize:'13px',color:isAct?'var(--gr)':isDone?'var(--dk)':'var(--mid)',fontWeight:isAct?600:400}}>{e.name}</div>
                  {e.date && <div style={{fontSize:'10px',color:'var(--dim)',marginTop:'2px'}}>{e.date}</div>}
                </div>
              )
            })}
          </div>
        )}
        {historial.length > 0 && (
          <div style={{marginTop:'40px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>Historial de precio</div>
            <div style={{display:'flex',gap:'24px',alignItems:'end'}}>
              {[...historial, {date:'Hoy',precio:project.precio_desde}].map((h,i,arr) => (
                <div key={i} style={{textAlign:'center'}}>
                  <div style={{fontSize:'14px',fontWeight:i===arr.length-1?600:400,color:i===arr.length-1?'var(--gr)':'var(--mid)'}}>${(h.precio/1e6).toFixed(1)}M</div>
                  <div style={{fontSize:'10px',color:'var(--dim)',marginTop:'3px'}}>{h.date}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:'12px',color:'var(--gr)',marginTop:'8px'}}>↑ +{Math.round((project.precio_desde/historial[0].precio-1)*100)}% desde lanzamiento</div>
          </div>
        )}
      </div>
    ),

    // SLIDE 4: Amenidades + Desarrolladora
    () => (
      <div style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px',background:'var(--bg)'}}>
        {amenidades.length > 0 && (
          <div style={{marginBottom:'40px'}}>
            <div style={{fontSize:'14px',color:'var(--mid)',marginBottom:'12px'}}>Amenidades</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {amenidades.map((a,i) => (
                <div key={i} style={{background:'var(--wh)',borderRadius:'var(--rp)',border:'1px solid var(--bd)',padding:'8px 16px',fontSize:'13px',color:'var(--dk)'}}>✓ {a}</div>
              ))}
            </div>
          </div>
        )}
        {dev && (
          <div>
            <div style={{fontSize:'14px',color:'var(--mid)',marginBottom:'12px'}}>Desarrolladora</div>
            <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',maxWidth:'500px'}}>
              <div style={{fontSize:'18px',fontWeight:500,color:'var(--dk)',marginBottom:'8px'}}>{dev.nombre}</div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'12px'}}>
                {dev.verificacion_constitucion && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'var(--rp)',background:'var(--gr-bg)',color:'var(--gr)'}}>✓ Constitución verificada</span>}
                {dev.verificacion_antecedentes && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'var(--rp)',background:'var(--gr-bg)',color:'var(--gr)'}}>✓ Sin antecedentes</span>}
                {dev.verificacion_profeco && <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'var(--rp)',background:'var(--gr-bg)',color:'var(--gr)'}}>✓ Sin quejas PROFECO</span>}
              </div>
              <div style={{display:'flex',gap:'20px',fontSize:'13px',color:'var(--mid)'}}>
                <span>{dev.proyectos_entregados} proyectos</span>
                <span>{dev.unidades_vendidas} unidades</span>
                <span>{new Date().getFullYear()-dev.ano_fundacion} años</span>
              </div>
            </div>
          </div>
        )}
      </div>
    ),
  ]

  return (
    <div style={{height:'100vh',fontFamily:'var(--sans)',position:'relative',overflow:'hidden'}}>
      {/* SLIDE */}
      <div style={{height:'100%'}}>
        {slides[slide]()}
      </div>

      {/* CONTROLES */}
      <div style={{position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'8px',alignItems:'center',background:'rgba(33,45,48,.9)',borderRadius:'var(--rp)',padding:'8px 16px',zIndex:100}}>
        <button onClick={() => setSlide(s => Math.max(0, s-1))} disabled={slide===0} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:slide===0?'rgba(255,255,255,.3)':'#fff',border:'none',cursor:slide===0?'default':'pointer',padding:'4px 8px'}}>←</button>
        <div style={{display:'flex',gap:'5px'}}>
          {slides.map((_,i) => (
            <div key={i} onClick={() => setSlide(i)} style={{width:slide===i?'20px':'8px',height:'8px',borderRadius:'4px',background:slide===i?'#fff':'rgba(255,255,255,.3)',cursor:'pointer',transition:'width .2s'}} />
          ))}
        </div>
        <button onClick={() => setSlide(s => Math.min(slides.length-1, s+1))} disabled={slide===slides.length-1} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:slide===slides.length-1?'rgba(255,255,255,.3)':'#fff',border:'none',cursor:slide===slides.length-1?'default':'pointer',padding:'4px 8px'}}>→</button>
        <div style={{width:'1px',height:'16px',background:'rgba(255,255,255,.2)',margin:'0 4px'}} />
        <span style={{fontSize:'11px',color:'rgba(255,255,255,.5)'}}>{slide+1}/{slides.length}</span>
      </div>

      {/* ESC para salir */}
      <div style={{position:'fixed',top:'16px',right:'16px',fontSize:'11px',color:'var(--dim)',background:'rgba(255,255,255,.8)',padding:'4px 10px',borderRadius:'var(--rs)',zIndex:100}}>
        <a href="javascript:history.back()" style={{color:'var(--mid)',textDecoration:'none'}}>✕ Salir</a>
      </div>
    </div>
  )
}
