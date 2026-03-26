'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ALCALDIAS = ['Álvaro Obregón','Azcapotzalco','Benito Juárez','Coyoacán','Cuajimalpa','Cuauhtémoc','GAM','Iztacalco','Iztapalapa','Magdalena Contreras','Miguel Hidalgo','Milpa Alta','Tláhuac','Tlalpan','Venustiano Carranza','Xochimilco']
const AMENIDADES_OPTS = ['Roof garden','Gimnasio','Lobby doble altura','Estacionamiento','Bici estacionamiento','Seguridad 24/7','CCTV','Elevadores','Pet friendly','Áreas verdes','Alberca','Salón de eventos','Coworking','Cuarto de servicio','Bodega','Accesibilidad']

export default function EditarProyectoPage({ params }: { params: { id: string } }) {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('general')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    nombre: '', tipo: 'Residencial', estado: 'Preventa',
    calle: '', colonia: '', alcaldia: 'Benito Juárez', cp: '',
    descripcion: '', precio_desde: '', precio_hasta: '',
    total_unidades: '', entrega_quarter: 'T2', entrega_year: '2026',
    plusvalia_pct: '8', comision_pct: '3', etapa_actual: 'Construcción',
    enganche_pct: '20', mensualidades_num: '18',
    amenidades: [] as string[],
    estado_publicacion: 'borrador',
  })

  const [etapas, setEtapas] = useState([
    { name:'Diseño', date:'' },
    { name:'Permisos', date:'' },
    { name:'Construcción', date:'' },
    { name:'Acabados', date:'' },
    { name:'Entrega', date:'' },
  ])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('projects').select('*').eq('id', params.id).single()
      if (!data) return
      const pp = data.plan_pagos || {}
      setForm({
        nombre: data.nombre || '',
        tipo: data.tipo || 'Residencial',
        estado: data.estado || 'Preventa',
        calle: data.calle || '',
        colonia: data.colonia || '',
        alcaldia: data.alcaldia || 'Benito Juárez',
        cp: data.cp || '',
        descripcion: data.descripcion || '',
        precio_desde: data.precio_desde?.toString() || '',
        precio_hasta: data.precio_hasta?.toString() || '',
        total_unidades: data.total_unidades?.toString() || '',
        entrega_quarter: data.entrega_quarter || 'T2',
        entrega_year: data.entrega_year?.toString() || '2026',
        plusvalia_pct: data.plusvalia_pct?.toString() || '8',
        comision_pct: data.comision_pct?.toString() || '3',
        etapa_actual: data.etapa_actual || 'Construcción',
        enganche_pct: pp.enganche_pct?.toString() || '20',
        mensualidades_num: pp.mensualidades_num?.toString() || '18',
        amenidades: data.amenidades || [],
        estado_publicacion: data.estado_publicacion || 'borrador',
      })
      if (data.etapas?.length) setEtapas(data.etapas)
      setLoading(false)
    }
    load()
  }, [params.id])

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

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    const { error: err } = await supabase.from('projects').update({
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
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)
    if (err) { setError(err.message) }
    else { setSuccess('Proyecto guardado correctamente') }
    setSaving(false)
  }

  async function handlePublicar() {
    const newEP = form.estado_publicacion === 'publicado' ? 'borrador' : 'en_revision'
    const { error: err } = await supabase.from('projects').update({
      estado_publicacion: newEP,
      publicado: (newEP as string) === 'publicado',
      submitted_at: newEP === 'en_revision' ? new Date().toISOString() : null,
    }).eq('id', params.id)
    if (!err) {
      setForm(prev => ({ ...prev, estado_publicacion: newEP }))
      setSuccess(newEP === 'en_revision' ? 'Proyecto enviado a revisión' : 'Proyecto despublicado')
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
    ...inputStyle, appearance:'none' as const,
    backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23212D30' stroke-opacity='.45' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat:'no-repeat' as const,
    backgroundPosition:'right 10px center' as const,
    paddingRight:'30px'
  }

  const tabStyle = (id: string) => ({
    fontSize:'13px', padding:'10px 0', marginRight:'22px',
    color: activeTab === id ? 'var(--dk)' : 'var(--mid)',
    borderTop:'none', borderLeft:'none', borderRight:'none',
    borderBottomWidth:'2px', borderBottomStyle:'solid' as const,
    borderBottomColor: activeTab === id ? 'var(--dk)' : 'transparent',
    marginBottom:'-1px', cursor:'pointer',
    fontWeight: activeTab === id ? 500 : 400,
    background:'transparent', fontFamily:'var(--sans)',
    whiteSpace:'nowrap' as const
  })

  const epStyle = (() => {
    if (form.estado_publicacion === 'publicado') return {bg:'#DCFCE7',color:'#15803D',label:'Publicado'}
    if (form.estado_publicacion === 'en_revision') return {bg:'#FEF9C3',color:'#A16207',label:'En revisión'}
    if (form.estado_publicacion === 'rechazado') return {bg:'#FEE2E2',color:'#DC2626',label:'Rechazado'}
    return {bg:'var(--bg2)',color:'var(--mid)',label:'Borrador'}
  })()

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando...</div>

  return (
    <div style={{maxWidth:'800px'}}>
      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
            <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)'}}>{form.nombre}</div>
            <span style={{fontSize:'11px',fontWeight:500,padding:'3px 10px',borderRadius:'var(--rp)',background:epStyle.bg,color:epStyle.color}}>{epStyle.label}</span>
          </div>
          <div style={{fontSize:'13px',color:'var(--mid)'}}>
            {form.colonia}, {form.alcaldia}
          </div>
        </div>
        <div style={{display:'flex',gap:'8px',flexShrink:0}}>
          <a href={`/desarrolladores/proyectos/${params.id}/unidades`} style={{
            fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',
            color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',
            padding:'8px 16px',textDecoration:'none',display:'flex',alignItems:'center',gap:'5px'
          }}>📋 Unidades</a>
          <a href={`/desarrolladores/proyectos/${params.id}/avance`} style={{
            fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',
            color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',
            padding:'8px 16px',textDecoration:'none',display:'flex',alignItems:'center',gap:'5px'
          }}>📸 Avance de obra</a>
          <button onClick={handlePublicar} style={{
            fontFamily:'var(--sans)',fontSize:'12px',cursor:'pointer',
            borderRadius:'var(--rp)',padding:'8px 16px',border:'none',
            background: form.estado_publicacion === 'publicado' ? 'var(--rd-bg)' : form.estado_publicacion === 'en_revision' ? 'var(--am-bg)' : 'var(--gr)',
            color: form.estado_publicacion === 'publicado' ? 'var(--rd)' : form.estado_publicacion === 'en_revision' ? 'var(--am)' : '#fff',
          }}>
            {form.estado_publicacion === 'publicado' ? '⏸ Despublicar' : form.estado_publicacion === 'en_revision' ? '⏳ En revisión' : '🚀 Enviar a revisión'}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{borderBottom:'1px solid var(--bd)',marginBottom:'24px',display:'flex',overflowX:'auto',scrollbarWidth:'none'}}>
        {[
          {id:'general',label:'Info general'},
          {id:'precios',label:'Precios'},
          {id:'etapas',label:'Etapas'},
          {id:'amenidades',label:'Amenidades'},
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'28px',marginBottom:'20px'}}>

        {/* TAB: GENERAL */}
        {activeTab === 'general' && (
          <div style={{display:'grid',gap:'14px'}}>
            <div>
              <label style={labelStyle}>Nombre del proyecto *</label>
              <input style={inputStyle} value={form.nombre} onChange={e=>upd('nombre',e.target.value)} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select style={selectStyle} value={form.tipo} onChange={e=>upd('tipo',e.target.value)}>
                  <option>Residencial</option><option>Boutique</option><option>Corporativo</option><option>Mixto</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Estado actual</label>
                <select style={selectStyle} value={form.estado} onChange={e=>upd('estado',e.target.value)}>
                  <option>Preventa</option><option>En construcción</option><option>Entrega inmediata</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Calle y número</label>
              <input style={inputStyle} value={form.calle} onChange={e=>upd('calle',e.target.value)} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Colonia</label>
                <input style={inputStyle} value={form.colonia} onChange={e=>upd('colonia',e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Alcaldía</label>
                <select style={selectStyle} value={form.alcaldia} onChange={e=>upd('alcaldia',e.target.value)}>
                  {ALCALDIAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>CP</label>
                <input style={inputStyle} value={form.cp} onChange={e=>upd('cp',e.target.value)} maxLength={5} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea style={{...inputStyle,minHeight:'100px',resize:'vertical'}} value={form.descripcion} onChange={e=>upd('descripcion',e.target.value)} />
            </div>
          </div>
        )}

        {/* TAB: PRECIOS */}
        {activeTab === 'precios' && (
          <div style={{display:'grid',gap:'14px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Precio desde (MXN)</label>
                <input style={inputStyle} type="number" value={form.precio_desde} onChange={e=>upd('precio_desde',e.target.value)} />
                {form.precio_desde && <div style={{fontSize:'11px',color:'var(--gr)',marginTop:'4px'}}>${parseFloat(form.precio_desde).toLocaleString('es-MX')}</div>}
              </div>
              <div>
                <label style={labelStyle}>Precio hasta (MXN)</label>
                <input style={inputStyle} type="number" value={form.precio_hasta} onChange={e=>upd('precio_hasta',e.target.value)} />
                {form.precio_hasta && <div style={{fontSize:'11px',color:'var(--gr)',marginTop:'4px'}}>${parseFloat(form.precio_hasta).toLocaleString('es-MX')}</div>}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Total de unidades</label>
                <input style={inputStyle} type="number" value={form.total_unidades} onChange={e=>upd('total_unidades',e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Comisión asesores (%)</label>
                <input style={inputStyle} type="number" value={form.comision_pct} onChange={e=>upd('comision_pct',e.target.value)} />
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
                <label style={labelStyle}>Plusvalía anual (%)</label>
                <input style={inputStyle} type="number" value={form.plusvalia_pct} onChange={e=>upd('plusvalia_pct',e.target.value)} />
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Enganche (%)</label>
                <input style={inputStyle} type="number" value={form.enganche_pct} onChange={e=>upd('enganche_pct',e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Número de mensualidades</label>
                <input style={inputStyle} type="number" value={form.mensualidades_num} onChange={e=>upd('mensualidades_num',e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* TAB: ETAPAS */}
        {activeTab === 'etapas' && (
          <div style={{display:'grid',gap:'14px'}}>
            <div>
              <label style={labelStyle}>Etapa actual</label>
              <select style={selectStyle} value={form.etapa_actual} onChange={e=>upd('etapa_actual',e.target.value)}>
                <option>Diseño</option><option>Permisos</option><option>Construcción</option><option>Acabados</option><option>Entrega</option>
              </select>
            </div>
            <div style={{display:'grid',gap:'8px'}}>
              {etapas.map((e,i) => {
                const isActual = e.name === form.etapa_actual
                const isDone = etapas.findIndex(x => x.name === form.etapa_actual) > i
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',borderRadius:'var(--rs)',background: isActual ? 'var(--gr-bg)' : isDone ? 'var(--bg2)' : 'var(--bg)',border: isActual ? '1px solid rgba(27,67,50,.2)' : '1px solid var(--bd2)'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',flexShrink:0,background: isDone||isActual ? 'var(--gr)' : 'var(--bd)'}} />
                    <div style={{fontSize:'13px',fontWeight: isActual ? 500 : 400,color: isActual ? 'var(--gr)' : 'var(--dk)',minWidth:'100px'}}>
                      {e.name}{isActual && <span style={{fontSize:'10px',marginLeft:'6px',color:'var(--gr)'}}>← Actual</span>}
                    </div>
                    <input style={{...inputStyle,flex:1,padding:'6px 10px',fontSize:'12px'}} value={e.date} onChange={ev => setEtapas(prev => prev.map((x,idx) => idx===i ? {...x,date:ev.target.value} : x))} placeholder="Ej: Jun 2026" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB: AMENIDADES */}
        {activeTab === 'amenidades' && (
          <div>
            <div style={{fontSize:'12px',color:'var(--mid)',marginBottom:'12px'}}>Selecciona las amenidades del proyecto</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px'}}>
              {AMENIDADES_OPTS.map(a => {
                const selected = form.amenidades.includes(a)
                return (
                  <div key={a} onClick={() => toggleAmenidad(a)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',borderRadius:'var(--rs)',cursor:'pointer',border: selected ? '1.5px solid var(--dk)' : '1px solid var(--bd)',background: selected ? 'var(--bg2)' : 'var(--wh)',transition:'all .15s'}}>
                    <div style={{width:'16px',height:'16px',borderRadius:'4px',flexShrink:0,background: selected ? 'var(--dk)' : 'transparent',border: selected ? 'none' : '1.5px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {selected && <span style={{color:'#fff',fontSize:'10px',fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:'13px',color: selected ? 'var(--dk)' : 'var(--mid)',fontWeight: selected ? 500 : 400}}>{a}</span>
                  </div>
                )
              })}
            </div>
            {form.amenidades.length > 0 && (
              <div style={{background:'var(--gr-bg)',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--gr)',marginTop:'12px'}}>
                ✓ {form.amenidades.length} amenidades seleccionadas
              </div>
            )}
          </div>
        )}
      </div>

      {/* FEEDBACK */}
      {error && <div style={{background:'var(--rd-bg)',border:'1px solid #FCA5A5',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--rd)',marginBottom:'14px'}}>{error}</div>}
      {success && <div style={{background:'var(--gr-bg)',border:'1px solid rgba(27,67,50,.2)',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--gr)',marginBottom:'14px'}}>✓ {success}</div>}

      {/* BOTONES */}
      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
        <a href="/desarrolladores/proyectos" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:'var(--mid)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'10px 20px',textDecoration:'none'}}>← Volver</a>
        <button onClick={handleSave} disabled={saving} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 24px',cursor:'pointer',opacity:saving?0.7:1}}>
          {saving ? 'Guardando...' : '✓ Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
