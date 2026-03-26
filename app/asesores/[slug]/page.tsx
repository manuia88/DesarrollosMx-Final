'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AsesorProfile {
  id: string
  name: string
  bio: string
  whatsapp: string
  linkedin: string
  instagram: string
  anos_experiencia: number
  zonas: string[]
  especialidades: string[]
  slug: string
}

export default function MicrositePage({ params }: { params: { slug: string } }) {
  const [asesor, setAsesor] = useState<AsesorProfile | null>(null)
  const [proyectos, setProyectos] = useState<{id:string;nombre:string;estado:string;colonia:string;alcaldia:string;precio_desde:number}[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase.from('profiles').select('*').eq('slug', params.slug).single()
      if (!profile) { setLoading(false); return }
      setAsesor(profile as AsesorProfile)
      const { data: projs } = await supabase.from('projects').select('id, nombre, estado, colonia, alcaldia, precio_desde').eq('publicado', true).limit(6)
      setProyectos(projs || [])
      setLoading(false)
    }
    load()
  }, [params.slug])

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',color:'var(--mid)'}}>Cargando...</div>
  if (!asesor) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',color:'var(--mid)'}}>Asesor no encontrado</div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:'var(--sans)'}}>
      {/* NAV */}
      <nav style={{background:'var(--wh)',borderBottom:'1px solid var(--bd)',height:'60px',display:'flex',alignItems:'center',padding:'0 40px',justifyContent:'space-between',position:'sticky',top:0,zIndex:500}}>
        <a href="/" style={{fontSize:'17px',fontWeight:600,color:'var(--dk)',textDecoration:'none',letterSpacing:'-.3px'}}>
          Desarrollos<em style={{fontStyle:'normal',color:'var(--gr2)'}}>MX</em>
        </a>
        <a href="/" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px 18px',textDecoration:'none'}}>Ver proyectos</a>
      </nav>

      <div style={{maxWidth:'800px',margin:'0 auto',padding:'40px 20px'}}>
        {/* PERFIL */}
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'32px',marginBottom:'20px',textAlign:'center'}}>
          <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'var(--dk)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',fontWeight:600,color:'#fff',margin:'0 auto 16px'}}>
            {asesor.name.charAt(0).toUpperCase()}
          </div>
          <div style={{fontSize:'24px',fontWeight:600,color:'var(--dk)',marginBottom:'6px'}}>{asesor.name}</div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'12px'}}>
            Asesor inmobiliario · DesarrollosMX
            {asesor.anos_experiencia && ` · ${asesor.anos_experiencia} años de experiencia`}
          </div>
          {asesor.bio && <div style={{fontSize:'13px',color:'var(--mid)',lineHeight:1.7,maxWidth:'500px',margin:'0 auto 16px'}}>{asesor.bio}</div>}
          <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
            {asesor.whatsapp && (
              <a href={`https://wa.me/${asesor.whatsapp.replace(/[^0-9]/g,'')}?text=Hola ${encodeURIComponent(asesor.name)}, encontré tu perfil en DesarrollosMX`} target="_blank" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 20px',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
                💬 Contactar por WhatsApp
              </a>
            )}
            {asesor.linkedin && (
              <a href={asesor.linkedin} target="_blank" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'10px 20px',textDecoration:'none'}}>
                LinkedIn
              </a>
            )}
            {asesor.instagram && (
              <a href={`https://instagram.com/${asesor.instagram.replace('@','')}`} target="_blank" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'10px 20px',textDecoration:'none'}}>
                Instagram
              </a>
            )}
          </div>
        </div>

        {/* ZONAS Y ESPECIALIDADES */}
        {(asesor.zonas?.length > 0 || asesor.especialidades?.length > 0) && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'20px'}}>
            {asesor.zonas?.length > 0 && (
              <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px'}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>📍 Zonas de especialidad</div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {asesor.zonas.map(z => <span key={z} style={{fontSize:'11px',background:'var(--bg2)',color:'var(--dk)',padding:'3px 9px',borderRadius:'var(--rp)'}}>{z}</span>)}
                </div>
              </div>
            )}
            {asesor.especialidades?.length > 0 && (
              <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px'}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>⭐ Especialidades</div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {asesor.especialidades.map(e => <span key={e} style={{fontSize:'11px',background:'var(--gr-bg)',color:'var(--gr)',padding:'3px 9px',borderRadius:'var(--rp)'}}>{e}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROYECTOS RECOMENDADOS */}
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px'}}>
          <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>🏗️ Proyectos disponibles</div>
          <div style={{display:'grid',gap:'8px'}}>
            {proyectos.map(p => (
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',borderRadius:'var(--rs)',border:'1px solid var(--bd)',background:'var(--bg2)'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>{p.nombre}</div>
                  <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia} · {p.estado}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'13px',fontWeight:500,color:'var(--gr)'}}>Desde ${p.precio_desde.toLocaleString('es-MX')}</div>
                  <a href={`/?ref=${asesor.slug}&project=${p.id}`} style={{fontSize:'11px',color:'var(--gr2)',textDecoration:'none'}}>Ver proyecto →</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
