'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [userName, setUserName] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('name').eq('user_id', user.id).single()
          .then(({ data }) => { if (data) setUserName(data.name) })
      }
    })
  }, [])

  return (
    <nav style={{
      background:'var(--wh)',borderBottom:'1px solid var(--bd)',height:'60px',
      display:'flex',alignItems:'center',padding:'0 40px',
      justifyContent:'space-between',position:'sticky',top:0,zIndex:500
    }}>
      <div
        onClick={() => onNavigate?.('home')}
        style={{fontSize:'17px',fontWeight:600,color:'var(--dk)',cursor:'pointer',letterSpacing:'-.3px',userSelect:'none'}}
      >
        Desarrollos<em style={{fontStyle:'normal',color:'var(--gr2)'}}>MX</em>
      </div>
      <div style={{display:'flex',gap:'28px'}}>
        <span
          onClick={() => onNavigate?.('explorar')}
          style={{fontSize:'13px',color:'var(--mid)',cursor:'pointer'}}
        >Ver proyectos</span>
        <span style={{fontSize:'13px',color:'var(--mid)',cursor:'pointer'}}>Colonias</span>
        <span style={{fontSize:'13px',color:'var(--mid)',cursor:'pointer'}}>Blog</span>
      </div>
      <div style={{display:'flex',gap:'8px'}}>
        {userName ? (
          <>
            <span style={{fontSize:'13px',color:'var(--mid)',display:'flex',alignItems:'center',padding:'0 8px'}}>{userName}</span>
            <a href="/auth/login" style={{
              fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',
              color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px 18px',
              cursor:'pointer',textDecoration:'none',display:'flex',alignItems:'center'
            }}>Mi cuenta</a>
          </>
        ) : (
          <>
            <a href="/auth/registro" style={{
              fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',
              color:'var(--dk)',border:'1px solid rgba(33,45,48,.3)',
              borderRadius:'var(--rp)',padding:'7px 16px',cursor:'pointer',
              textDecoration:'none',display:'flex',alignItems:'center'
            }}>Soy asesor</a>
            <a href="/auth/registro" style={{
              fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',
              color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px 18px',
              cursor:'pointer',textDecoration:'none',display:'flex',alignItems:'center'
            }}>Registrarme</a>
          </>
        )}
      </div>
    </nav>
  )
}
