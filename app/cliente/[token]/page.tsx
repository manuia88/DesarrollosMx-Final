'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  amenidades: string[]
  descripcion: string
}

interface FolderProject {
  id: string
  notas_asesor: string
  projects: Project
}

interface Folder {
  id: string
  nombre: string
  link_views: number
}

export default function ClienteLinkPage({ params }: { params: { token: string } }) {
  const [folder, setFolder] = useState<Folder | null>(null)
  const [folderProjects, setFolderProjects] = useState<FolderProject[]>([])
  const [asesor, setAsesor] = useState<{name:string;whatsapp:string;slug:string} | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: f } = await supabase.from('client_folders').select('*').eq('link_token', params.token).single()
      if (!f) { setLoading(false); return }
      setFolder(f as Folder)

      // Incrementar views
      await supabase.from('client_folders').update({ link_views: (f.link_views || 0) + 1, ultimo_acceso_cliente: new Date().toISOString() }).eq('id', f.id)

      const [{ data: fp }, { data: asesorProfile }] = await Promise.all([
        supabase.from('client_folder_projects').select('*, projects(*)').eq('folder_id', f.id).order('orden'),
        supabase.from('profiles').select('name, whatsapp, slug').eq('id', f.asesor_id).single(),
      ])

      setFolderProjects((fp as FolderProject[]) || [])
      if (asesorProfile) setAsesor(asesorProfile as typeof asesor)
      setLoading(false)
    }
    load()
  }, [params.token])

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',color:'var(--mid)'}}>Cargando...</div>
  if (!folder) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',color:'var(--mid)'}}>Link no válido o expirado</div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:'var(--sans)'}}>
      <nav style={{background:'var(--wh)',borderBottom:'1px solid var(--bd)',height:'60px',display:'flex',alignItems:'center',padding:'0 40px',justifyContent:'space-between',position:'sticky',top:0,zIndex:500}}>
        <a href="/" style={{fontSize:'17px',fontWeight:600,color:'var(--dk)',textDecoration:'none',letterSpacing:'-.3px'}}>
          Desarrollos<em style={{fontStyle:'normal',color:'var(--gr2)'}}>MX</em>
        </a>
      </nav>

      <div style={{maxWidth:'720px',margin:'0 auto',padding:'40px 20px'}}>
        {/* HEADER */}
        <div style={{marginBottom:'24px'}}>
          <div style={{fontSize:'11px',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--mid)',marginBottom:'6px'}}>Selección personalizada para</div>
          <div style={{fontSize:'26px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>{folder.nombre}</div>
          {asesor && (
            <div style={{fontSize:'13px',color:'var(--mid)'}}>
              Preparado por <strong style={{color:'var(--dk)'}}>{asesor.name}</strong> · DesarrollosMX
            </div>
          )}
        </div>

        {/* PROYECTOS */}
        <div style={{display:'grid',gap:'16px',marginBottom:'28px'}}>
          {folderProjects.map((fp, i) => {
            const p = fp.projects
            if (!p) return null
            const gradients = ['linear-gradient(145deg,#0d2318,#1a5c3a)','linear-gradient(145deg,#0e1e2e,#1a3d5a)','linear-gradient(145deg,#1e0d0d,#4a1818)']
            return (
              <div key={fp.id} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',overflow:'hidden'}}>
                <div style={{height:'160px',background:gradients[i%gradients.length],display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                  <span style={{fontSize:'40px',opacity:.15}}>🏙️</span>
                  <div style={{position:'absolute',top:'12px',left:'12px'}}>
                    <span style={{fontSize:'10px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'rgba(255,255,255,.9)',color:'var(--dk)'}}>{p.estado}</span>
                  </div>
                </div>
                <div style={{padding:'20px'}}>
                  <div style={{fontSize:'18px',fontWeight:500,color:'var(--gr)',marginBottom:'4px'}}>${p.precio_desde.toLocaleString('es-MX')} MXN</div>
                  <div style={{fontSize:'16px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>{p.nombre}</div>
                  <div style={{fontSize:'12px',color:'var(--mid)',marginBottom:'12px'}}>📍 {p.colonia}, {p.alcaldia}</div>
                  <div style={{display:'flex',gap:'14px',fontSize:'12px',color:'var(--mid)',marginBottom:'12px',flexWrap:'wrap'}}>
                    {p.m2_min && <span>📐 {p.m2_min}–{p.m2_max} m²</span>}
                    {p.recamaras_min && <span>🛏 {p.recamaras_min}–{p.recamaras_max} rec.</span>}
                    {p.entrega_quarter && <span>🗓 {p.entrega_quarter} {p.entrega_year}</span>}
                  </div>
                  {p.descripcion && <div style={{fontSize:'12px',color:'var(--mid)',lineHeight:1.6,marginBottom:'12px'}}>{p.descripcion?.slice(0,200)}...</div>}
                  {fp.notas_asesor && (
                    <div style={{background:'var(--gr-bg)',borderRadius:'var(--rs)',padding:'10px 12px',fontSize:'12px',color:'var(--gr)',marginBottom:'12px'}}>
                      💬 <strong>Nota de tu asesor:</strong> {fp.notas_asesor}
                    </div>
                  )}
                  {asesor?.whatsapp && (
                    <a href={`https://wa.me/${asesor.whatsapp.replace(/[^0-9]/g,'')}?text=Hola ${encodeURIComponent(asesor.name)}, me interesa ${encodeURIComponent(p.nombre)}`} target="_blank" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 20px',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'6px'}}>
                      💬 Me interesa este proyecto
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* CONTACTO ASESOR */}
        {asesor && (
          <div style={{background:'var(--dk)',borderRadius:'var(--r)',padding:'24px',textAlign:'center'}}>
            <div style={{fontSize:'15px',fontWeight:500,color:'#fff',marginBottom:'6px'}}>¿Tienes preguntas?</div>
            <div style={{fontSize:'12px',color:'rgba(255,255,255,.5)',marginBottom:'16px'}}>Tu asesor {asesor.name} está disponible para ayudarte</div>
            {asesor.whatsapp && (
              <a href={`https://wa.me/${asesor.whatsapp.replace(/[^0-9]/g,'')}?text=Hola ${encodeURIComponent(asesor.name)}, revisé los proyectos que compartiste y tengo preguntas`} target="_blank" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'11px 24px',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'8px'}}>
                💬 Contactar a {asesor.name}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
