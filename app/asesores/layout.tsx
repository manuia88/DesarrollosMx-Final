'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export default function AsesoresLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [asesorName, setAsesorName] = useState('')
  const [asesorSlug, setAsesorSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [notifCount, setNotifCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      supabase.from('profiles').select('name, slug, role').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setAsesorName(data.name)
            setAsesorSlug(data.slug || '')
          }
          setLoading(false)
        })
      // Contar alertas no leídas
      supabase.from('market_alerts').select('id', { count: 'exact' })
        .eq('leida', false)
        .then(({ count }) => setNotifCount(count || 0))
    })
  }, [])

  const navItems = [
    { href:'/asesores', label:'Dashboard', icon:'📊' },
    { href:'/asesores/catalogo', label:'Catálogo', icon:'🏗️' },
    { href:'/asesores/clientes', label:'Mis clientes', icon:'👥' },
    { href:'/asesores/comparador', label:'Comparador', icon:'⚖️' },
    { href:'/asesores/guardados', label:'Guardados', icon:'❤️' },
    { href:'/asesores/leads', label:'Leads', icon:'🎯' },
    { href:'/asesores/comisiones', label:'Comisiones', icon:'💰' },
    { href:'/asesores/inteligencia', label:'Inteligencia', icon:'🧠' },
  ]

  const herramientas = [
    { href:'/asesores/herramientas/whatsapp-kit', label:'WhatsApp Kit', icon:'💬' },
    { href:'/asesores/herramientas/calculadora', label:'Calculadora', icon:'🧮' },
    { href:'/asesores/herramientas/dossier', label:'Dossier IA', icon:'🤖' },
  ]

  const isActive = (href: string) => {
    if (href === '/asesores') return pathname === '/asesores'
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
          <span style={{fontSize:'13px',color:'var(--mid)'}}>Portal Asesor</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          {notifCount > 0 && (
            <div style={{background:'var(--rd)',color:'#fff',borderRadius:'var(--rp)',fontSize:'11px',fontWeight:600,padding:'2px 8px'}}>
              {notifCount} alertas
            </div>
          )}
          <span style={{fontSize:'13px',color:'var(--mid)'}}>{asesorName}</span>
          {asesorSlug && (
            <a href={`/asesores/${asesorSlug}`} target="_blank" style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--gr-bg)',color:'var(--gr)',border:'none',borderRadius:'var(--rp)',padding:'6px 14px',cursor:'pointer',textDecoration:'none'}}>
              Ver mi perfil público
            </a>
          )}
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',color:'var(--mid)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'6px 14px',cursor:'pointer'}}
          >Cerrar sesión</button>
        </div>
      </div>

      <div style={{display:'flex'}}>
        {/* SIDEBAR */}
        <div style={{width:'220px',minHeight:'calc(100vh - 60px)',background:'var(--wh)',borderRight:'1px solid var(--bd)',padding:'20px 12px',flexShrink:0,position:'sticky',top:'60px',height:'calc(100vh - 60px)',overflowY:'auto'}}>

          <div style={{fontSize:'10px',fontWeight:600,color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.08em',padding:'0 8px',marginBottom:'8px'}}>Principal</div>
          {navItems.map(item => (
            <a key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'var(--rs)',fontSize:'13px',textDecoration:'none',marginBottom:'2px',background:isActive(item.href)?'var(--bg2)':'transparent',color:isActive(item.href)?'var(--dk)':'var(--mid)',fontWeight:isActive(item.href)?500:400}}>
              <span style={{fontSize:'15px'}}>{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div style={{height:'1px',background:'var(--bd)',margin:'16px 0'}} />
          <div style={{fontSize:'10px',fontWeight:600,color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.08em',padding:'0 8px',marginBottom:'8px'}}>Herramientas</div>
          {herramientas.map(item => (
            <a key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'var(--rs)',fontSize:'13px',textDecoration:'none',marginBottom:'2px',background:isActive(item.href)?'var(--bg2)':'transparent',color:isActive(item.href)?'var(--dk)':'var(--mid)',fontWeight:isActive(item.href)?500:400}}>
              <span style={{fontSize:'15px'}}>{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div style={{height:'1px',background:'var(--bd)',margin:'16px 0'}} />
          <div style={{fontSize:'10px',fontWeight:600,color:'var(--dim)',textTransform:'uppercase',letterSpacing:'.08em',padding:'0 8px',marginBottom:'8px'}}>Cuenta</div>
          <a href="/asesores/academia" style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'var(--rs)',fontSize:'13px',textDecoration:'none',marginBottom:'2px',background:isActive('/asesores/academia')?'var(--bg2)':'transparent',color:isActive('/asesores/academia')?'var(--dk)':'var(--mid)'}}>
            <span style={{fontSize:'15px'}}>🎓</span>Academia
          </a>
          <a href="/asesores/perfil" style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'var(--rs)',fontSize:'13px',textDecoration:'none',marginBottom:'2px',background:isActive('/asesores/perfil')?'var(--bg2)':'transparent',color:isActive('/asesores/perfil')?'var(--dk)':'var(--mid)'}}>
            <span style={{fontSize:'15px'}}>👤</span>Mi perfil
          </a>
          <a href="/" style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'var(--rs)',fontSize:'13px',textDecoration:'none',color:'var(--mid)'}}>
            <span style={{fontSize:'15px'}}>🌐</span>Ver portal
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
