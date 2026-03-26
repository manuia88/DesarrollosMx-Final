'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  nombre: string
  tipo: string
  estado: string
  estado_publicacion: string
  colonia: string
  alcaldia: string
  precio_desde: number
  precio_hasta: number
  total_unidades: number
  publicado: boolean
  destacado: boolean
  created_at: string
  updated_at: string
}

export default function ProyectosPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [devId, setDevId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: dev } = await supabase
        .from('desarrolladoras').select('id').eq('user_id', user.id).single()
      if (!dev) return
      setDevId(dev.id)
      const { data } = await supabase
        .from('projects').select('*')
        .eq('desarrolladora_id', dev.id)
        .order('created_at', { ascending: false })
      setProjects((data as Project[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function togglePublicado(p: Project) {
    if (p.estado_publicacion === 'publicado') {
      await supabase.from('projects').update({
        publicado: false, estado_publicacion: 'borrador'
      }).eq('id', p.id)
    } else {
      await supabase.from('projects').update({
        estado_publicacion: 'en_revision', submitted_at: new Date().toISOString()
      }).eq('id', p.id)
    }
    setProjects(prev => prev.map(x => x.id === p.id ? {
      ...x,
      publicado: p.estado_publicacion === 'publicado' ? false : x.publicado,
      estado_publicacion: p.estado_publicacion === 'publicado' ? 'borrador' : 'en_revision'
    } : x))
  }

  function getEPStyle(ep: string) {
    if (ep === 'publicado') return { bg:'#DCFCE7', color:'#15803D', label:'Publicado' }
    if (ep === 'en_revision') return { bg:'#FEF9C3', color:'#A16207', label:'En revisión' }
    if (ep === 'rechazado') return { bg:'#FEE2E2', color:'#DC2626', label:'Rechazado' }
    return { bg:'var(--bg2)', color:'var(--mid)', label:'Borrador' }
  }

  if (loading) return (
    <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando...</div>
  )

  return (
    <div>
      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
        <div>
          <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>Mis proyectos</div>
          <div style={{fontSize:'13px',color:'var(--mid)'}}>{projects.length} proyecto{projects.length !== 1 ? 's' : ''} registrado{projects.length !== 1 ? 's' : ''}</div>
        </div>
        <a href="/desarrolladores/proyectos/nuevo" style={{
          display:'inline-flex',alignItems:'center',gap:'6px',
          background:'var(--dk)',color:'#fff',borderRadius:'var(--rp)',
          padding:'10px 20px',fontSize:'13px',fontWeight:500,textDecoration:'none'
        }}>➕ Nuevo proyecto</a>
      </div>

      {projects.length === 0 ? (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'2px dashed var(--bd)',padding:'60px',textAlign:'center'}}>
          <div style={{fontSize:'36px',marginBottom:'14px'}}>🏗️</div>
          <div style={{fontSize:'18px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>Sin proyectos aún</div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'24px'}}>Crea tu primer proyecto para empezar a recibir leads</div>
          <a href="/desarrolladores/proyectos/nuevo" style={{
            display:'inline-flex',alignItems:'center',gap:'6px',
            background:'var(--dk)',color:'#fff',borderRadius:'var(--rp)',
            padding:'10px 24px',fontSize:'13px',fontWeight:500,textDecoration:'none'
          }}>➕ Crear proyecto</a>
        </div>
      ) : (
        <div style={{display:'grid',gap:'14px'}}>
          {projects.map(p => {
            const epStyle = getEPStyle(p.estado_publicacion || 'borrador')
            return (
              <div key={p.id} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',display:'flex',gap:'20px',alignItems:'center'}}>
                {/* IMAGEN PLACEHOLDER */}
                <div style={{width:'80px',height:'80px',borderRadius:'var(--rs)',background:'linear-gradient(145deg,#0d2318,#1a5c3a)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'24px',opacity:.8}}>
                  🏙️
                </div>

                {/* INFO */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                    <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>{p.nombre}</div>
                    <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:epStyle.bg,color:epStyle.color}}>{epStyle.label}</span>
                    {p.destacado && <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:'var(--am-bg)',color:'var(--am)'}}>⭐ Destacado</span>}
                  </div>
                  <div style={{fontSize:'12px',color:'var(--mid)',marginBottom:'8px'}}>
                    {p.colonia}, {p.alcaldia} · {p.tipo} · {p.estado}
                  </div>
                  <div style={{display:'flex',gap:'16px',fontSize:'12px',color:'var(--mid)',flexWrap:'wrap'}}>
                    <span>💰 Desde ${p.precio_desde?.toLocaleString('es-MX')}</span>
                    {p.total_unidades && <span>🏠 {p.total_unidades} unidades</span>}
                    <span>📅 {new Date(p.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>

                {/* ACCIONES */}
                <div style={{display:'flex',flexDirection:'column',gap:'7px',flexShrink:0}}>
                  <a href={`/desarrolladores/proyectos/${p.id}`} style={{
                    fontFamily:'var(--sans)',fontSize:'12px',background:'var(--dk)',
                    color:'#fff',border:'none',borderRadius:'var(--rp)',
                    padding:'7px 16px',cursor:'pointer',textDecoration:'none',
                    textAlign:'center'
                  }}>✏️ Editar</a>
                  <a href={`/desarrolladores/proyectos/${p.id}/unidades`} style={{
                    fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',
                    color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',
                    padding:'7px 16px',cursor:'pointer',textDecoration:'none',
                    textAlign:'center'
                  }}>📋 Unidades</a>
                  <button
                    onClick={() => togglePublicado(p)}
                    style={{
                      fontFamily:'var(--sans)',fontSize:'12px',cursor:'pointer',
                      borderRadius:'var(--rp)',padding:'7px 16px',border:'none',
                      background: p.estado_publicacion === 'publicado' ? 'var(--rd-bg)' : p.estado_publicacion === 'en_revision' ? 'var(--am-bg)' : 'var(--gr-bg)',
                      color: p.estado_publicacion === 'publicado' ? 'var(--rd)' : p.estado_publicacion === 'en_revision' ? 'var(--am)' : 'var(--gr)',
                    }}
                  >
                    {p.estado_publicacion === 'publicado' ? '⏸ Despublicar' : p.estado_publicacion === 'en_revision' ? '⏳ En revisión' : '🚀 Publicar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
