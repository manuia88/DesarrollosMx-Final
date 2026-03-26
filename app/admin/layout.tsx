'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingProjects, setPendingProjects] = useState(0)
  const [pendingDevs, setPendingDevs] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      supabase.from('profiles').select('name, role').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (!data || data.role !== 'superadmin') { router.push('/'); return }
          setAdminName(data.name || 'Admin')
          setLoading(false)
        })
      // Contadores de pendientes
      supabase.from('projects').select('id', { count: 'exact' }).eq('estado_publicacion', 'en_revision')
        .then(({ count }) => setPendingProjects(count || 0))
      supabase.from('desarrolladoras').select('id', { count: 'exact' })
        .eq('verificacion_constitucion', false)
        .then(({ count }) => setPendingDevs(count || 0))
    })
  }, [])

  const nav = [
    { section: 'Analytics', items: [
      { href:'/admin', label:'Dashboard', icon:'📊' },
      { href:'/admin/participantes', label:'Participantes', icon:'👥' },
    ]},
    { section: 'Inteligencia de Mercado', items: [
      { href:'/admin/inteligencia/panorama', label:'Panorama', icon:'🗺️' },
      { href:'/admin/inteligencia/zonas', label:'Análisis por zona', icon:'📍' },
      { href:'/admin/inteligencia/precios', label:'Precios y tendencias', icon:'💰' },
      { href:'/admin/inteligencia/absorcion', label:'Absorción y velocity', icon:'⚡' },
      { href:'/admin/inteligencia/demanda', label:'Demanda vs oferta', icon:'🔍' },
      { href:'/admin/inteligencia/tipologia', label:'Tipología ganadora', icon:'🏆' },
      { href:'/admin/inteligencia/predicciones', label:'Predicciones', icon:'🔮' },
    ]},
    { section: 'Gestión', items: [
      { href:'/admin/proyectos', label:'Proyectos', icon:'🏗️', badge: pendingProjects },
      { href:'/admin/desarrolladoras', label:'Desarrolladoras', icon:'🏢', badge: pendingDevs },
      { href:'/admin/usuarios', label:'Usuarios', icon:'👤' },
      { href:'/admin/leads', label:'Leads', icon:'🎯' },
      { href:'/admin/revenue', label:'Revenue', icon:'💎' },
    ]},
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',color:'var(--mid)'}}>
      Verificando acceso...
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:'var(--sans)'}}>
      {/* TOP NAV */}
      <div style={{background:'var(--dk)',borderBottom:'1px solid rgba(255,255,255,.1)',height:'60px',display:'flex',alignItems:'center',padding:'0 24px',justifyContent:'space-between',position:'sticky',top:0,zIndex:500}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <a href="/" style={{fontSize:'17px',fontWeight:600,color:'#fff',textDecoration:'none',letterSpacing:'-.3px'}}>
            Desarrollos<em style={{fontStyle:'normal',color:'var(--gr2)'}}>MX</em>
          </a>
          <div style={{width:'1px',height:'20px',background:'rgba(255,255,255,.15)'}} />
          <span style={{fontSize:'13px',color:'rgba(255,255,255,.5)'}}>SuperAdmin</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          {(pendingProjects + pendingDevs) > 0 && (
            <div style={{background:'#DC2626',color:'#fff',borderRadius:'var(--rp)',fontSize:'11px',fontWeight:600,padding:'2px 8px'}}>
              {pendingProjects + pendingDevs} pendientes
            </div>
          )}
          <div style={{fontSize:'12px',color:'rgba(255,255,255,.6)'}}>👤 {adminName}</div>
        </div>
      </div>

      <div style={{display:'flex'}}>
        {/* SIDEBAR */}
        <div style={{width:'240px',background:'var(--wh)',borderRight:'1px solid var(--bd)',minHeight:'calc(100vh - 60px)',padding:'16px 0',flexShrink:0,position:'sticky',top:'60px',height:'calc(100vh - 60px)',overflowY:'auto'}}>
          {nav.map((section, si) => (
            <div key={si}>
              <div style={{fontSize:'10px',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--dim)',padding:'12px 20px 6px',marginTop:si>0?'8px':'0'}}>
                {section.section}
              </div>
              {section.items.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    display:'flex',alignItems:'center',gap:'10px',
                    padding:'9px 20px',fontSize:'13px',
                    textDecoration:'none',transition:'all .15s',
                    color: isActive(item.href) ? 'var(--dk)' : 'var(--mid)',
                    background: isActive(item.href) ? 'var(--bg)' : 'transparent',
                    fontWeight: isActive(item.href) ? 500 : 400,
                    borderLeft: isActive(item.href) ? '3px solid var(--dk)' : '3px solid transparent',
                  }}
                >
                  <span style={{fontSize:'14px'}}>{item.icon}</span>
                  <span style={{flex:1}}>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span style={{fontSize:'10px',fontWeight:600,background:'#DC2626',color:'#fff',borderRadius:'var(--rp)',padding:'1px 6px',minWidth:'18px',textAlign:'center'}}>{item.badge}</span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div style={{flex:1,padding:'24px 32px',maxWidth:'calc(100% - 240px)'}}>
          {children}
        </div>
      </div>
    </div>
  )
}
