'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ALCALDIAS = ['Álvaro Obregón','Azcapotzalco','Benito Juárez','Coyoacán','Cuajimalpa','Cuauhtémoc','GAM','Iztacalco','Iztapalapa','Magdalena Contreras','Miguel Hidalgo','Milpa Alta','Tláhuac','Tlalpan','Venustiano Carranza','Xochimilco']
const AMENIDADES_OPTS = ['Roof garden','Gimnasio','Lobby doble altura','Estacionamiento','Bici estacionamiento','Seguridad 24/7','CCTV','Elevadores','Pet friendly','Áreas verdes','Alberca','Salón de eventos','Coworking','Cuarto de servicio','Bodega','Accesibilidad']

export default function NuevoProyectoPage() {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [devId, setDevId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // FORM STATE
  const [form, setForm] = useState({
    // Paso 1 — Info general
    nombre: '',
    tipo: 'Residencial',
    estado: 'Preventa',
    calle: '',
    colonia: '',
    alcaldia: 'Benito Juárez',
    cp: '',
    descripcion: '',
    // Paso 2 — Precios y entrega
    precio_desde: '',
    precio_hasta: '',
    total_unidades: '',
    entrega_quarter: 'T2',
    entrega_year: '2026',
    plusvalia_pct: '8',
    comision_pct: '3',
    // Paso 3 — Plan de pagos
    enganche_pct: '20',
    mensualidades_num: '18',
    // Paso 4 — Etapas
    etapa_actual: 'Construcción',
    // Paso 5 — Amenidades
    amenidades: [] as string[],
  })

  // Esquemas de pago dinámicos
  const [esquemas, setEsquemas] = useState([
    { nombre: 'Plan estándar', enganche_pct: 20, mensualidades_num: 18, pct_mensualidades: 40, pct_pago_final: 40, acepta_credito: true, descuento_contado_pct: 0, notas: '', es_default: true }
  ])

  function addEsquema() {
    setEsquemas(prev => [...prev, { nombre: '', enganche_pct: 20, mensualidades_num: 18, pct_mensualidades: 40, pct_pago_final: 40, acepta_credito: true, descuento_contado_pct: 0, notas: '', es_default: false }])
  }

  function removeEsquema(idx: number) {
    setEsquemas(prev => prev.filter((_, i) => i !== idx))
  }

  function updEsquema(idx: number, key: string, val: unknown) {
    setEsquemas(prev => prev.map((e, i) => i === idx ? { ...e, [key]: val } : e))
  }

  function setDefaultEsquema(idx: number) {
    setEsquemas(prev => prev.map((e, i) => ({ ...e, es_default: i === idx })))
  }

  // Etapas dinámicas
  const [etapas, setEtapas] = useState([
    { name: 'Diseño', date: '' },
    { name: 'Permisos', date: '' },
    { name: 'Construcción', date: '' },
    { name: 'Acabados', date: '' },
    { name: 'Entrega', date: '' },
  ])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('desarrolladoras').select('id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setDevId(data.id) })
    })
  }, [])

  function upd(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function toggleAmenidad(a: string) {
    setForm(prev => ({
      ...prev,
      amenidades: prev.amenidades.includes(a)
        ? prev.amenidades.filter(x => x !== a)
        : [...prev.amenidades, a]
    }))
  }

  function updEtapa(i: number, key: string, val: string) {
    setEtapas(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e))
  }

  // Progreso
  const totalSteps = 5
  const pct = Math.round((step / totalSteps) * 100)

  async function handleSubmit() {
    if (!devId) return
    setSaving(true)
    setError('')
    try {
      const { data, error: err } = await supabase.from('projects').insert({
        desarrolladora_id: devId,
        nombre: form.nombre,
        tipo: form.tipo as 'Residencial'|'Boutique'|'Corporativo'|'Mixto',
        estado: form.estado as 'Preventa'|'En construcción'|'Entrega inmediata',
        calle: form.calle,
        colonia: form.colonia,
        alcaldia: form.alcaldia,
        cp: form.cp,
        descripcion: form.descripcion,
        precio_desde: parseFloat(form.precio_desde) || 0,
        precio_hasta: parseFloat(form.precio_hasta) || null,
        total_unidades: parseInt(form.total_unidades) || null,
        entrega_quarter: form.entrega_quarter as 'T1'|'T2'|'T3'|'T4',
        entrega_year: parseInt(form.entrega_year),
        plusvalia_pct: parseFloat(form.plusvalia_pct) || 8,
        comision_pct: parseFloat(form.comision_pct) || 3,
        etapa_actual: form.etapa_actual as 'Diseño'|'Permisos'|'Construcción'|'Acabados'|'Entrega',
        etapas: etapas.filter(e => e.date),
        plan_pagos: {
          enganche_pct: parseFloat(form.enganche_pct) || 20,
          mensualidades_num: parseInt(form.mensualidades_num) || 18
        },
        amenidades: form.amenidades,
        publicado: false,
        destacado: false,
        estado_publicacion: 'borrador',
        historial_precios: [{
          date: new Date().toLocaleDateString('es-MX', { month:'short', year:'numeric' }),
          precio: parseFloat(form.precio_desde) || 0
        }],
      }).select().single()

      if (err) { setError(err.message); setSaving(false); return }

      // Insertar esquemas de pago
      if (esquemas.length > 0) {
        await supabase.from('esquemas_pago').insert(
          esquemas.map((e, i) => ({
            project_id: data.id,
            nombre: e.nombre || `Plan ${i + 1}`,
            enganche_pct: e.enganche_pct,
            mensualidades_num: e.mensualidades_num,
            pct_mensualidades: e.pct_mensualidades,
            pct_pago_final: e.pct_pago_final,
            acepta_credito: e.acepta_credito,
            descuento_contado_pct: e.descuento_contado_pct,
            es_default: e.es_default,
            notas: e.notas || null,
            orden: i,
          }))
        )
      }

      router.push(`/desarrolladores/proyectos/${data.id}/unidades`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setSaving(false)
    }
  }

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:'8px',
    border:'1px solid var(--bd)', fontSize:'13px',
    fontFamily:'var(--sans)', outline:'none',
    background:'var(--wh)', color:'var(--dk)',
    boxSizing:'border-box' as const
  }

  const labelStyle = {
    fontSize:'12px', fontWeight:500 as const,
    color:'var(--dk)', display:'block' as const, marginBottom:'5px'
  }

  const selectStyle = {
    ...inputStyle,
    appearance:'none' as const,
    backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23212D30' stroke-opacity='.45' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat:'no-repeat' as const,
    backgroundPosition:'right 10px center' as const,
    paddingRight:'30px'
  }

  const gridStyle = {
    display:'grid', gap:'14px'
  }

  return (
    <div style={{maxWidth:'700px'}}>
      {/* HEADER */}
      <div style={{marginBottom:'28px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>
          Nuevo proyecto
        </div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>
          Paso {step} de {totalSteps} — {['Info general','Precios y entrega','Plan de pagos','Etapas del proyecto','Amenidades'][step-1]}
        </div>
      </div>

      {/* BARRA DE PROGRESO */}
      <div style={{background:'var(--bg2)',borderRadius:'var(--rp)',height:'6px',marginBottom:'28px',overflow:'hidden'}}>
        <div style={{height:'100%',background:'var(--dk)',borderRadius:'var(--rp)',width:`${pct}%`,transition:'width .3s'}} />
      </div>

      {/* PASOS */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'28px',marginBottom:'20px'}}>

        {/* PASO 1 — INFO GENERAL */}
        {step === 1 && (
          <div style={gridStyle}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'4px'}}>
              Información general del proyecto
            </div>

            <div>
              <label style={labelStyle}>Nombre del proyecto *</label>
              <input style={inputStyle} value={form.nombre} onChange={e=>upd('nombre',e.target.value)} placeholder="Ej: ARQ Living · Tamaulipas 89" />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Tipo *</label>
                <select style={selectStyle} value={form.tipo} onChange={e=>upd('tipo',e.target.value)}>
                  <option>Residencial</option>
                  <option>Boutique</option>
                  <option>Corporativo</option>
                  <option>Mixto</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Estado actual *</label>
                <select style={selectStyle} value={form.estado} onChange={e=>upd('estado',e.target.value)}>
                  <option>Preventa</option>
                  <option>En construcción</option>
                  <option>Entrega inmediata</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Calle y número *</label>
              <input style={inputStyle} value={form.calle} onChange={e=>upd('calle',e.target.value)} placeholder="Ej: Calle Tamaulipas 89" />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Colonia *</label>
                <input style={inputStyle} value={form.colonia} onChange={e=>upd('colonia',e.target.value)} placeholder="Ej: Del Valle" />
              </div>
              <div>
                <label style={labelStyle}>Alcaldía *</label>
                <select style={selectStyle} value={form.alcaldia} onChange={e=>upd('alcaldia',e.target.value)}>
                  {ALCALDIAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>CP</label>
                <input style={inputStyle} value={form.cp} onChange={e=>upd('cp',e.target.value)} placeholder="03100" maxLength={5} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Descripción del proyecto</label>
              <textarea
                style={{...inputStyle, minHeight:'100px', resize:'vertical'}}
                value={form.descripcion}
                onChange={e=>upd('descripcion',e.target.value)}
                placeholder="Describe el proyecto: características, acabados, concepto arquitectónico..."
              />
            </div>
          </div>
        )}

        {/* PASO 2 — PRECIOS Y ENTREGA */}
        {step === 2 && (
          <div style={gridStyle}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'4px'}}>
              Precios y fecha de entrega
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Precio desde (MXN) *</label>
                <input style={inputStyle} type="number" value={form.precio_desde} onChange={e=>upd('precio_desde',e.target.value)} placeholder="6500000" />
                {form.precio_desde && <div style={{fontSize:'11px',color:'var(--gr)',marginTop:'4px'}}>= ${parseFloat(form.precio_desde).toLocaleString('es-MX')} MXN</div>}
              </div>
              <div>
                <label style={labelStyle}>Precio hasta (MXN)</label>
                <input style={inputStyle} type="number" value={form.precio_hasta} onChange={e=>upd('precio_hasta',e.target.value)} placeholder="14500000" />
                {form.precio_hasta && <div style={{fontSize:'11px',color:'var(--gr)',marginTop:'4px'}}>= ${parseFloat(form.precio_hasta).toLocaleString('es-MX')} MXN</div>}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Total de unidades</label>
                <input style={inputStyle} type="number" value={form.total_unidades} onChange={e=>upd('total_unidades',e.target.value)} placeholder="24" />
              </div>
              <div>
                <label style={labelStyle}>Plusvalía anual estimada (%)</label>
                <input style={inputStyle} type="number" value={form.plusvalia_pct} onChange={e=>upd('plusvalia_pct',e.target.value)} placeholder="8" min="0" max="30" />
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Entrega estimada</label>
                <div style={{display:'flex',gap:'8px'}}>
                  <select style={{...selectStyle,flex:1}} value={form.entrega_quarter} onChange={e=>upd('entrega_quarter',e.target.value)}>
                    <option>T1</option><option>T2</option><option>T3</option><option>T4</option>
                  </select>
                  <select style={{...selectStyle,flex:1}} value={form.entrega_year} onChange={e=>upd('entrega_year',e.target.value)}>
                    {[2025,2026,2027,2028,2029].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Comisión para asesores (%)</label>
                <input style={inputStyle} type="number" value={form.comision_pct} onChange={e=>upd('comision_pct',e.target.value)} placeholder="3" min="0" max="10" step="0.5" />
                {form.comision_pct && form.precio_desde && (
                  <div style={{fontSize:'11px',color:'var(--gr)',marginTop:'4px'}}>
                    = ${Math.round(parseFloat(form.precio_desde) * parseFloat(form.comision_pct) / 100).toLocaleString('es-MX')} por unidad base
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PASO 3 — PLAN DE PAGOS */}
        {step === 3 && (
          <div style={gridStyle}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <div>
                <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>Esquemas de pago</div>
                <div style={{fontSize:'11px',color:'var(--mid)',marginTop:'2px'}}>Agrega hasta 4 formas de pago diferentes</div>
              </div>
              {esquemas.length < 4 && (
                <button onClick={addEsquema} style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'6px 14px',borderRadius:'var(--rp)',background:'var(--dk)',color:'#fff',border:'none',cursor:'pointer'}}>+ Agregar esquema</button>
              )}
            </div>

            {esquemas.map((esq, idx) => {
              const precio = parseFloat(form.precio_desde) || 0
              const engMonto = Math.round(precio * esq.enganche_pct / 100)
              const resto = precio - engMonto
              const mensMonto = esq.mensualidades_num > 0 ? Math.round(resto * esq.pct_mensualidades / 100 / esq.mensualidades_num) : 0
              const finalMonto = Math.round(resto * esq.pct_pago_final / 100)

              return (
                <div key={idx} style={{background:'var(--wh)',border: esq.es_default ? '2px solid var(--gr)' : '1px solid var(--bd)',borderRadius:'var(--r)',padding:'16px',marginBottom:'10px',position:'relative'}}>
                  {esq.es_default && <div style={{position:'absolute',top:'-8px',left:'12px',fontSize:'9px',fontWeight:600,background:'var(--gr)',color:'#fff',padding:'1px 8px',borderRadius:'var(--rp)'}}>DEFAULT</div>}
                  
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <input style={{...inputStyle,width:'200px',fontWeight:500}} value={esq.nombre} onChange={e=>updEsquema(idx,'nombre',e.target.value)} placeholder="Nombre del esquema" />
                    <div style={{display:'flex',gap:'6px'}}>
                      {!esq.es_default && <button onClick={()=>setDefaultEsquema(idx)} style={{fontFamily:'var(--sans)',fontSize:'10px',padding:'4px 10px',borderRadius:'var(--rp)',background:'var(--bg2)',color:'var(--dk)',border:'1px solid var(--bd)',cursor:'pointer'}}>Hacer default</button>}
                      {esquemas.length > 1 && <button onClick={()=>removeEsquema(idx)} style={{fontFamily:'var(--sans)',fontSize:'10px',padding:'4px 10px',borderRadius:'var(--rp)',background:'#FEE2E2',color:'#DC2626',border:'none',cursor:'pointer'}}>Eliminar</button>}
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                    <div>
                      <label style={labelStyle}>Enganche (%)</label>
                      <input style={inputStyle} type="number" value={esq.enganche_pct} onChange={e=>updEsquema(idx,'enganche_pct',+e.target.value)} min="5" max="100" />
                    </div>
                    <div>
                      <label style={labelStyle}>% a mensualidades</label>
                      <input style={inputStyle} type="number" value={esq.pct_mensualidades} onChange={e=>updEsquema(idx,'pct_mensualidades',+e.target.value)} min="0" max="100" />
                    </div>
                    <div>
                      <label style={labelStyle}>% pago final</label>
                      <input style={inputStyle} type="number" value={esq.pct_pago_final} onChange={e=>updEsquema(idx,'pct_pago_final',+e.target.value)} min="0" max="100" />
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                    <div>
                      <label style={labelStyle}>Mensualidades (#)</label>
                      <input style={inputStyle} type="number" value={esq.mensualidades_num} onChange={e=>updEsquema(idx,'mensualidades_num',+e.target.value)} min="0" max="60" />
                    </div>
                    <div>
                      <label style={labelStyle}>Descuento contado (%)</label>
                      <input style={inputStyle} type="number" value={esq.descuento_contado_pct} onChange={e=>updEsquema(idx,'descuento_contado_pct',+e.target.value)} min="0" max="30" />
                    </div>
                  </div>

                  <div style={{display:'flex',gap:'16px',alignItems:'center',marginBottom:'12px'}}>
                    <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'var(--dk)',cursor:'pointer'}}>
                      <input type="checkbox" checked={esq.acepta_credito} onChange={e=>updEsquema(idx,'acepta_credito',e.target.checked)} />
                      Acepta crédito hipotecario
                    </label>
                    <input style={{...inputStyle,flex:1}} value={esq.notas} onChange={e=>updEsquema(idx,'notas',e.target.value)} placeholder="Notas adicionales (opcional)" />
                  </div>

                  {/* Validación distribución */}
                  {esq.enganche_pct + esq.pct_mensualidades + esq.pct_pago_final !== 100 && (
                    <div style={{fontSize:'11px',color:'#DC2626',background:'#FEE2E2',padding:'6px 10px',borderRadius:'var(--rs)',marginBottom:'10px'}}>
                      ⚠️ Enganche ({esq.enganche_pct}%) + Mensualidades ({esq.pct_mensualidades}%) + Pago final ({esq.pct_pago_final}%) = {esq.enganche_pct + esq.pct_mensualidades + esq.pct_pago_final}% — debe sumar 100%
                    </div>
                  )}

                  {/* Preview */}
                  {precio > 0 && (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
                      {[
                        {l:'Enganche',v:`$${engMonto.toLocaleString('es-MX')}`,s:`${esq.enganche_pct}%`},
                        {l:'Mensualidades',v:esq.mensualidades_num>0?`$${mensMonto.toLocaleString('es-MX')}/mes`:'—',s:esq.mensualidades_num>0?`${esq.mensualidades_num} pagos`:'Sin mensualidades'},
                        {l:'Pago final',v:`$${finalMonto.toLocaleString('es-MX')}`,s:'Al escriturar'},
                      ].map((item,i) => (
                        <div key={i} style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'10px',textAlign:'center'}}>
                          <div style={{fontSize:'13px',fontWeight:500,color:'var(--gr)'}}>{item.v}</div>
                          <div style={{fontSize:'10px',color:'var(--mid)',marginTop:'2px'}}>{item.l}</div>
                          <div style={{fontSize:'9px',color:'var(--dim)'}}>{item.s}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* PASO 4 — ETAPAS */}
        {step === 4 && (
          <div style={gridStyle}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'4px'}}>
              Etapas del proyecto
            </div>

            <div>
              <label style={labelStyle}>Etapa actual</label>
              <select style={selectStyle} value={form.etapa_actual} onChange={e=>upd('etapa_actual',e.target.value)}>
                <option>Diseño</option>
                <option>Permisos</option>
                <option>Construcción</option>
                <option>Acabados</option>
                <option>Entrega</option>
              </select>
            </div>

            <div>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>
                Fechas por etapa
              </div>
              <div style={{display:'grid',gap:'8px'}}>
                {etapas.map((e,i) => {
                  const isActual = e.name === form.etapa_actual
                  const isDone = etapas.findIndex(x => x.name === form.etapa_actual) > i
                  return (
                    <div key={i} style={{
                      display:'flex',alignItems:'center',gap:'12px',
                      padding:'10px 14px',borderRadius:'var(--rs)',
                      background: isActual ? 'var(--gr-bg)' : isDone ? 'var(--bg2)' : 'var(--bg)',
                      border: isActual ? '1px solid rgba(27,67,50,.2)' : '1px solid var(--bd2)'
                    }}>
                      <div style={{
                        width:'8px',height:'8px',borderRadius:'50%',flexShrink:0,
                        background: isDone ? 'var(--gr)' : isActual ? 'var(--gr)' : 'var(--bd)',
                      }} />
                      <div style={{fontSize:'13px',fontWeight: isActual ? 500 : 400,color: isActual ? 'var(--gr)' : 'var(--dk)',minWidth:'100px'}}>
                        {e.name}
                        {isActual && <span style={{fontSize:'10px',marginLeft:'6px',color:'var(--gr)'}}>← Actual</span>}
                      </div>
                      <input
                        style={{...inputStyle,flex:1,padding:'6px 10px',fontSize:'12px'}}
                        value={e.date}
                        onChange={ev => updEtapa(i,'date',ev.target.value)}
                        placeholder="Ej: Jun 2026"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* PASO 5 — AMENIDADES */}
        {step === 5 && (
          <div style={gridStyle}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'4px'}}>
              Amenidades
            </div>
            <div style={{fontSize:'12px',color:'var(--mid)',marginBottom:'8px'}}>
              Selecciona todas las amenidades que incluye el proyecto
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px'}}>
              {AMENIDADES_OPTS.map(a => {
                const selected = form.amenidades.includes(a)
                return (
                  <div
                    key={a}
                    onClick={() => toggleAmenidad(a)}
                    style={{
                      display:'flex',alignItems:'center',gap:'10px',
                      padding:'10px 14px',borderRadius:'var(--rs)',cursor:'pointer',
                      border: selected ? '1.5px solid var(--dk)' : '1px solid var(--bd)',
                      background: selected ? 'var(--bg2)' : 'var(--wh)',
                      transition:'all .15s'
                    }}
                  >
                    <div style={{
                      width:'16px',height:'16px',borderRadius:'4px',flexShrink:0,
                      background: selected ? 'var(--dk)' : 'transparent',
                      border: selected ? 'none' : '1.5px solid var(--bd)',
                      display:'flex',alignItems:'center',justifyContent:'center'
                    }}>
                      {selected && <span style={{color:'#fff',fontSize:'10px',fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:'13px',color: selected ? 'var(--dk)' : 'var(--mid)',fontWeight: selected ? 500 : 400}}>{a}</span>
                  </div>
                )
              })}
            </div>

            {form.amenidades.length > 0 && (
              <div style={{background:'var(--gr-bg)',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--gr)',marginTop:'4px'}}>
                ✓ {form.amenidades.length} amenidad{form.amenidades.length !== 1 ? 'es' : ''} seleccionada{form.amenidades.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div style={{background:'var(--rd-bg)',border:'1px solid #FCA5A5',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--rd)',marginBottom:'14px'}}>
          {error}
        </div>
      )}

      {/* NAVEGACIÓN */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <button
          onClick={() => setStep(s => Math.max(1, s-1))}
          disabled={step === 1}
          style={{
            fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',
            color: step === 1 ? 'var(--dim)' : 'var(--dk)',
            border:'1px solid var(--bd)',borderRadius:'var(--rp)',
            padding:'10px 22px',cursor: step === 1 ? 'default' : 'pointer'
          }}
        >← Anterior</button>

        <div style={{display:'flex',gap:'6px'}}>
          {Array.from({length:totalSteps},(_,i) => (
            <div key={i} style={{
              width: step === i+1 ? '20px' : '7px',
              height:'7px',borderRadius:'var(--rp)',
              background: i+1 <= step ? 'var(--dk)' : 'var(--bd)',
              transition:'all .2s'
            }} />
          ))}
        </div>

        {step < totalSteps ? (
          <button
            onClick={() => {
              if (step === 1 && !form.nombre) { setError('El nombre del proyecto es requerido'); return }
              if (step === 1 && !form.calle) { setError('La calle es requerida'); return }
              if (step === 1 && !form.colonia) { setError('La colonia es requerida'); return }
              if (step === 2 && !form.precio_desde) { setError('El precio desde es requerido'); return }
              setError('')
              setStep(s => s+1)
            }}
            style={{
              fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',
              color:'#fff',border:'none',borderRadius:'var(--rp)',
              padding:'10px 22px',cursor:'pointer'
            }}
          >Siguiente →</button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              fontFamily:'var(--sans)',fontSize:'13px',background:'var(--gr)',
              color:'#fff',border:'none',borderRadius:'var(--rp)',
              padding:'10px 22px',cursor:'pointer',opacity: saving ? 0.7 : 1
            }}
          >{saving ? 'Guardando...' : '✓ Crear proyecto'}</button>
        )}
      </div>
    </div>
  )
}
