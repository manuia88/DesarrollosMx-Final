'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  nombre: string
  estado: string
  colonia: string
  alcaldia: string
  precio_desde: number
  entrega_quarter?: string
  entrega_year?: number
  m2_min?: number
  m2_max?: number
  recamaras_min?: number
  recamaras_max?: number
  cajones_min?: number
  cajones_max?: number
  destacado?: boolean
  fotos?: { url: string; is_hero: boolean; orden: number }[]
}

export default function ProjectCard({
  project,
  onNavigate,
  size = 'grid',
}: {
  project: Project
  onNavigate: (view: string, id?: string) => void
  size?: 'grid' | 'large' | 'list'
}) {
  const [inWishlist, setInWishlist] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('project_id', project.id)
          .single()
          .then(({ data }) => { if (data) setInWishlist(true) })
      }
    })
  }, [project.id])

  async function toggleWishlist(e: React.MouseEvent) {
    e.stopPropagation()
    if (!userId) { window.location.href = '/auth/login'; return }
    if (inWishlist) {
      await supabase.from('wishlist').delete()
        .eq('user_id', userId).eq('project_id', project.id)
      setInWishlist(false)
    } else {
      await supabase.from('wishlist').insert({ user_id: userId, project_id: project.id })
      setInWishlist(true)
    }
  }

  function getBadgeStyle(estado: string) {
    if (estado === 'Entrega inmediata') return { background: 'rgba(255,255,255,.9)', color: '#1a6640' }
    if (estado === 'Preventa') return { background: 'rgba(255,255,255,.9)', color: '#2a5cb0' }
    return { background: 'rgba(255,255,255,.9)', color: 'var(--dk)' }
  }

  const imgHeight = size === 'large' ? '210px' : size === 'list' ? '190px' : '200px'
  const cardWidth = size === 'large' ? '340px' : size === 'list' ? '100%' : undefined

  const gradients = [
    'linear-gradient(145deg,#0d2318,#1a5c3a)',
    'linear-gradient(145deg,#0e1e2e,#1a3d5a)',
    'linear-gradient(145deg,#1e0d0d,#4a1818)',
    'linear-gradient(145deg,#121020,#2a2060)',
    'linear-gradient(145deg,#1a0e20,#3a1a5a)',
    'linear-gradient(145deg,#1a1208,#5a3a10)',
  ]
  const gradientIndex = project.id ? project.id.charCodeAt(0) % gradients.length : 0
  const bg = gradients[gradientIndex]

  const emojis = ['🏙️','🏢','🏗️','🏛️','🏘️','🏠']
  const emojiIndex = project.id ? project.id.charCodeAt(1) % emojis.length : 0

  return (
    <div
      onClick={() => onNavigate('detail', project.id)}
      style={{
        background:'var(--wh)',borderRadius:'var(--r)',overflow:'hidden',
        cursor:'pointer',border:'1px solid var(--bd2)',
        transition:'box-shadow .18s,border-color .18s',
        flexShrink: size === 'large' ? 0 : undefined,
        width: cardWidth,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow='0 4px 22px rgba(33,45,48,.1)'
        e.currentTarget.style.borderColor='rgba(33,45,48,.17)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow='none'
        e.currentTarget.style.borderColor='rgba(33,45,48,.06)'
      }}
    >
      <div style={{
        position:'relative',overflow:'hidden',display:'flex',
        alignItems:'center',justifyContent:'center',
        height:imgHeight,background:bg
      }}>
        <span style={{fontSize:'38px',opacity:.13}}>{emojis[emojiIndex]}</span>
        <div style={{position:'absolute',top:'10px',left:'10px',display:'flex',gap:'4px',flexWrap:'wrap'}}>
          {project.destacado && (
            <span style={{fontSize:'10px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',background:'rgba(255,255,255,.9)',color:'var(--dk)',display:'inline-flex',alignItems:'center',gap:'3px'}}>
              ⭐ Destacado
            </span>
          )}
          <span style={{fontSize:'10px',fontWeight:500,padding:'3px 9px',borderRadius:'var(--rp)',display:'inline-flex',alignItems:'center',gap:'3px',...getBadgeStyle(project.estado)}}>
            {project.estado}
          </span>
        </div>
        <button
          onClick={toggleWishlist}
          style={{
            position:'absolute',top:'8px',right:'8px',width:'26px',height:'26px',
            borderRadius:'50%',background:'rgba(255,255,255,.88)',border:'none',
            fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'
          }}
        >
          {inWishlist ? '♥' : '♡'}
        </button>
        <div style={{position:'absolute',bottom:'8px',right:'8px',background:'rgba(0,0,0,.48)',color:'#fff',fontSize:'10px',padding:'2px 7px',borderRadius:'4px'}}>
          📷 1/8
        </div>
      </div>
      <div style={{padding:'14px 16px 10px',display:'flex',flexDirection:'column',gap:'3px'}}>
        <div style={{fontSize:'19px',fontWeight:500,color:'var(--gr)',lineHeight:1.2}}>
          ${project.precio_desde.toLocaleString('es-MX')}
          {size === 'large' && ' MXN'}
        </div>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)'}}>{project.nombre}</div>
        <div style={{fontSize:'11px',color:'var(--mid)'}}>{project.colonia}, {project.alcaldia}{size === 'large' ? ' · CDMX' : ''}</div>
        <div style={{display:'flex',gap:'4px',flexWrap:'wrap',marginTop:'4px'}}>
          <span style={{fontSize:'10px',color:'var(--mid)',background:'var(--bg2)',padding:'2px 7px',borderRadius:'4px'}}>
            {project.estado}
          </span>
          {project.entrega_quarter && project.entrega_year && (
            <span style={{fontSize:'10px',color:'var(--mid)',background:'var(--bg2)',padding:'2px 7px',borderRadius:'4px'}}>
              Entrega {project.entrega_quarter} {project.entrega_year}
            </span>
          )}
        </div>
        <div style={{display:'flex',gap:'10px',fontSize:'11px',color:'var(--mid)',marginTop:'4px'}}>
          {project.m2_min && <span>📐 {project.m2_min}–{project.m2_max} m²</span>}
          {project.recamaras_min && <span>🛏 {project.recamaras_min}–{project.recamaras_max}</span>}
          {project.cajones_min && <span>🚗 {project.cajones_min}–{project.cajones_max}</span>}
        </div>
      </div>
      <div style={{padding:'10px 16px 14px',display:'flex',gap:'7px'}}>
        <button
          onClick={e => e.stopPropagation()}
          style={{
            flex:1,fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',
            color:'var(--dk)',border:'1px solid rgba(33,45,48,.3)',
            borderRadius:'var(--rp)',padding:'8px',cursor:'pointer'
          }}
        >Agendar</button>
        <button
          onClick={e => { e.stopPropagation(); onNavigate('detail', project.id) }}
          style={{
            flex:1,fontFamily:'var(--sans)',fontSize:'12px',background:'var(--dk)',
            color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px',cursor:'pointer'
          }}
        >Ver →</button>
      </div>
    </div>
  )
}
