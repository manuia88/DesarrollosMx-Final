'use client'
import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LogEntry {
  fecha: string
  titulo: string
  descripcion: string
}

export default function AvancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [projectName, setProjectName] = useState('')
  const [avancePct, setAvancePct] = useState(0)
  const [etapaActual, setEtapaActual] = useState('Construcción')
  const [etapas, setEtapas] = useState<{name:string;date:string}[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [newEntry, setNewEntry] = useState({ fecha: '', titulo: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('projects').select('nombre,etapa_actual,etapas,descripcion').eq('id', id).single()
      .then(({ data }) => {
        if (!data) return
        setProjectName(data.nombre)
        setEtapaActual(data.etapa_actual || 'Construcción')
        setEtapas(data.etapas || [])
        const etapaIdx = ['Diseño','Permisos','Construcción','Acabados','Entrega'].indexOf(data.etapa_actual || 'Construcción')
        setAvancePct(Math.round((etapaIdx + 1) / 5 * 100))
      })
  }, [id])

  function addLog() {
    if (!newEntry.titulo) return
    setLog(prev => [{ ...newEntry, fecha: newEntry.fecha || new Date().toLocaleDateString('es-MX',{month:'short',year:'numeric'}) }, ...prev])
    setNewEntry({ fecha:'', titulo:'', descripcion:'' })
  }

  async function handleSave() {
    setSaving(true)
    setSuccess('')
    const { error } = await supabase.from('projects').update({
      etapa_actual: etapaActual as 'Diseño'|'Permisos'|'Construcción'|'Acabados'|'Entrega',
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (!error) setSuccess('Avance guardado correctamente')
    setSaving(false)
  }

  const etapasNames = ['Diseño','Permisos','Construcción','Acabados','Entrega']
  const etapaIdx = etapasNames.indexOf(etapaActual)
  const pctCalc = Math.round((etapaIdx + 1) / 5 * 100)

  const inputStyle = {
    width:'100%',padding:'9px 12px',borderRadius:'8px',
    border:'1px solid var(--bd)',fontSize:'13px',
    fontFamily:'var(--sans)',outline:'none',
    background:'var(--wh)',color:'var(--dk)',
    boxSizing:'border-box' as const
  }
  const labelStyle = {
    fontSize:'12px',fontWeight:500 as const,
    color:'var(--dk)',display:'block' as const,marginBottom:'5px'
  }

  return (
    <div style={{maxWidth:'700px'}}>
      {/* HEADER */}
      <div style={{marginBottom:'24px'}}>
        <a href={`/desarrolladores/proyectos/${id}`} style={{fontSize:'13px',color:'var(--mid)',textDecoration:'none'}}>← {projectName}</a>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginTop:'4px'}}>Avance de obra</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Actualiza la etapa y registra entradas del avance</div>
      </div>

      {/* PROGRESO VISUAL */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',marginBottom:'20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'12px'}}>
          <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>Estado actual de construcción</div>
          <div style={{fontSize:'28px',fontWeight:600,color:'var(--gr)'}}>{pctCalc}%</div>
        </div>

        {/* BARRA */}
        <div style={{height:'8px',background:'rgba(33,45,48,.08)',borderRadius:'4px',overflow:'hidden',marginBottom:'20px'}}>
          <div style={{height:'100%',background:'var(--gr)',borderRadius:'4px',width:`${pctCalc}%`,transition:'width .4s'}} />
        </div>

        {/* TIMELINE */}
        <div style={{display:'flex',marginBottom:'20px'}}>
          {etapasNames.map((e,i) => {
            const isDone = i < etapaIdx
            const isAct = i === etapaIdx
            const etapaData = etapas.find(x => x.name === e)
            return (
              <div key={i} style={{flex:1,textAlign:'center',position:'relative'}}>
                {i < etapasNames.length-1 && (
                  <div style={{position:'absolute',top:'10px',left:'50%',right:'-50%',height:'2px',background: isDone ? 'var(--gr)' : 'var(--bd)',zIndex:0}} />
                )}
                <div
                  onClick={() => setEtapaActual(e)}
                  style={{
                    width:'22px',height:'22px',borderRadius:'50%',margin:'0 auto 6px',
                    position:'relative',zIndex:1,cursor:'pointer',
                    background: isDone ? 'var(--gr)' : isAct ? 'var(--bg)' : 'var(--bd)',
                    border: isAct ? '3px solid var(--gr)' : isDone ? '3px solid var(--gr)' : '3px solid var(--bg)',
                    boxShadow: isAct ? '0 0 0 4px rgba(27,67,50,.15)' : 'none',
                    transition:'all .2s'
                  }}
                >
                  {isDone && <span style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',color:'#fff',fontSize:'10px',fontWeight:700}}>✓</span>}
                </div>
                <div style={{fontSize:'9px',color: isAct ? 'var(--gr)' : isDone ? 'var(--dk)' : 'var(--mid)',fontWeight: isAct ? 600 : 400}}>{e}</div>
                {etapaData?.date && <div style={{fontSize:'8px',color:'var(--dim)',marginTop:'1px'}}>{etapaData.date}</div>}
                {isAct && <div style={{fontSize:'8px',color:'var(--gr)',marginTop:'1px',fontWeight:500}}>← Hoy</div>}
              </div>
            )
          })}
        </div>

        <div style={{fontSize:'12px',color:'var(--mid)',marginBottom:'16px'}}>
          Haz clic en una etapa para actualizar el avance
        </div>

        <div>
          <label style={labelStyle}>Etapa actual</label>
          <select
            value={etapaActual}
            onChange={e => setEtapaActual(e.target.value)}
            style={{
              ...inputStyle,appearance:'none' as const,
              backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23212D30' stroke-opacity='.45' stroke-width='1.3' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat:'no-repeat',backgroundPosition:'right 10px center',paddingRight:'30px'
            }}
          >
            {etapasNames.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* NUEVA ENTRADA DE LOG */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',marginBottom:'20px'}}>
        <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'16px'}}>
          Agregar entrada al log de avance
        </div>
        <div style={{display:'grid',gap:'12px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'12px'}}>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input style={inputStyle} value={newEntry.fecha} onChange={e => setNewEntry(p => ({...p,fecha:e.target.value}))} placeholder="Mar 2025" />
            </div>
            <div>
              <label style={labelStyle}>Título *</label>
              <input style={inputStyle} value={newEntry.titulo} onChange={e => setNewEntry(p => ({...p,titulo:e.target.value}))} placeholder="Ej: Estructura nivel 6 completada" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea
              style={{...inputStyle,minHeight:'70px',resize:'vertical'}}
              value={newEntry.descripcion}
              onChange={e => setNewEntry(p => ({...p,descripcion:e.target.value}))}
              placeholder="Detalle del avance..."
            />
          </div>
          <button
            onClick={addLog}
            disabled={!newEntry.titulo}
            style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 20px',cursor:'pointer',alignSelf:'flex-start',opacity:!newEntry.titulo?0.5:1}}
          >➕ Agregar entrada</button>
        </div>
      </div>

      {/* LOG DE ENTRADAS */}
      {log.length > 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',marginBottom:'20px'}}>
          <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'16px'}}>Log de avance</div>
          {log.map((entry,i) => (
            <div key={i} style={{display:'flex',gap:'12px',padding:'11px 0',borderBottom:'1px solid var(--bd2)'}}>
              <div style={{fontSize:'11px',color:'var(--mid)',minWidth:'70px',whiteSpace:'nowrap',marginTop:'1px'}}>{entry.fecha}</div>
              <div>
                <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>{entry.titulo}</div>
                {entry.descripcion && <div style={{fontSize:'11px',color:'var(--mid)',lineHeight:1.5}}>{entry.descripcion}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FEEDBACK */}
      {success && (
        <div style={{background:'var(--gr-bg)',border:'1px solid rgba(27,67,50,.2)',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--gr)',marginBottom:'14px'}}>
          ✓ {success}
        </div>
      )}

      {/* GUARDAR */}
      <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
        <a href={`/desarrolladores/proyectos/${id}`} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:'var(--mid)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'10px 20px',textDecoration:'none'}}>← Volver</a>
        <button onClick={handleSave} disabled={saving} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 24px',cursor:'pointer',opacity:saving?0.7:1}}>
          {saving ? 'Guardando...' : '✓ Guardar avance'}
        </button>
      </div>
    </div>
  )
}
