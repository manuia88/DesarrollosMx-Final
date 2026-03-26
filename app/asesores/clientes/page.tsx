'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
  created_at: string
  updated_at: string
}

function ClientesContent() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [asesorId, setAsesorId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filtroTemp, setFiltroTemp] = useState('all')
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [form, setForm] = useState({
    nombre: '', email: '', whatsapp: '',
    presupuesto_min: '', presupuesto_max: '',
    zona_preferida: '', recamaras_min: '1', recamaras_max: '3',
    plazo: '6_meses', temperatura: 'tibio', notas: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
      if (!profile) return
      setAsesorId(profile.id)
      const { data } = await supabase.from('client_folders').select('*').eq('asesor_id', profile.id).order('updated_at', { ascending: false })
      setFolders((data as Folder[]) || [])
      setLoading(false)
      if (searchParams.get('new') === 'true') setShowNew(true)
    }
    load()
  }, [])

  async function handleCreate() {
    if (!asesorId || !form.nombre) return
    setSaving(true)
    const { data, error } = await supabase.from('client_folders').insert({
      asesor_id: asesorId,
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
    }).select().single()
    if (!error && data) {
      setFolders(prev => [data as Folder, ...prev])
      setShowNew(false)
      setForm({ nombre:'', email:'', whatsapp:'', presupuesto_min:'', presupuesto_max:'', zona_preferida:'', recamaras_min:'1', recamaras_max:'3', plazo:'6_meses', temperatura:'tibio', notas:'' })
    }
    setSaving(false)
  }

  function getTempStyle(t: string) {
    if (t === 'caliente') return { bg:'#FEE2E2', color:'#DC2626', label:'🔥 Caliente', emoji:'🔥' }
    if (t === 'tibio') return { bg:'#FEF9C3', color:'#A16207', label:'🌡 Tibio', emoji:'🌡' }
    return { bg:'var(--bl-bg)', color:'var(--bl)', label:'❄️ Frío', emoji:'❄️' }
  }

  function getPlazoLabel(p: string) {
    const map: Record<string,string> = {
      'inmediato':'Inmediato','3_meses':'3 meses','6_meses':'6 meses',
      '1_año':'1 año','mas_1_año':'+1 año'
    }
    return map[p] || p
  }

  const filtered = folders.filter(f => filtroTemp === 'all' || f.temperatura === filtroTemp)

  const inputStyle = {
    width:'100%', padding:'9px 12px', borderRadius:'8px',
    border:'1px solid var(--bd)', fontSize:'13px',
    fontFamily:'var(--sans)', outline:'none',
    background:'var(--wh)', color:'var(--dk)',
    boxSizing:'border-box' as const
  }
  const labelStyle = { fontSize:'12px', fontWeight:500 as const, color:'var(--dk)', display:'block' as const, marginBottom:'5px' }
  const selStyle = { ...inputStyle, appearance:'none' as const }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando clientes...</div>

  return (
    <div>
      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <div>
          <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>Mis clientes</div>
          <div style={{fontSize:'13px',color:'var(--mid)'}}>{folders.length} carpeta{folders.length !== 1 ? 's' : ''} de cliente</div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}
        >👥 Nuevo cliente</button>
      </div>

      {/* MODAL NUEVO CLIENTE */}
      {showNew && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',padding:'28px',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <div style={{fontSize:'18px',fontWeight:600,color:'var(--dk)'}}>Nueva carpeta de cliente</div>
              <button onClick={() => setShowNew(false)} style={{background:'transparent',border:'none',fontSize:'18px',cursor:'pointer',color:'var(--mid)'}}>✕</button>
            </div>
            <div style={{display:'grid',gap:'14px'}}>
              <div>
                <label style={labelStyle}>Nombre del cliente *</label>
                <input style={inputStyle} value={form.nombre} onChange={e => setForm(p => ({...p,nombre:e.target.value}))} placeholder="Ana García" />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(p => ({...p,email:e.target.value}))} placeholder="ana@email.com" />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp</label>
                  <input style={inputStyle} value={form.whatsapp} onChange={e => setForm(p => ({...p,whatsapp:e.target.value}))} placeholder="+52 55 0000 0000" />
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={labelStyle}>Presupuesto mínimo</label>
                  <input style={inputStyle} type="number" value={form.presupuesto_min} onChange={e => setForm(p => ({...p,presupuesto_min:e.target.value}))} placeholder="4000000" />
                </div>
                <div>
                  <label style={labelStyle}>Presupuesto máximo</label>
                  <input style={inputStyle} type="number" value={form.presupuesto_max} onChange={e => setForm(p => ({...p,presupuesto_max:e.target.value}))} placeholder="8000000" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Zona preferida</label>
                <input style={inputStyle} value={form.zona_preferida} onChange={e => setForm(p => ({...p,zona_preferida:e.target.value}))} placeholder="Benito Juárez, Del Valle, Condesa..." />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={labelStyle}>Recámaras mín.</label>
                  <select style={selStyle} value={form.recamaras_min} onChange={e => setForm(p => ({...p,recamaras_min:e.target.value}))}>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Recámaras máx.</label>
                  <select style={selStyle} value={form.recamaras_max} onChange={e => setForm(p => ({...p,recamaras_max:e.target.value}))}>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option>
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={labelStyle}>Plazo de compra</label>
                  <select style={selStyle} value={form.plazo} onChange={e => setForm(p => ({...p,plazo:e.target.value}))}>
                    <option value="inmediato">Inmediato</option>
                    <option value="3_meses">3 meses</option>
                    <option value="6_meses">6 meses</option>
                    <option value="1_año">1 año</option>
                    <option value="mas_1_año">+1 año</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Temperatura</label>
                  <select style={selStyle} value={form.temperatura} onChange={e => setForm(p => ({...p,temperatura:e.target.value}))}>
                    <option value="caliente">🔥 Caliente</option>
                    <option value="tibio">🌡 Tibio</option>
                    <option value="frio">❄️ Frío</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notas privadas</label>
                <textarea style={{...inputStyle,minHeight:'70px',resize:'vertical'}} value={form.notas} onChange={e => setForm(p => ({...p,notas:e.target.value}))} placeholder="Preferencias adicionales, contexto del cliente..." />
              </div>
            </div>
            <div style={{display:'flex',gap:'10px',marginTop:'20px',justifyContent:'flex-end'}}>
              <button onClick={() => setShowNew(false)} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:'var(--mid)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'9px 18px',cursor:'pointer'}}>Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.nombre} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'9px 20px',cursor:'pointer',opacity:saving||!form.nombre?0.6:1}}>
                {saving ? 'Creando...' : '✓ Crear carpeta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS DE TEMPERATURA */}
      <div style={{display:'flex',gap:'6px',marginBottom:'16px'}}>
        {[['all','Todos'],['caliente','🔥 Calientes'],['tibio','🌡 Tibios'],['frio','❄️ Fríos']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltroTemp(v)} style={{fontFamily:'var(--sans)',fontSize:'12px',padding:'6px 14px',borderRadius:'var(--rp)',border:filtroTemp===v?'none':'1px solid var(--bd)',background:filtroTemp===v?'var(--dk)':'var(--wh)',color:filtroTemp===v?'#fff':'var(--mid)',cursor:'pointer'}}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'2px dashed var(--bd)',padding:'60px',textAlign:'center'}}>
          <div style={{fontSize:'36px',marginBottom:'14px'}}>👥</div>
          <div style={{fontSize:'18px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>Sin clientes aún</div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'24px'}}>Crea carpetas para tus prospectos y empieza a hacer match con proyectos</div>
          <button onClick={() => setShowNew(true)} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 24px',cursor:'pointer'}}>👥 Crear primer cliente</button>
        </div>
      ) : (
        <div style={{display:'grid',gap:'12px'}}>
          {filtered.map(f => {
            const tempStyle = getTempStyle(f.temperatura)
            return (
              <div key={f.id} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'18px 20px',display:'flex',gap:'16px',alignItems:'center'}}>
                {/* AVATAR */}
                <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'var(--dk)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'16px',fontWeight:600,flexShrink:0}}>
                  {f.nombre.charAt(0).toUpperCase()}
                </div>

                {/* INFO */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                    <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>{f.nombre}</div>
                    <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:tempStyle.bg,color:tempStyle.color}}>{tempStyle.label}</span>
                    {f.plazo && <span style={{fontSize:'10px',color:'var(--mid)',background:'var(--bg2)',padding:'2px 7px',borderRadius:'4px'}}>⏱ {getPlazoLabel(f.plazo)}</span>}
                  </div>
                  <div style={{display:'flex',gap:'14px',fontSize:'11px',color:'var(--mid)',flexWrap:'wrap'}}>
                    {f.presupuesto_min && f.presupuesto_max && (
                      <span>💰 ${(f.presupuesto_min/1e6).toFixed(1)}M–${(f.presupuesto_max/1e6).toFixed(1)}M</span>
                    )}
                    {f.zona_preferida && <span>📍 {f.zona_preferida}</span>}
                    {f.recamaras_min && <span>🛏 {f.recamaras_min}–{f.recamaras_max} rec.</span>}
                    {f.link_views > 0 && <span>👁 {f.link_views} vistas al link</span>}
                    {f.whatsapp && <span>📱 {f.whatsapp}</span>}
                  </div>
                  {f.notas && (
                    <div style={{fontSize:'11px',color:'var(--mid)',marginTop:'4px',fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'400px'}}>
                      📝 {f.notas}
                    </div>
                  )}
                </div>

                {/* ACCIONES */}
                <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                  <a href={`/asesores/clientes/${f.id}`} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'7px 14px',cursor:'pointer',textDecoration:'none'}}>
                    Ver carpeta →
                  </a>
                  {f.whatsapp && (
                    <a
                      href={`https://wa.me/${f.whatsapp.replace(/[^0-9]/g,'')}?text=Hola ${encodeURIComponent(f.nombre)}`}
                      target="_blank"
                      style={{fontFamily:'var(--sans)',fontSize:'11px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'7px 14px',cursor:'pointer',textDecoration:'none'}}
                    >💬</a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando...</div>}>
      <ClientesContent />
    </Suspense>
  )
}
