'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Folder {
  id: string
  nombre: string
  email: string
  whatsapp: string
  presupuesto_min: number
  presupuesto_max: number
  zona_preferida: string
  recamaras_min: number
  recamaras_max: number
  plazo: string
  temperatura: string
  notas: string
  link_token: string
  link_views: number
  ultimo_acceso_cliente: string
}

interface Project {
  id: string
  nombre: string
  estado: string
  colonia: string
  alcaldia: string
  precio_desde: number
  comision_pct: number
  entrega_quarter: string
  entrega_year: number
  m2_min: number
  m2_max: number
  recamaras_min: number
  recamaras_max: number
}

interface FolderProject {
  id: string
  project_id: string
  orden: number
  notas_asesor: string
  link_views: number
  projects: Project
}

export default function ClienteFolderPage({ params }: { params: { id: string } }) {
  const [folder, setFolder] = useState<Folder | null>(null)
  const [folderProjects, setFolderProjects] = useState<FolderProject[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [success, setSuccess] = useState('')
  const [matchProjects, setMatchProjects] = useState<{project: Project; score: number}[]>([])
  const supabase = createClient()

  const [form, setForm] = useState({
    nombre: '', email: '', whatsapp: '',
    presupuesto_min: '', presupuesto_max: '',
    zona_preferida: '', recamaras_min: '1', recamaras_max: '3',
    plazo: '6_meses', temperatura: 'tibio', notas: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: f }, { data: fp }, { data: ap }] = await Promise.all([
        supabase.from('client_folders').select('*').eq('id', params.id).single(),
        supabase.from('client_folder_projects').select('*, projects(*)').eq('folder_id', params.id).order('orden'),
        supabase.from('projects').select('*').eq('publicado', true),
      ])
      if (f) {
        setFolder(f as Folder)
        setForm({
          nombre: f.nombre || '',
          email: f.email || '',
          whatsapp: f.whatsapp || '',
          presupuesto_min: f.presupuesto_min?.toString() || '',
          presupuesto_max: f.presupuesto_max?.toString() || '',
          zona_preferida: f.zona_preferida || '',
          recamaras_min: f.recamaras_min?.toString() || '1',
          recamaras_max: f.recamaras_max?.toString() || '3',
          plazo: f.plazo || '6_meses',
          temperatura: f.temperatura || 'tibio',
          notas: f.notas || '',
        })
        // Calcular match automático
        if (ap && f) {
          const matches = (ap as Project[]).map(p => {
            let score = 0
            // Presupuesto match (30%)
            if (f.presupuesto_min && f.presupuesto_max) {
              if (p.precio_desde >= f.presupuesto_min && p.precio_desde <= f.presupuesto_max) score += 30
              else if (p.precio_desde <= f.presupuesto_max * 1.1) score += 15
            } else score += 15
            // Zona match (25%)
            if (f.zona_preferida && (p.alcaldia.toLowerCase().includes(f.zona_preferida.toLowerCase()) || p.colonia.toLowerCase().includes(f.zona_preferida.toLowerCase()))) score += 25
            else score += 5
            // Recámaras match (20%)
            if (f.recamaras_min && f.recamaras_max) {
              if (p.recamaras_min >= f.recamaras_min && p.recamaras_max <= f.recamaras_max + 1) score += 20
              else if (p.recamaras_min <= f.recamaras_max) score += 10
            } else score += 10
            // Disponibilidad (25%)
            score += 25
            return { project: p, score: Math.min(100, score) }
          }).sort((a, b) => b.score - a.score).slice(0, 5)
          setMatchProjects(matches)
        }
      }
      setFolderProjects((fp as FolderProject[]) || [])
      setAllProjects((ap as Project[]) || [])
      setLoading(false)
    }
    load()
  }, [params.id])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('client_folders').update({
      nombre: form.nombre,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
      presupuesto_min: parseFloat(form.presupuesto_min) || null,
      presupuesto_max: parseFloat(form.presupuesto_max) || null,
      zona_preferida: form.zona_preferida || null,
      recamaras_min: parseInt(form.recamaras_min) || 1,
      recamaras_max: parseInt(form.recamaras_max) || 3,
      plazo: form.plazo,
      temperatura: form.temperatura,
      notas: form.notas || null,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id)
    if (!error) { setSuccess('Cliente actualizado'); setEditMode(false); setFolder(prev => prev ? {...prev, nombre: form.nombre, email: form.email, whatsapp: form.whatsapp, zona_preferida: form.zona_preferida, temperatura: form.temperatura, plazo: form.plazo, notas: form.notas, presupuesto_min: parseFloat(form.presupuesto_min)||0, presupuesto_max: parseFloat(form.presupuesto_max)||0, recamaras_min: parseInt(form.recamaras_min)||1, recamaras_max: parseInt(form.recamaras_max)||3 } : null) }
    setSaving(false)
  }

  async function addProject(projectId: string) {
    const { data } = await supabase.from('client_folder_projects').insert({
      folder_id: params.id,
      project_id: projectId,
      orden: folderProjects.length,
    }).select('*, projects(*)').single()
    if (data) setFolderProjects(prev => [...prev, data as FolderProject])
    setShowAddProject(false)
  }

  async function removeProject(fpId: string) {
    await supabase.from('client_folder_projects').delete().eq('id', fpId)
    setFolderProjects(prev => prev.filter(fp => fp.id !== fpId))
  }

  function getTempStyle(t: string) {
    if (t === 'caliente') return { bg:'#FEE2E2', color:'#DC2626', label:'🔥 Caliente' }
    if (t === 'tibio') return { bg:'#FEF9C3', color:'#A16207', label:'🌡 Tibio' }
    return { bg:'var(--bl-bg)', color:'var(--bl)', label:'❄️ Frío' }
  }

  function getPlazoLabel(p: string) {
    const map: Record<string,string> = { 'inmediato':'Inmediato','3_meses':'3 meses','6_meses':'6 meses','1_año':'1 año','mas_1_año':'+1 año' }
    return map[p] || p
  }

  function getScoreColor(s: number) {
    if (s >= 80) return '#15803D'
    if (s >= 60) return '#A16207'
    return '#DC2626'
  }

  const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid var(--bd)', fontSize:'13px', fontFamily:'var(--sans)', outline:'none', background:'var(--wh)', color:'var(--dk)', boxSizing:'border-box' as const }
  const labelStyle = { fontSize:'12px', fontWeight:500 as const, color:'var(--dk)', display:'block' as const, marginBottom:'5px' }
  const selStyle = { ...inputStyle, appearance:'none' as const }

  const assignedIds = new Set(folderProjects.map(fp => fp.project_id))
  const availableProjects = allProjects.filter(p => !assignedIds.has(p.id))

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando carpeta...</div>
  if (!folder) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cliente no encontrado</div>

  const tempStyle = getTempStyle(folder.temperatura || form.temperatura)
  const linkUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cliente/${folder.link_token}`

  return (
    <div style={{maxWidth:'900px'}}>
      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'}}>
        <div>
          <a href="/asesores/clientes" style={{fontSize:'13px',color:'var(--mid)',textDecoration:'none'}}>← Mis clientes</a>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'4px'}}>
            <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)'}}>{folder.nombre}</div>
            <span style={{fontSize:'11px',fontWeight:500,padding:'3px 10px',borderRadius:'var(--rp)',background:tempStyle.bg,color:tempStyle.color}}>{tempStyle.label}</span>
          </div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginTop:'2px'}}>
            {folder.plazo && getPlazoLabel(folder.plazo)}
            {folder.zona_preferida && ` · ${folder.zona_preferida}`}
            {folder.presupuesto_max && ` · Hasta $${(folder.presupuesto_max/1e6).toFixed(1)}M`}
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={() => setEditMode(!editMode)} style={{fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'8px 14px',cursor:'pointer'}}>
            {editMode ? '✕ Cancelar' : '✏️ Editar'}
          </button>
          {folder.whatsapp && (
            <a href={`https://wa.me/${folder.whatsapp.replace(/[^0-9]/g,'')}?text=Hola ${encodeURIComponent(folder.nombre)}, te comparto algunos proyectos que podrían interesarte.`} target="_blank" style={{fontFamily:'var(--sans)',fontSize:'12px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px 14px',cursor:'pointer',textDecoration:'none'}}>
              💬 WhatsApp
            </a>
          )}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'20px',alignItems:'start'}}>
        {/* COLUMNA PRINCIPAL */}
        <div>

          {/* EDITAR CLIENTE */}
          {editMode && (
            <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'20px'}}>
              <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Editar perfil del cliente</div>
              <div style={{display:'grid',gap:'12px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <div><label style={labelStyle}>Nombre</label><input style={inputStyle} value={form.nombre} onChange={e => setForm(p => ({...p,nombre:e.target.value}))} /></div>
                  <div><label style={labelStyle}>WhatsApp</label><input style={inputStyle} value={form.whatsapp} onChange={e => setForm(p => ({...p,whatsapp:e.target.value}))} /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <div><label style={labelStyle}>Presupuesto mín.</label><input style={inputStyle} type="number" value={form.presupuesto_min} onChange={e => setForm(p => ({...p,presupuesto_min:e.target.value}))} /></div>
                  <div><label style={labelStyle}>Presupuesto máx.</label><input style={inputStyle} type="number" value={form.presupuesto_max} onChange={e => setForm(p => ({...p,presupuesto_max:e.target.value}))} /></div>
                </div>
                <div><label style={labelStyle}>Zona preferida</label><input style={inputStyle} value={form.zona_preferida} onChange={e => setForm(p => ({...p,zona_preferida:e.target.value}))} /></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <div><label style={labelStyle}>Temperatura</label>
                    <select style={selStyle} value={form.temperatura} onChange={e => setForm(p => ({...p,temperatura:e.target.value}))}>
                      <option value="caliente">🔥 Caliente</option><option value="tibio">🌡 Tibio</option><option value="frio">❄️ Frío</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Plazo</label>
                    <select style={selStyle} value={form.plazo} onChange={e => setForm(p => ({...p,plazo:e.target.value}))}>
                      <option value="inmediato">Inmediato</option><option value="3_meses">3 meses</option><option value="6_meses">6 meses</option><option value="1_año">1 año</option><option value="mas_1_año">+1 año</option>
                    </select>
                  </div>
                </div>
                <div><label style={labelStyle}>Notas privadas</label><textarea style={{...inputStyle,minHeight:'70px',resize:'vertical'}} value={form.notas} onChange={e => setForm(p => ({...p,notas:e.target.value}))} /></div>
              </div>
              {success && <div style={{background:'var(--gr-bg)',borderRadius:'var(--rs)',padding:'8px 12px',fontSize:'12px',color:'var(--gr)',marginTop:'12px'}}>✓ {success}</div>}
              <div style={{display:'flex',justifyContent:'flex-end',marginTop:'14px'}}>
                <button onClick={handleSave} disabled={saving} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'9px 20px',cursor:'pointer',opacity:saving?0.7:1}}>
                  {saving ? 'Guardando...' : '✓ Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* MATCH AUTOMÁTICO */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <div>
                <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>🎯 Match automático</div>
                <div style={{fontSize:'11px',color:'var(--mid)'}}>Proyectos más compatibles con el perfil del cliente</div>
              </div>
            </div>
            {matchProjects.length === 0 ? (
              <div style={{fontSize:'12px',color:'var(--mid)',textAlign:'center',padding:'16px'}}>Completa el perfil del cliente para ver matches automáticos</div>
            ) : (
              <div style={{display:'grid',gap:'8px'}}>
                {matchProjects.map(({ project: p, score }, i) => (
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',borderRadius:'var(--rs)',background:'var(--bg2)',border:'1px solid var(--bd2)'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'var(--rs)',background:`hsl(${140 - i*20}, 40%, 25%)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>🏙️</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.nombre}</div>
                      <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia} · ${p.precio_desde.toLocaleString('es-MX')}</div>
                    </div>
                    <div style={{textAlign:'center',flexShrink:0}}>
                      <div style={{fontSize:'18px',fontWeight:700,color:getScoreColor(score)}}>{score}</div>
                      <div style={{fontSize:'9px',color:'var(--mid)'}}>match</div>
                    </div>
                    <button
                      onClick={() => addProject(p.id)}
                      disabled={assignedIds.has(p.id)}
                      style={{fontFamily:'var(--sans)',fontSize:'11px',background: assignedIds.has(p.id) ? 'var(--bg2)' : 'var(--dk)',color: assignedIds.has(p.id) ? 'var(--mid)' : '#fff',border:'none',borderRadius:'var(--rp)',padding:'5px 12px',cursor: assignedIds.has(p.id) ? 'default' : 'pointer',flexShrink:0}}
                    >{assignedIds.has(p.id) ? '✓ Agregado' : '+ Agregar'}</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PROYECTOS EN CARPETA */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginBottom:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <div>
                <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>🏗️ Proyectos en la carpeta</div>
                <div style={{fontSize:'11px',color:'var(--mid)'}}>{folderProjects.length} proyecto{folderProjects.length !== 1 ? 's' : ''} seleccionado{folderProjects.length !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => setShowAddProject(!showAddProject)} style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'7px 14px',cursor:'pointer'}}>
                + Agregar proyecto
              </button>
            </div>

            {showAddProject && (
              <div style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'12px',marginBottom:'14px',maxHeight:'200px',overflowY:'auto'}}>
                {availableProjects.length === 0 ? (
                  <div style={{fontSize:'12px',color:'var(--mid)',textAlign:'center',padding:'8px'}}>Todos los proyectos ya están en la carpeta</div>
                ) : availableProjects.map(p => (
                  <div key={p.id} onClick={() => addProject(p.id)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:'var(--rs)',cursor:'pointer',marginBottom:'4px',background:'var(--wh)',border:'1px solid var(--bd)'}}
                    onMouseEnter={e => e.currentTarget.style.borderColor='var(--dk)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='var(--bd)'}
                  >
                    <div>
                      <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)'}}>{p.nombre}</div>
                      <div style={{fontSize:'10px',color:'var(--mid)'}}>{p.colonia} · ${p.precio_desde.toLocaleString('es-MX')}</div>
                    </div>
                    <span style={{fontSize:'18px',color:'var(--gr)'}}>+</span>
                  </div>
                ))}
              </div>
            )}

            {folderProjects.length === 0 ? (
              <div style={{textAlign:'center',padding:'24px',color:'var(--mid)',fontSize:'13px'}}>
                Sin proyectos. Usa el match automático o agrega manualmente.
              </div>
            ) : (
              <div style={{display:'grid',gap:'8px'}}>
                {folderProjects.map(fp => {
                  const p = fp.projects
                  if (!p) return null
                  const comision = p.comision_pct ? Math.round(p.precio_desde * p.comision_pct / 100) : 0
                  return (
                    <div key={fp.id} style={{display:'flex',gap:'12px',alignItems:'center',padding:'12px 14px',borderRadius:'var(--rs)',border:'1px solid var(--bd)',background:'var(--bg2)'}}>
                      <div style={{width:'36px',height:'36px',borderRadius:'var(--rs)',background:'linear-gradient(145deg,#0d2318,#1a5c3a)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>🏙️</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>{p.nombre}</div>
                        <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia} · ${p.precio_desde.toLocaleString('es-MX')}</div>
                      </div>
                      {comision > 0 && <div style={{fontSize:'11px',fontWeight:600,color:'var(--gr)',flexShrink:0}}>+${Math.round(comision/1000)}k</div>}
                      {fp.link_views > 0 && <div style={{fontSize:'10px',color:'var(--mid)',flexShrink:0}}>👁 {fp.link_views}</div>}
                      <button onClick={() => removeProject(fp.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--dim)',fontSize:'16px',padding:'4px',flexShrink:0}}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{display:'grid',gap:'14px'}}>

          {/* LINK PRIVADO */}
          <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',border:'1px solid rgba(27,67,50,.15)',padding:'18px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--gr)',marginBottom:'6px'}}>🔗 Link privado del cliente</div>
            <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'10px',lineHeight:1.5}}>
              Comparte este link con {folder.nombre}. Podrá ver los proyectos que seleccionaste para él/ella.
            </div>
            <div style={{background:'var(--wh)',borderRadius:'var(--rs)',padding:'8px 10px',fontSize:'10px',color:'var(--dk)',fontFamily:'monospace',marginBottom:'8px',wordBreak:'break-all',lineHeight:1.4}}>
              {linkUrl}
            </div>
            {folder.link_views > 0 && (
              <div style={{fontSize:'11px',color:'var(--gr)',marginBottom:'8px'}}>👁 Visto {folder.link_views} veces</div>
            )}
            {folder.ultimo_acceso_cliente && (
              <div style={{fontSize:'10px',color:'var(--mid)',marginBottom:'8px'}}>
                Último acceso: {new Date(folder.ultimo_acceso_cliente).toLocaleDateString('es-MX')}
              </div>
            )}
            <div style={{display:'flex',gap:'6px'}}>
              <button onClick={() => { navigator.clipboard.writeText(linkUrl); alert('¡Link copiado!') }} style={{flex:1,fontFamily:'var(--sans)',fontSize:'11px',background:'var(--gr)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'7px',cursor:'pointer'}}>
                📋 Copiar
              </button>
              {folder.whatsapp && (
                <a href={`https://wa.me/${folder.whatsapp.replace(/[^0-9]/g,'')}?text=Hola ${encodeURIComponent(folder.nombre)}, te comparto los proyectos que seleccioné para ti: ${encodeURIComponent(linkUrl)}`} target="_blank" style={{flex:1,fontFamily:'var(--sans)',fontSize:'11px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'7px',cursor:'pointer',textDecoration:'none',textAlign:'center'}}>
                  💬 Enviar
                </a>
              )}
            </div>
          </div>

          {/* PERFIL DEL CLIENTE */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'18px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'12px'}}>👤 Perfil del cliente</div>
            {[
              {l:'Email',v:folder.email},
              {l:'WhatsApp',v:folder.whatsapp},
              {l:'Presupuesto',v:folder.presupuesto_min && folder.presupuesto_max ? `$${(folder.presupuesto_min/1e6).toFixed(1)}M – $${(folder.presupuesto_max/1e6).toFixed(1)}M` : null},
              {l:'Zona',v:folder.zona_preferida},
              {l:'Recámaras',v:folder.recamaras_min && folder.recamaras_max ? `${folder.recamaras_min}–${folder.recamaras_max}` : null},
              {l:'Plazo',v:folder.plazo ? getPlazoLabel(folder.plazo) : null},
            ].filter(item => item.v).map((item,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>
                <span style={{color:'var(--mid)'}}>{item.l}</span>
                <span style={{color:'var(--dk)',fontWeight:500}}>{item.v}</span>
              </div>
            ))}
            {folder.notas && (
              <div style={{marginTop:'10px',padding:'8px 10px',background:'var(--bg2)',borderRadius:'var(--rs)',fontSize:'11px',color:'var(--mid)',lineHeight:1.5}}>
                📝 {folder.notas}
              </div>
            )}
          </div>

          {/* ACCIONES RÁPIDAS */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'18px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'12px'}}>⚡ Acciones rápidas</div>
            <div style={{display:'grid',gap:'6px'}}>
              <a href="/asesores/herramientas/dossier" style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--bg2)',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'8px 12px',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                🤖 Generar dossier IA
              </a>
              <a href="/asesores/comparador" style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--bg2)',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'8px 12px',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                ⚖️ Comparar proyectos
              </a>
              <a href="/asesores/herramientas/calculadora" style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--bg2)',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'8px 12px',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                🧮 Calculadora inversión
              </a>
              <a href="/asesores/herramientas/whatsapp-kit" style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--bg2)',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'8px 12px',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                💬 WhatsApp Kit
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
