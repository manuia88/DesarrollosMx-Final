'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProjectOption {
  id: string
  nombre: string
  precio_desde: number
  colonia: string
  alcaldia: string
  plusvalia_pct?: number
  entrega_quarter?: string
  entrega_year?: number
}

interface UnidadOption {
  id: string
  identificador: string
  prototipo?: string
  precio: number
  m2_totales?: number
  recamaras?: number
  estado: string
}

interface EsquemaOption {
  id: string
  nombre: string
  enganche_pct: number
  mensualidades_num: number
  pct_mensualidades: number
  pct_pago_final: number
  acepta_credito: boolean
  descuento_contado_pct: number
  notas?: string
  es_default: boolean
}

export default function CalculadoraPage() {
  const supabase = createClient()

  // Modo
  const [modo, setModo] = useState<'proyecto'|'libre'>('proyecto')

  // Modo proyecto
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [unidades, setUnidades] = useState<UnidadOption[]>([])
  const [esquemas, setEsquemas] = useState<EsquemaOption[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedUnidad, setSelectedUnidad] = useState('')
  const [selectedEsquema, setSelectedEsquema] = useState('')

  const [preciosMap, setPreciosMap] = useState<Record<string, Record<string, number>>>({})
  const [precioLista, setPrecioLista] = useState(0)

  // Parámetros calculadora
  const [precio, setPrecio] = useState(6500000)
  const [enganche, setEnganche] = useState(20)
  const [meses, setMeses] = useState(18)
  const [pctMensualidades, setPctMensualidades] = useState(40)
  const [pctPagoFinal, setPctPagoFinal] = useState(40)
  const [plusvalia, setPlusvalia] = useState(8)
  const [años, setAños] = useState(3)
  const [rentaMensual, setRentaMensual] = useState(18000)
  const [escenario, setEscenario] = useState<'vivir'|'rentar'|'revender'>('vivir')

  // Cargar proyectos
  useEffect(() => {
    supabase.from('projects').select('id, nombre, precio_desde, colonia, alcaldia, plusvalia_pct, entrega_quarter, entrega_year')
      .eq('publicado', true).order('nombre')
      .then(({ data }) => setProjects((data as ProjectOption[]) || []))
  }, [])

  // Cargar unidades cuando cambia proyecto
  useEffect(() => {
    if (!selectedProject) { setUnidades([]); setEsquemas([]); return }
    supabase.from('unidades').select('id, identificador, prototipo, precio, m2_totales, recamaras, estado')
      .eq('project_id', selectedProject).eq('estado', 'disponible').order('identificador')
      .then(({ data }) => setUnidades((data as UnidadOption[]) || []))
    supabase.from('esquemas_pago').select('*')
      .eq('project_id', selectedProject).order('orden')
      .then(({ data }) => {
        const esqs = (data as EsquemaOption[]) || []
        setEsquemas(esqs)
        const def = esqs.find(e => e.es_default) || esqs[0]
        if (def) {
          setSelectedEsquema(def.id)
          applyEsquema(def)
        }
      })
    // Cargar precios por esquema
    supabase.from('unidades').select('id').eq('project_id', selectedProject)
      .then(({ data: uds }) => {
        if (uds && uds.length > 0) {
          const uIds = uds.map((u: {id:string}) => u.id)
          supabase.from('precios_unidad').select('unidad_id, esquema_id, precio').in('unidad_id', uIds)
            .then(({ data: pu }) => {
              if (pu) {
                const map: Record<string, Record<string, number>> = {}
                for (const row of pu as {unidad_id:string,esquema_id:string,precio:number}[]) {
                  if (!map[row.unidad_id]) map[row.unidad_id] = {}
                  map[row.unidad_id][row.esquema_id] = row.precio
                }
                setPreciosMap(map)
              }
            })
        }
      })
    const proj = projects.find(p => p.id === selectedProject)
    if (proj) {
      setPrecio(proj.precio_desde)
      if (proj.plusvalia_pct) setPlusvalia(proj.plusvalia_pct)
      // Calcular meses restantes hasta entrega
      if (proj.entrega_quarter && proj.entrega_year) {
        const quarterMonth: Record<string, number> = { T1: 3, T2: 6, T3: 9, T4: 12 }
        const entregaMonth = quarterMonth[proj.entrega_quarter] || 6
        const entregaDate = new Date(proj.entrega_year, entregaMonth - 1, 1)
        const now = new Date()
        const diffMeses = Math.max(0, Math.round((entregaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
        setMeses(diffMeses)
      }
    }
  }, [selectedProject])

  // Aplicar unidad seleccionada
  useEffect(() => {
    if (!selectedUnidad) return
    const u = unidades.find(x => x.id === selectedUnidad)
    if (u) {
      setPrecioLista(u.precio)
      // Si hay esquema seleccionado, usar precio de esquema
      if (selectedEsquema && preciosMap[u.id]?.[selectedEsquema]) {
        setPrecio(preciosMap[u.id][selectedEsquema])
      } else {
        setPrecio(u.precio)
      }
    }
  }, [selectedUnidad, selectedEsquema, preciosMap])

  // Aplicar esquema seleccionado
  useEffect(() => {
    if (!selectedEsquema) return
    const e = esquemas.find(x => x.id === selectedEsquema)
    if (e) {
      applyEsquema(e)
      // Actualizar precio si hay unidad seleccionada
      if (selectedUnidad && preciosMap[selectedUnidad]?.[selectedEsquema]) {
        setPrecio(preciosMap[selectedUnidad][selectedEsquema])
      }
    }
  }, [selectedEsquema])

  function applyEsquema(e: EsquemaOption) {
    setEnganche(e.enganche_pct)
    setMeses(e.mensualidades_num)
    setPctMensualidades(e.pct_mensualidades)
    setPctPagoFinal(e.pct_pago_final)
  }

  // Cálculos
  const engancheMonto = Math.round(precio * enganche / 100)
  const resto = precio - engancheMonto
  const mensualidad = meses > 0 ? Math.round(resto * pctMensualidades / 100 / meses) : 0
  const pagoFinal = Math.round(resto * pctPagoFinal / 100)
  const valorFuturo = Math.round(precio * Math.pow(1 + plusvalia/100, años))
  const gananciaReventa = valorFuturo - precio
  const rentaAnual = rentaMensual * 12
  const rentaTotal = rentaAnual * años
  const roiRenta = precio > 0 ? Math.round(rentaAnual / precio * 100 * 10) / 10 : 0
  const gastoNotarial = Math.round(precio * 0.06)

  const sectionStyle = { background:'var(--wh)', borderRadius:'var(--r)', border:'1px solid var(--bd)', padding:'20px', marginBottom:'16px' }
  const labelStyle = { fontSize:'12px', fontWeight:500 as const, color:'var(--dk)', display:'block' as const, marginBottom:'5px' }
  const inputStyle = { width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1px solid var(--bd)',fontSize:'13px',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box' as const }
  const selectStyle = { ...inputStyle, cursor:'pointer' as const, appearance:'none' as const, backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23212D30' stroke-opacity='.45' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 10px center',paddingRight:'30px' }

  return (
    <div style={{maxWidth:'800px'}}>
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>🧮 Calculadora de inversión</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Analiza los 3 escenarios: vivir, rentar o revender</div>
      </div>

      {/* MODO SELECTOR */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        {[{v:'proyecto' as const,l:'📋 Desde proyecto'},{v:'libre' as const,l:'✏️ Libre'}].map(m => (
          <button key={m.v} onClick={() => setModo(m.v)} style={{fontFamily:'var(--sans)',fontSize:'13px',padding:'9px 20px',borderRadius:'var(--rp)',border:modo===m.v?'none':'1px solid var(--bd)',background:modo===m.v?'var(--dk)':'var(--wh)',color:modo===m.v?'#fff':'var(--mid)',cursor:'pointer',flex:1}}>{m.l}</button>
        ))}
      </div>

      {/* MODO PROYECTO — SELECTORES */}
      {modo === 'proyecto' && (
        <div style={sectionStyle}>
          <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Selecciona proyecto y unidad</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
            <div>
              <label style={labelStyle}>Proyecto</label>
              <select style={selectStyle} value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setSelectedUnidad(''); setSelectedEsquema('') }}>
                <option value="">Seleccionar proyecto...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} — {p.colonia}, {p.alcaldia}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Unidad disponible</label>
              <select style={selectStyle} value={selectedUnidad} onChange={e => setSelectedUnidad(e.target.value)} disabled={!selectedProject}>
                <option value="">{ selectedProject ? 'Seleccionar unidad...' : 'Primero elige proyecto' }</option>
                {unidades.map(u => (
                  <option key={u.id} value={u.id}>{u.identificador} — {u.prototipo} · {u.m2_totales}m² · ${u.precio.toLocaleString('es-MX')}</option>
                ))}
              </select>
            </div>
          </div>
          {esquemas.length > 0 && (
            <div>
              <label style={labelStyle}>Esquema de pago del desarrollador</label>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {esquemas.map(e => (
                  <button key={e.id} onClick={() => setSelectedEsquema(e.id)} style={{fontFamily:'var(--sans)',fontSize:'12px',padding:'7px 16px',borderRadius:'var(--rp)',border:selectedEsquema===e.id?'2px solid var(--gr)':'1px solid var(--bd)',background:selectedEsquema===e.id?'var(--gr-bg)':'var(--wh)',color:selectedEsquema===e.id?'var(--gr)':'var(--mid)',cursor:'pointer',position:'relative'}}>
                    {e.nombre}
                    {e.es_default && <span style={{fontSize:'8px',fontWeight:600,color:'var(--gr)',marginLeft:'5px'}}>★</span>}
                  </button>
                ))}
              </div>
              {esquemas.find(e => e.id === selectedEsquema)?.notas && (
                <div style={{fontSize:'11px',color:'var(--mid)',marginTop:'6px',fontStyle:'italic'}}>
                  💡 {esquemas.find(e => e.id === selectedEsquema)?.notas}
                </div>
              )}
            </div>
          )}
          {selectedProject && esquemas.length === 0 && (
            <div style={{fontSize:'11px',color:'var(--am)',background:'var(--am-bg)',padding:'8px 12px',borderRadius:'var(--rs)'}}>
              ⚠️ Este proyecto no tiene esquemas de pago registrados. Puedes ajustar manualmente abajo.
            </div>
          )}
        </div>
      )}

      {/* PARÁMETROS */}
      <div style={sectionStyle}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Parámetros del proyecto</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <div>
            <label style={labelStyle}>Precio de compra</label>
            <input type="number" value={precio} onChange={e => setPrecio(+e.target.value)} style={inputStyle} />
            <div style={{fontSize:'11px',color:'var(--gr)',marginTop:'4px'}}>${precio.toLocaleString('es-MX')} MXN</div>
            {modo === 'proyecto' && precioLista > 0 && precio !== precioLista && (
              <div style={{fontSize:'10px',marginTop:'3px',color:precio<precioLista?'var(--gr)':'#DC2626'}}>
                {precio < precioLista ? '↓' : '↑'} {Math.abs(Math.round((precio/precioLista-1)*100))}% vs lista ${precioLista.toLocaleString('es-MX')}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Plusvalía anual estimada (%)</label>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <input type="range" min="3" max="20" value={plusvalia} onChange={e => setPlusvalia(+e.target.value)} style={{flex:1,cursor:'pointer'}} />
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--dk)',minWidth:'35px'}}>{plusvalia}%</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Horizonte de inversión (años)</label>
            <div style={{display:'flex',gap:'8px'}}>
              {[1,2,3,5,10].map(y => (
                <button key={y} onClick={() => setAños(y)} style={{fontFamily:'var(--sans)',fontSize:'12px',padding:'6px 12px',borderRadius:'var(--rp)',border:años===y?'none':'1px solid var(--bd)',background:años===y?'var(--dk)':'var(--wh)',color:años===y?'#fff':'var(--mid)',cursor:'pointer'}}>{y}a</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Renta mensual estimada</label>
            <input type="number" value={rentaMensual} onChange={e => setRentaMensual(+e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* PLAN DE PAGOS */}
      <div style={sectionStyle}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Plan de pagos</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'14px'}}>
          <div>
            <label style={labelStyle}>Enganche (%)</label>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <input type="range" min="10" max="50" value={enganche} onChange={e => setEnganche(+e.target.value)} style={{flex:1,cursor:'pointer'}} />
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--dk)',minWidth:'35px'}}>{enganche}%</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Mensualidades durante construcción</label>
            {modo === 'proyecto' && selectedProject ? (
              <div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)'}}>{meses}</div>
                  <div style={{fontSize:'11px',color:'var(--mid)',lineHeight:1.3}}>meses restantes<br/>hasta entrega</div>
                </div>
                {(() => {
                  const proj = projects.find(p => p.id === selectedProject)
                  return proj?.entrega_quarter && proj?.entrega_year ? (
                    <div style={{fontSize:'10px',color:'var(--dim)',marginTop:'4px'}}>Entrega: {proj.entrega_quarter} {proj.entrega_year} · Cálculo automático</div>
                  ) : null
                })()}
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <select value={meses} onChange={e => setMeses(+e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1px solid var(--bd)',fontSize:'13px',fontFamily:'var(--sans)',outline:'none',cursor:'pointer',appearance:'none' as const,backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' viewBox=\'0 0 10 6\' fill=\'none\'%3E%3Cpath d=\'M1 1L5 5L9 1\' stroke=\'%23212D30\' stroke-opacity=\'.45\' stroke-width=\'1.3\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',backgroundRepeat:'no-repeat',backgroundPosition:'right 10px center',paddingRight:'30px'}}>
                  <option value={0}>Sin mensualidades</option>
                  {[3,6,9,12,15,18,24,30,36,42,48].map(m => (
                    <option key={m} value={m}>{m} meses{m <= 12 ? '' : m <= 24 ? ' (construcción)' : ' (largo plazo)'}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
          {[
            {l:'Enganche',v:`$${engancheMonto.toLocaleString('es-MX')}`,s:`${enganche}% del precio`},
            {l:meses>0?`${meses} mensualidades`:'Sin mensualidades',v:meses>0?`$${mensualidad.toLocaleString('es-MX')}/mes`:'—',s:meses>0?'durante construcción':'pago directo'},
            {l:'Pago final',v:`$${pagoFinal.toLocaleString('es-MX')}`,s:'al escriturar'},
          ].map((item,i) => (
            <div key={i} style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:'14px',fontWeight:600,color:'var(--gr)',marginBottom:'2px'}}>{item.v}</div>
              <div style={{fontSize:'10px',color:'var(--mid)',marginBottom:'1px'}}>{item.l}</div>
              <div style={{fontSize:'9px',color:'var(--dim)'}}>{item.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ESCENARIOS */}
      <div style={sectionStyle}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Análisis de escenarios</div>
        <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
          {[['vivir','🏠 Para vivir'],['rentar','🏢 Para rentar'],['revender','📈 Para revender']].map(([v,l]) => (
            <button key={v} onClick={() => setEscenario(v as typeof escenario)} style={{fontFamily:'var(--sans)',fontSize:'13px',padding:'9px 18px',borderRadius:'var(--rp)',border:escenario===v?'none':'1px solid var(--bd)',background:escenario===v?'var(--dk)':'var(--wh)',color:escenario===v?'#fff':'var(--mid)',cursor:'pointer',flex:1}}>{l}</button>
          ))}
        </div>

        {escenario === 'vivir' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>Costo total de adquisición</div>
              {[
                {l:'Precio de compra',v:`$${precio.toLocaleString('es-MX')}`},
                {l:'Gastos notariales (~6%)',v:`$${gastoNotarial.toLocaleString('es-MX')}`},
                {l:'Total desembolso',v:`$${(precio+gastoNotarial).toLocaleString('es-MX')}`,bold:true},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>
                  <span style={{color:'var(--mid)'}}>{r.l}</span>
                  <span style={{fontWeight: r.bold ? 700 : 500,color:'var(--dk)'}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',padding:'16px',border:'1px solid rgba(27,67,50,.15)'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--gr)',marginBottom:'10px'}}>Plusvalía en {años} año{años>1?'s':''}</div>
              <div style={{fontSize:'28px',fontWeight:700,color:'var(--gr)',marginBottom:'4px'}}>${valorFuturo.toLocaleString('es-MX')}</div>
              <div style={{fontSize:'12px',color:'var(--gr)',marginBottom:'12px'}}>+${gananciaReventa.toLocaleString('es-MX')} de ganancia potencial</div>
              <div style={{fontSize:'11px',color:'var(--mid)'}}>Con plusvalía de {plusvalia}%/año el valor sube {Math.round((valorFuturo/precio-1)*100)}% en {años} año{años>1?'s':''}</div>
            </div>
          </div>
        )}

        {escenario === 'rentar' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>Flujo de renta en {años} año{años>1?'s':''}</div>
              {[
                {l:'Renta mensual',v:`$${rentaMensual.toLocaleString('es-MX')}`},
                {l:'Renta anual',v:`$${rentaAnual.toLocaleString('es-MX')}`},
                {l:`Renta total (${años}a)`,v:`$${rentaTotal.toLocaleString('es-MX')}`,bold:true},
                {l:'ROI por renta',v:`${roiRenta}%/año`,bold:true},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>
                  <span style={{color:'var(--mid)'}}>{r.l}</span>
                  <span style={{fontWeight: r.bold ? 700 : 500,color:'var(--dk)'}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',padding:'16px',border:'1px solid rgba(27,67,50,.15)'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--gr)',marginBottom:'10px'}}>Retorno total en {años} año{años>1?'s':''}</div>
              <div style={{fontSize:'24px',fontWeight:700,color:'var(--gr)',marginBottom:'4px'}}>${(rentaTotal + gananciaReventa).toLocaleString('es-MX')}</div>
              <div style={{fontSize:'11px',color:'var(--gr)',marginBottom:'12px'}}>Renta + plusvalía combinadas</div>
              {[
                {l:'Solo por rentas',v:`$${rentaTotal.toLocaleString('es-MX')}`},
                {l:'Solo por plusvalía',v:`$${gananciaReventa.toLocaleString('es-MX')}`},
                {l:'ROI combinado',v:`${Math.round((rentaTotal+gananciaReventa)/precio*100)}%`},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'11px',padding:'3px 0',borderBottom:'1px solid rgba(27,67,50,.1)'}}>
                  <span style={{color:'var(--mid)'}}>{r.l}</span>
                  <span style={{fontWeight:600,color:'var(--gr)'}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {escenario === 'revender' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>Proyección de reventa en {años} año{años>1?'s':''}</div>
              {[
                {l:'Precio de compra hoy',v:`$${precio.toLocaleString('es-MX')}`},
                {l:`Valor estimado en ${años}a`,v:`$${valorFuturo.toLocaleString('es-MX')}`,bold:true},
                {l:'Ganancia bruta',v:`$${gananciaReventa.toLocaleString('es-MX')}`,bold:true},
                {l:'Ganancia neta (~ISR 30%)',v:`$${Math.round(gananciaReventa*0.7).toLocaleString('es-MX')}`},
                {l:'ROI total',v:`${Math.round(gananciaReventa/precio*100)}%`},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>
                  <span style={{color:'var(--mid)'}}>{r.l}</span>
                  <span style={{fontWeight: r.bold ? 700 : 500,color: r.bold ? 'var(--gr)' : 'var(--dk)'}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',padding:'16px',border:'1px solid rgba(27,67,50,.15)'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--gr)',marginBottom:'10px'}}>¿Cuándo recuperas la inversión?</div>
              <div style={{fontSize:'24px',fontWeight:700,color:'var(--gr)',marginBottom:'4px'}}>{Math.round(100/plusvalia*10)/10} años</div>
              <div style={{fontSize:'11px',color:'var(--gr)',marginBottom:'14px'}}>Con plusvalía de {plusvalia}%/año</div>
              <div style={{fontSize:'11px',color:'var(--mid)',lineHeight:1.6}}>La preventa permite comprar hoy al precio actual y revender después de la entrega con la plusvalía acumulada durante la construcción.</div>
            </div>
          </div>
        )}
      </div>

      <div style={{fontSize:'10px',color:'var(--dim)',textAlign:'center',lineHeight:1.6}}>
        * Las proyecciones son estimadas y no garantizan rendimientos futuros. La plusvalía real depende de factores de mercado.
      </div>
    </div>
  )
}
