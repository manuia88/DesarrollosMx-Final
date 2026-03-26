'use client'
import { useEffect, useState } from 'react'

interface Project {
  id: string
  nombre: string
  estado: string
  colonia: string
  alcaldia: string
  precio_desde: number
  precio_hasta: number
  entrega_quarter: string
  entrega_year: number
  m2_min: number
  m2_max: number
  recamaras_min: number
  recamaras_max: number
  cajones_min: number
  cajones_max: number
  destacado: boolean
  fotos: { url: string; is_hero: boolean }[]
}

export default function HomeView({
  projects,
  onNavigate,
}: {
  projects: Project[]
  onNavigate: (view: string, id?: string) => void
}) {
  const destacados = projects.filter(p => p.destacado)

  function getBadgeStyle(estado: string) {
    if (estado === 'Entrega inmediata') return { background: 'rgba(255,255,255,.9)', color: '#1a6640' }
    if (estado === 'Preventa') return { background: 'rgba(255,255,255,.9)', color: '#2a5cb0' }
    return { background: 'rgba(255,255,255,.9)', color: 'var(--dk)' }
  }

  function getBadgeLabel(estado: string) {
    if (estado === 'Entrega inmediata') return 'Entrega inmediata'
    if (estado === 'Preventa') return 'Preventa'
    return estado
  }

  const [realStats, setRealStats] = useState({proyectos:'—',alcaldias:'—',unidades:'—'})
  useEffect(() => {
    const sb = (typeof window !== 'undefined') ? require('@/lib/supabase/client').createClient() : null
    if (!sb) return
    Promise.all([
      sb.from('projects').select('id, alcaldia', {count:'exact'}).eq('publicado', true),
      sb.from('unidades').select('id', {count:'exact'}).eq('estado', 'disponible'),
    ]).then(([{data:projs,count:projCount},{count:udCount}]) => {
      const alcaldias = new Set((projs||[]).map((p:{alcaldia:string})=>p.alcaldia).filter(Boolean))
      setRealStats({
        proyectos: String(projCount || 0),
        alcaldias: String(alcaldias.size),
        unidades: (udCount||0) > 999 ? `${((udCount||0)/1000).toFixed(1)}k+` : String(udCount||0),
      })
    })
  }, [])

  return (
    <div>
      {/* HERO */}
      <div style={{
        background:'var(--dk)',padding:'72px 40px 60px',
        position:'relative',overflow:'hidden'
      }}>
        <div style={{
          content:'',position:'absolute',inset:0,
          backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.025'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents:'none'
        }} />
        <div style={{maxWidth:'1200px',margin:'0 auto',position:'relative'}}>
          <div style={{fontSize:'11px',fontWeight:500,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(255,255,255,.38)',marginBottom:'14px'}}>
            Vivienda nueva · CDMX
          </div>
          <div style={{fontSize:'50px',fontWeight:600,color:'#fff',lineHeight:1.07,letterSpacing:'-.5px'}}>
            Toda la oferta de vivienda nueva
          </div>
          <div style={{fontSize:'50px',fontWeight:600,color:'rgba(255,255,255,.3)',lineHeight:1.07,letterSpacing:'-.5px',marginBottom:'22px'}}>
            en un solo lugar.
          </div>
          <div style={{fontSize:'15px',color:'rgba(255,255,255,.48)',maxWidth:'520px',lineHeight:1.65,marginBottom:'30px'}}>
            Encuentra departamentos en preventa y entrega inmediata en Ciudad de México. Información actualizada para compradores y asesores.
          </div>
          <div style={{
            display:'flex',gap:'6px',maxWidth:'600px',
            background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.14)',
            borderRadius:'var(--r)',padding:'6px'
          }}>
            <select style={{
              flex:1,background:'transparent',border:'none',
              fontFamily:'var(--sans)',fontSize:'13px',color:'#fff',
              padding:'8px 12px',cursor:'pointer',outline:'none',appearance:'none',
              borderRight:'1px solid rgba(255,255,255,.1)'
            }}>
              <option style={{background:'var(--dk)'}}>📍 ¿Dónde quieres vivir?</option>
              <option style={{background:'var(--dk)'}}>Benito Juárez</option>
              <option style={{background:'var(--dk)'}}>Cuauhtémoc</option>
              <option style={{background:'var(--dk)'}}>Miguel Hidalgo</option>
              <option style={{background:'var(--dk)'}}>Coyoacán</option>
            </select>
            <select style={{
              flex:1,background:'transparent',border:'none',
              fontFamily:'var(--sans)',fontSize:'13px',color:'#fff',
              padding:'8px 12px',cursor:'pointer',outline:'none',appearance:'none'
            }}>
              <option style={{background:'var(--dk)'}}>💰 Precio máximo</option>
              <option style={{background:'var(--dk)'}}>Hasta $2M</option>
              <option style={{background:'var(--dk)'}}>Hasta $3M</option>
              <option style={{background:'var(--dk)'}}>Hasta $5M</option>
              <option style={{background:'var(--dk)'}}>Sin límite</option>
            </select>
            <button
              onClick={() => onNavigate('explorar')}
              style={{
                fontFamily:'var(--sans)',fontSize:'13px',fontWeight:500,
                background:'#fff',color:'var(--dk)',border:'none',
                borderRadius:'7px',padding:'9px 22px',cursor:'pointer',whiteSpace:'nowrap'
              }}
            >Buscar →</button>
          </div>
          <div style={{marginTop:'10px',fontSize:'12px',color:'rgba(255,255,255,.35)'}}>
            ¿Eres asesor?{' '}
            <span
              onClick={() => onNavigate('explorar')}
              style={{color:'rgba(255,255,255,.6)',textDecoration:'underline',textUnderlineOffset:'3px',cursor:'pointer'}}
            >Accede al catálogo completo</span>
          </div>
          <div style={{display:'flex',gap:'36px',marginTop:'42px'}}>
            {[
              {n:realStats.proyectos,l:'Proyectos activos'},
              {n:realStats.alcaldias,l:'Alcaldías cubiertas'},
              {n:realStats.unidades,l:'Unidades disponibles'},
              {n:'Real time',l:'Info actualizada'},
            ].map((s,i) => (
              <div key={i}>
                <div style={{fontSize:'26px',fontWeight:600,color:'#fff'}}>{s.n}</div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,.38)',marginTop:'1px'}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ZONAS */}
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'52px 40px 0'}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'22px'}}>
          <div style={{fontSize:'24px',fontWeight:600,color:'var(--dk)'}}>Explorar por zona</div>
          <span onClick={() => onNavigate('explorar')} style={{fontSize:'13px',color:'var(--gr2)',cursor:'pointer'}}>Ver todos →</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
          {[
            {bg:'linear-gradient(145deg,#0d2318,#1a503a)',n:'Benito Juárez',c:'12 proyectos · Del Valle, Narvarte, Mixcoac'},
            {bg:'linear-gradient(145deg,#0e1e2e,#1a3d5a)',n:'Cuauhtémoc',c:'9 proyectos · Roma, Condesa, Doctores'},
            {bg:'linear-gradient(145deg,#1e0d0d,#4a1818)',n:'Miguel Hidalgo',c:'8 proyectos · Polanco, Lomas, Granada'},
            {bg:'var(--bg2)',n:'Otras zonas',c:'Coyoacán, Cuajimalpa, Azcapotzalco',other:true},
          ].map((z,i) => (
            <div
              key={i}
              onClick={() => onNavigate('explorar')}
              style={{
                borderRadius:'var(--r)',overflow:'hidden',cursor:'pointer',
                position:'relative',height:'170px',display:'flex',
                transition:'transform .18s',
                background:z.bg,
                border: z.other ? '1px solid var(--bd)' : undefined,
                flexDirection: z.other ? 'column' : undefined,
                justifyContent: z.other ? 'center' : undefined,
                alignItems: z.other ? 'center' : 'flex-end',
                
              }}
              onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}
            >
              {!z.other && (
                <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(33,45,48,.85) 0%,transparent 65%)'}} />
              )}
              {z.other ? (
                <>
                  <div style={{fontSize:'24px',opacity:.3}}>+</div>
                  <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>Otras zonas</div>
                  <div style={{fontSize:'11px',color:'var(--mid)',marginTop:'2px'}}>{z.c}</div>
                </>
              ) : (
                <div style={{position:'relative',padding:'14px 16px',width:'100%'}}>
                  <div style={{fontSize:'15px',fontWeight:500,color:'#fff'}}>{z.n}</div>
                  <div style={{fontSize:'11px',color:'rgba(255,255,255,.5)',marginTop:'2px'}}>{z.c}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CATEGORÍAS */}
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'44px 40px 0'}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'22px'}}>
          <div style={{fontSize:'24px',fontWeight:600,color:'var(--dk)'}}>Explorar por categoría</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px'}}>
          {[
            {bg:'var(--dk)',tag:'Listo para habitar',title:'Entrega inmediata',sub:'Proyectos terminados listos para escriturar. Sin espera.',n:'18 proyectos',dark:true},
            {bg:'var(--gr)',tag:'En construcción',title:'Preventa',sub:'Los mejores precios antes de que suba el valor. Paga mientras se construye.',n:'29 proyectos',dark:true},
            {bg:'var(--wh)',tag:'Para asesores',title:'Mejor comisión',sub:'Proyectos con las comisiones más competitivas del mercado.',n:'14 proyectos',dark:false,border:true},
            {bg:'var(--bg2)',tag:'Nuevo inventario',title:'Recién agregados',sub:'Proyectos incorporados esta semana. Sé el primero en conocerlos.',n:'6 esta semana',dark:false,border:true},
          ].map((c,i) => (
            <div
              key={i}
              onClick={() => onNavigate('explorar')}
              style={{
                borderRadius:'var(--r)',padding:'24px 28px',cursor:'pointer',
                position:'relative',overflow:'hidden',transition:'transform .18s',
                background:c.bg,
                border: c.border ? '1px solid var(--bd)' : undefined,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}
            >
              <div style={{
                fontSize:'10px',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',
                padding:'3px 9px',borderRadius:'var(--rp)',display:'inline-block',marginBottom:'10px',
                background: c.dark ? 'rgba(255,255,255,.14)' : 'rgba(33,45,48,.07)',
                color: c.dark ? 'rgba(255,255,255,.7)' : 'var(--dk)'
              }}>{c.tag}</div>
              <div style={{fontSize:'18px',fontWeight:500,lineHeight:1.2,marginBottom:'5px',color: c.dark ? '#fff' : 'var(--dk)'}}>
                {c.title}
              </div>
              <div style={{fontSize:'12px',lineHeight:1.55,color: c.dark ? 'rgba(255,255,255,.48)' : 'var(--mid)'}}>
                {c.sub}
              </div>
              <div style={{fontSize:'28px',fontWeight:600,marginTop:'14px',color: c.dark ? '#fff' : 'var(--dk)'}}>
                {c.n}
              </div>
              <div style={{position:'absolute',bottom:'22px',right:'22px',fontSize:'18px',opacity:.3}}>→</div>
            </div>
          ))}
        </div>
      </div>

      {/* PROYECTOS DESTACADOS */}
      <div style={{maxWidth:'1200px',margin:'0 auto',padding:'44px 40px 0'}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'22px'}}>
          <div style={{fontSize:'24px',fontWeight:600,color:'var(--dk)'}}>Proyectos destacados</div>
          <span onClick={() => onNavigate('explorar')} style={{fontSize:'13px',color:'var(--gr2)',cursor:'pointer'}}>Ver todos →</span>
        </div>
        <div style={{display:'flex',gap:'14px',overflowX:'auto',padding:'4px 0 14px',scrollbarWidth:'none'}}>
          {(destacados.length > 0 ? destacados : projects).map(p => (
            <div
              key={p.id}
              onClick={() => onNavigate('detail', p.id)}
              style={{
                background:'var(--wh)',borderRadius:'var(--r)',overflow:'hidden',
                cursor:'pointer',border:'1px solid var(--bd2)',
                transition:'box-shadow .18s,border-color .18s',
                flexShrink:0,width:'340px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow='0 4px 22px rgba(33,45,48,.1)'
                e.currentTarget.style.borderColor='rgba(33,45,48,.17)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow='none'
                e.currentTarget.style.borderColor='rgba(33,45,48,.06)'
              }}
            >
              <div style={{position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',height:'210px',background:'linear-gradient(145deg,#0d2318,#1a5c3a)'}}>
                <span style={{fontSize:'38px',opacity:.13}}>🏙️</span>
                <div style={{position:'absolute',top:'10px',left:'10px',display:'flex',gap:'4px',flexWrap:'wrap'}}>
                  {p.destacado && (
                    <span style={{fontSize:'10px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'rgba(255,255,255,.9)',color:'var(--dk)',display:'inline-flex',alignItems:'center',gap:'3px'}}>⭐ Destacado</span>
                  )}
                  <span style={{fontSize:'10px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',display:'inline-flex',alignItems:'center',gap:'3px',...getBadgeStyle(p.estado)}}>
                    {getBadgeLabel(p.estado)}
                  </span>
                </div>
                {p.recamaras_min && (
                  <div style={{position:'absolute',top:'10px',right:'32px'}}>
                    <span style={{fontSize:'10px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'rgba(255,255,255,.9)',color:'var(--dk)'}}>🛏 {p.recamaras_min}–{p.recamaras_max}</span>
                  </div>
                )}
                <button
                  onClick={e => e.stopPropagation()}
                  style={{position:'absolute',top:'8px',right:'8px',width:'26px',height:'26px',borderRadius:'50%',background:'rgba(255,255,255,.88)',border:'none',fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                >♡</button>
                <div style={{position:'absolute',bottom:'8px',right:'8px',background:'rgba(0,0,0,.48)',color:'#fff',fontSize:'10px',padding:'2px 7px',borderRadius:'4px'}}>📷 1/8</div>
              </div>
              <div style={{padding:'14px 16px 10px',display:'flex',flexDirection:'column',gap:'3px'}}>
                <div style={{fontSize:'19px',fontWeight:500,color:'var(--gr)',lineHeight:1.2}}>
                  ${p.precio_desde.toLocaleString('es-MX')} MXN
                </div>
                <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)'}}>{p.nombre}</div>
                <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia} · CDMX</div>
                <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginTop:'4px'}}>
                  <span style={{fontSize:'10px',color:'var(--mid)',background:'var(--bg2)',padding:'2px 7px',borderRadius:'4px'}}>{p.estado}</span>
                  {p.entrega_quarter && p.entrega_year && (
                    <span style={{fontSize:'10px',color:'var(--mid)',background:'var(--bg2)',padding:'2px 7px',borderRadius:'4px'}}>Entrega {p.entrega_quarter} {p.entrega_year}</span>
                  )}
                </div>
                <div style={{display:'flex',gap:'10px',fontSize:'11px',color:'var(--mid)',marginTop:'4px'}}>
                  <span>📐 {p.m2_min}–{p.m2_max} m²</span>
                  <span>🛏 {p.recamaras_min}–{p.recamaras_max}</span>
                  <span>🚗 {p.cajones_min}–{p.cajones_max}</span>
                </div>
              </div>
              <div style={{padding:'10px 16px 14px',display:'flex',gap:'7px'}}>
                <button
                  onClick={e => e.stopPropagation()}
                  style={{flex:1,fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',color:'var(--dk)',border:'1px solid rgba(33,45,48,.3)',borderRadius:'var(--rp)',padding:'8px',cursor:'pointer'}}
                >Agendar visita</button>
                <button
                  onClick={e => { e.stopPropagation(); onNavigate('detail', p.id) }}
                  style={{flex:1,fontFamily:'var(--sans)',fontSize:'12px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px',cursor:'pointer'}}
                >Ver proyecto →</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CÓMO FUNCIONA */}
      <div style={{background:'var(--wh)',marginTop:'52px',padding:'52px 40px'}}>
        <div style={{maxWidth:'1200px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'44px'}}>
            <div style={{fontSize:'28px',fontWeight:600,color:'var(--dk)',marginBottom:'7px'}}>Así de fácil funciona</div>
            <div style={{fontSize:'14px',color:'var(--mid)'}}>Sin intermediarios innecesarios. Tú decides cuándo y cómo avanzar.</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'24px'}}>
            {[
              {n:'1',ic:'🔍',t:'Encuentra tu proyecto',s:'Filtra por zona, precio, recámaras y fecha de entrega. Toda la oferta disponible, actualizada en tiempo real.'},
              {n:'2',ic:'📋',t:'Revisa precios y planos',s:'Consulta el inventario completo: metraje desglosado, prototipo, nivel, precio exacto y disponibilidad por unidad.'},
              {n:'3',ic:'💬',t:'Conecta y avanza',s:'Agenda tu visita o escríbenos por WhatsApp. Tu asesor te acompañará en todo el proceso de compra.'},
            ].map((h,i) => (
              <div key={i} style={{textAlign:'center',padding:'0 14px'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'var(--dk)',color:'#fff',fontSize:'15px',fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>{h.n}</div>
                <div style={{fontSize:'28px',marginBottom:'9px'}}>{h.ic}</div>
                <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'5px'}}>{h.t}</div>
                <div style={{fontSize:'13px',color:'var(--mid)',lineHeight:1.65}}>{h.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BANNER ASESOR */}
      <div style={{padding:'0 40px',maxWidth:'1200px',margin:'52px auto 0'}}>
        <div style={{
          background:'var(--dk)',borderRadius:'var(--r)',padding:'44px 48px',
          display:'flex',alignItems:'center',justifyContent:'space-between',gap:'28px'
        }}>
          <div>
            <div style={{fontSize:'10px',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(255,255,255,.38)',marginBottom:'8px'}}>Para profesionales inmobiliarios</div>
            <div style={{fontSize:'26px',fontWeight:600,color:'#fff',marginBottom:'7px',lineHeight:1.2}}>¿Eres asesor?<br/>Accede al catálogo completo</div>
            <div style={{fontSize:'13px',color:'rgba(255,255,255,.44)',lineHeight:1.65,maxWidth:'480px'}}>Toda la oferta de vivienda nueva de CDMX en un solo lugar. Fichas técnicas, planos, precios por unidad y herramientas para compartir con tus clientes.</div>
            <div style={{display:'flex',gap:'22px',marginTop:'16px',flexWrap:'wrap'}}>
              {['Catálogo completo','Precios por unidad','Planos descargables','Compartir con cliente'].map((b,i) => (
                <span key={i} style={{fontSize:'12px',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',gap:'5px'}}>
                  <span style={{color:'rgba(255,255,255,.3)'}}>✓</span>{b}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => onNavigate('explorar')}
            style={{
              fontFamily:'var(--sans)',fontSize:'14px',fontWeight:500,
              background:'#fff',color:'var(--dk)',border:'none',
              borderRadius:'var(--rp)',padding:'13px 30px',cursor:'pointer',
              whiteSpace:'nowrap',flexShrink:0
            }}
          >Registrarme como asesor →</button>
        </div>
      </div>

      <div style={{height:'72px'}} />
    </div>
  )
}
