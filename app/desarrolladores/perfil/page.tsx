'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PerfilPage() {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [devId, setDevId] = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre: '',
    ciudad: 'CDMX',
    ano_fundacion: '',
    proyectos_entregados: '',
    unidades_vendidas: '',
    rfc: '',
  })

  const [profile, setProfile] = useState({
    name: '',
    whatsapp: '',
    linkedin: '',
    instagram: '',
  })

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: dev }, { data: prof }] = await Promise.all([
        supabase.from('desarrolladoras').select('*').eq('user_id', user.id).single(),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      ])

      if (dev) {
        setDevId(dev.id)
        setForm({
          nombre: dev.nombre || '',
          ciudad: dev.ciudad || 'CDMX',
          ano_fundacion: dev.ano_fundacion?.toString() || '',
          proyectos_entregados: dev.proyectos_entregados?.toString() || '',
          unidades_vendidas: dev.unidades_vendidas?.toString() || '',
          rfc: dev.rfc || '',
        })
      }

      if (prof) {
        setProfile({
          name: prof.name || '',
          whatsapp: prof.whatsapp || '',
          linkedin: prof.linkedin || '',
          instagram: prof.instagram || '',
        })
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!devId) return
    setSaving(true)
    setError('')
    setSuccess('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('desarrolladoras').update({
        nombre: form.nombre,
        ciudad: form.ciudad,
        ano_fundacion: parseInt(form.ano_fundacion) || null,
        proyectos_entregados: parseInt(form.proyectos_entregados) || 0,
        unidades_vendidas: parseInt(form.unidades_vendidas) || 0,
        rfc: form.rfc,
      }).eq('id', devId),
      supabase.from('profiles').update({
        name: profile.name,
        whatsapp: profile.whatsapp,
        linkedin: profile.linkedin,
        instagram: profile.instagram,
      }).eq('user_id', user.id),
    ])

    if (e1 || e2) setError(e1?.message || e2?.message || 'Error al guardar')
    else setSuccess('Perfil actualizado correctamente')
    setSaving(false)
  }

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

  function upd(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }
  function updP(key: string, val: string) {
    setProfile(prev => ({ ...prev, [key]: val }))
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando...</div>

  return (
    <div style={{maxWidth:'600px'}}>
      <div style={{marginBottom:'28px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>Mi perfil</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Información de tu empresa y contacto</div>
      </div>

      {/* DATOS EMPRESA */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',marginBottom:'16px'}}>
        <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'16px'}}>
          🏗️ Datos de la empresa
        </div>
        <div style={{display:'grid',gap:'14px'}}>
          <div>
            <label style={labelStyle}>Nombre de la empresa *</label>
            <input style={inputStyle} value={form.nombre} onChange={e=>upd('nombre',e.target.value)} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div>
              <label style={labelStyle}>Ciudad principal</label>
              <input style={inputStyle} value={form.ciudad} onChange={e=>upd('ciudad',e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Año de fundación</label>
              <input style={inputStyle} type="number" value={form.ano_fundacion} onChange={e=>upd('ano_fundacion',e.target.value)} placeholder="2010" min="1900" max="2025" />
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div>
              <label style={labelStyle}>Proyectos entregados</label>
              <input style={inputStyle} type="number" value={form.proyectos_entregados} onChange={e=>upd('proyectos_entregados',e.target.value)} placeholder="12" min="0" />
            </div>
            <div>
              <label style={labelStyle}>Unidades vendidas</label>
              <input style={inputStyle} type="number" value={form.unidades_vendidas} onChange={e=>upd('unidades_vendidas',e.target.value)} placeholder="847" min="0" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>RFC</label>
            <input style={inputStyle} value={form.rfc} onChange={e=>upd('rfc',e.target.value)} placeholder="XXXX000000XXX" maxLength={13} />
          </div>
        </div>
      </div>

      {/* DATOS CONTACTO */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',marginBottom:'16px'}}>
        <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'16px'}}>
          👤 Datos de contacto
        </div>
        <div style={{display:'grid',gap:'14px'}}>
          <div>
            <label style={labelStyle}>Nombre del responsable</label>
            <input style={inputStyle} value={profile.name} onChange={e=>updP('name',e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp</label>
            <input style={inputStyle} value={profile.whatsapp} onChange={e=>updP('whatsapp',e.target.value)} placeholder="+52 55 0000 0000" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div>
              <label style={labelStyle}>LinkedIn</label>
              <input style={inputStyle} value={profile.linkedin} onChange={e=>updP('linkedin',e.target.value)} placeholder="linkedin.com/in/..." />
            </div>
            <div>
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={profile.instagram} onChange={e=>updP('instagram',e.target.value)} placeholder="@empresa" />
            </div>
          </div>
        </div>
      </div>

      {/* VERIFICACIONES */}
      <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px 20px',marginBottom:'16px'}}>
        <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'8px'}}>
          🔐 Verificaciones
        </div>
        <div style={{fontSize:'12px',color:'var(--mid)',lineHeight:1.6}}>
          Las verificaciones (constitución legal, antecedentes judiciales, PROFECO) son realizadas por el equipo de DesarrollosMX. 
          Una vez verificado, aparecerá el badge de verificado en tu perfil público.
          Escríbenos para iniciar el proceso.
        </div>
      </div>

      {/* FEEDBACK */}
      {error && <div style={{background:'var(--rd-bg)',border:'1px solid #FCA5A5',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--rd)',marginBottom:'14px'}}>{error}</div>}
      {success && <div style={{background:'var(--gr-bg)',border:'1px solid rgba(27,67,50,.2)',borderRadius:'var(--rs)',padding:'10px 14px',fontSize:'12px',color:'var(--gr)',marginBottom:'14px'}}>✓ {success}</div>}

      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 28px',cursor:'pointer',opacity:saving?0.7:1}}
        >
          {saving ? 'Guardando...' : '✓ Guardar perfil'}
        </button>
      </div>
    </div>
  )
}
