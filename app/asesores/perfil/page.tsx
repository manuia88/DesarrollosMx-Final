'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ZONAS = ['Benito Juárez','Cuauhtémoc','Miguel Hidalgo','Coyoacán','Álvaro Obregón','Tlalpan','GAM','Iztapalapa','Venustiano Carranza']
const ESPECIALIDADES = ['Preventa','Entrega inmediata','Lujo','Inversión','Primer hogar','Comercial']

export default function PerfilAsesorPage() {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', whatsapp: '', bio: '', slug: '',
    linkedin: '', instagram: '', anos_experiencia: '',
    zonas: [] as string[], especialidades: [] as string[],
  })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (data) {
        setProfileId(data.id)
        setForm({
          name: data.name || '',
          whatsapp: data.whatsapp || '',
          bio: data.bio || '',
          slug: data.slug || '',
          linkedin: data.linkedin || '',
          instagram: data.instagram || '',
          anos_experiencia: data.anos_experiencia?.toString() || '',
          zonas: data.zonas || [],
          especialidades: data.especialidades || [],
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!profileId) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      name: form.name,
      whatsapp: form.whatsapp,
      bio: form.bio,
      slug: form.slug,
      linkedin: form.linkedin,
      instagram: form.instagram,
      anos_experiencia: parseInt(form.anos_experiencia) || null,
      zonas: form.zonas,
      especialidades: form.especialidades,
    }).eq('id', profileId)
    if (!error) setSuccess('Perfil actualizado correctamente')
    setSaving(false)
  }

  function toggleItem(key: 'zonas'|'especialidades', item: string) {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter(x => x !== item) : [...prev[key], item]
    }))
  }

  const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid var(--bd)', fontSize:'13px', fontFamily:'var(--sans)', outline:'none', background:'var(--wh)', color:'var(--dk)', boxSizing:'border-box' as const }
  const labelStyle = { fontSize:'12px', fontWeight:500 as const, color:'var(--dk)', display:'block' as const, marginBottom:'5px' }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando perfil...</div>

  return (
    <div style={{maxWidth:'640px'}}>
      <div style={{marginBottom:'28px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>Mi perfil público</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Así te verán los compradores y desarrolladores en el portal</div>
      </div>

      {/* PREVIEW MICROSITE */}
      {form.slug && (
        <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',border:'1px solid rgba(27,67,50,.15)',padding:'14px 16px',marginBottom:'20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'12px',fontWeight:500,color:'var(--gr)',marginBottom:'2px'}}>Tu microsite público</div>
            <div style={{fontSize:'11px',color:'var(--mid)',fontFamily:'monospace'}}>desarrollosmx.com/asesores/{form.slug}</div>
          </div>
          <a href={`/asesores/${form.slug}`} target="_blank" style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--gr)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'6px 14px',textDecoration:'none'}}>
            Ver microsite →
          </a>
        </div>
      )}

      {/* DATOS PERSONALES */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',marginBottom:'16px'}}>
        <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'16px'}}>👤 Datos personales</div>
        <div style={{display:'grid',gap:'14px'}}>
          <div>
            <label style={labelStyle}>Nombre completo *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({...p,name:e.target.value}))} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div>
              <label style={labelStyle}>WhatsApp</label>
              <input style={inputStyle} value={form.whatsapp} onChange={e => setForm(p => ({...p,whatsapp:e.target.value}))} placeholder="+52 55 0000 0000" />
            </div>
            <div>
              <label style={labelStyle}>Años de experiencia</label>
              <input style={inputStyle} type="number" value={form.anos_experiencia} onChange={e => setForm(p => ({...p,anos_experiencia:e.target.value}))} placeholder="5" min="0" max="50" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Bio / Presentación</label>
            <textarea style={{...inputStyle,minHeight:'80px',resize:'vertical'}} value={form.bio} onChange={e => setForm(p => ({...p,bio:e.target.value}))} placeholder="Cuéntale a tus clientes quién eres y por qué deberían trabajar contigo..." />
          </div>
          <div>
            <label style={labelStyle}>Slug (URL de tu perfil)</label>
            <input style={inputStyle} value={form.slug} onChange={e => setForm(p => ({...p,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')}))} placeholder="tu-nombre" />
            <div style={{fontSize:'10px',color:'var(--mid)',marginTop:'3px'}}>solo letras minúsculas, números y guiones</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div>
              <label style={labelStyle}>LinkedIn</label>
              <input style={inputStyle} value={form.linkedin} onChange={e => setForm(p => ({...p,linkedin:e.target.value}))} placeholder="linkedin.com/in/..." />
            </div>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={form.instagram} onChange={e => setForm(p => ({...p,instagram:e.target.value}))} placeholder="@tuusuario" />
            </div>
          </div>
        </div>
      </div>

      {/* ZONAS */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',marginBottom:'16px'}}>
        <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'12px'}}>📍 Zonas de especialidad</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
          {ZONAS.map(z => {
            const sel = form.zonas.includes(z)
            return (
              <div key={z} onClick={() => toggleItem('zonas',z)} style={{padding:'8px 12px',borderRadius:'var(--rs)',cursor:'pointer',border: sel ? '1.5px solid var(--dk)' : '1px solid var(--bd)',background: sel ? 'var(--bg2)' : 'var(--wh)',fontSize:'12px',color: sel ? 'var(--dk)' : 'var(--mid)',fontWeight: sel ? 500 : 400,textAlign:'center',transition:'all .15s'}}>
                {z}
              </div>
            )
          })}
        </div>
      </div>

      {/* ESPECIALIDADES */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',marginBottom:'16px'}}>
        <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'12px'}}>⭐ Especialidades</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
          {ESPECIALIDADES.map(e => {
            const sel = form.especialidades.includes(e)
            return (
              <div key={e} onClick={() => toggleItem('especialidades',e)} style={{padding:'8px 12px',borderRadius:'var(--rs)',cursor:'pointer',border: sel ? '1.5px solid var(--dk)' : '1px solid var(--bd)',background: sel ? 'var(--bg2)' : 'var(--wh)',fontSize:'12px',color: sel ? 'var(--dk)' : 'var(--mid)',fontWeight: sel ? 500 : 400,textAlign:'center',transition:'all .15s'}}>
                {e}
              </div>
            )
          })}
        </div>
      </div>

      {success && <div style={{background:'var(--gr-bg)',border:'1px solid rgba(27,67,50,.2)',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--gr)',marginBottom:'14px'}}>✓ {success}</div>}

      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button onClick={handleSave} disabled={saving} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 28px',cursor:'pointer',opacity:saving?0.7:1}}>
          {saving ? 'Guardando...' : '✓ Guardar perfil'}
        </button>
      </div>
    </div>
  )
}
