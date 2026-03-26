'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export default function DesarrolladoresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [devName, setDevName] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      supabase.from('desarrolladoras').select('nombre').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data) setDevName(data.nombre)
          setLoading(false)
        })
    })
  }, [])

  const navItems = [
    { href: '/desarrolladores', label: 'Dashboard', icon: '📊' },
    { href: '/desarrolladores/proyectos', label: 'Mis proyectos', icon: '🏗️' },
    { href: '/desarrolladores/proyectos/nuevo', label: 'Nuevo proyecto', icon: '➕' },
    { href: '/desarrolladores/perfil', label: 'Mi perfil', icon: '👤' },
  ]

  const isActive = (href: string) => {
    if (href === '/desarrolladores') return pathname === '/desarrolladores'
    return pathname.startsWith(href)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',color:'var(--mid)'}}>
      Cargando...
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',fontFamily:'var(--sans)'}}>
      {/* TOP NAV */}
      <div style={{background:'var(--wh)',borderBottom:'1px solid var(--bd)',height:'60px',display:'flex',alignItems:'center',padding:'0 24px',justifyContent:'space-between',position:'sticky',top:0,zIndex:500}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <a href="/" style={{fontSize:'17px',fontWeight:600,color:'var(--dk)',textDecoration:'none',letterSpacing:'-.3px'}}>
            Desarrollos<em style={{fontStyle:'normal',color:'var(--gr2)'}}>MX</em>
          </a>
          <div style={{width:'1px',height:'20px',background:'var(--bd)'}} />
          <span style={{fontSize:'13px',color:'var(--mid)'}}>Panel Desarrollador</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <span style={{fontSize:'13px',color:'var(--mid)'}}>{devName}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',color:'var(--mid)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'6px 14px',cursor:'pointer'}}
          >Cerrar sesión</button>
        </div>
      </div>

      <div style={{display:'flex'}}>
        {/* SIDEBAR */}
        <div style={{width:'220px',minHeight:'calc(100vh - 60px)',background:'var(--wh)',borderRight:'1px solid var(--bd)',padding:'20px 12px',flexShrink:0,position:'sticky',top:'60px',height:'calc(100vh - 60px)',overflowY:'auto'}}>
          <div style={{fontSize:'10px',fontWeight:600,color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.08em',padding:'0 8px',marginBottom:'8px'}}>
            Menú
          </div>
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display:'flex',alignItems:'center',gap:'10px',
                padding:'9px 12px',borderRadius:'var(--rs)',
                fontSize:'13px',textDecoration:'none',marginBottom:'2px',
                background: isActive(item.href) ? 'var(--bg2)' : 'transparent',
                color: isActive(item.href) ? 'var(--dk)' : 'var(--mid)',
                fontWeight: isActive(item.href) ? 500 : 400,
              }}
            >
              <span style={{fontSize:'15px'}}>{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div style={{height:'1px',background:'var(--bd)',margin:'16px 0'}} />
          <div style={{fontSize:'10px',fontWeight:600,color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.08em',padding:'0 8px',marginBottom:'8px'}}>
            Soporte
          </div>
          <a href="/" style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'var(--rs)',fontSize:'13px',textDecoration:'none',color:'var(--mid)'}}>
            <span style={{fontSize:'15px'}}>🌐</span>Ver portal público
          </a>
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,padding:'32px',maxWidth:'calc(100vw - 220px)',overflowX:'auto'}}>
          {children}
        </div>
      </div>
    </div>
  )
}
