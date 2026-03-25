'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .single()

    const role = profile?.role
    if (role === 'asesor') router.push('/asesores')
    else if (role === 'desarrollador') router.push('/desarrolladores')
    else if (role === 'superadmin') router.push('/admin')
    else router.push('/')
  }

  return (
    <div style={{
      minHeight:'100vh',background:'#F7F6F4',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'DM Sans,system-ui,sans-serif'
    }}>
      <div style={{
        background:'#fff',borderRadius:'10px',
        border:'1px solid rgba(33,45,48,.12)',
        padding:'40px',width:'100%',maxWidth:'400px'
      }}>
        <div style={{marginBottom:'28px'}}>
          <div style={{fontSize:'17px',fontWeight:600,color:'#212D30',marginBottom:'6px'}}>
            Desarrollos<span style={{color:'#2D6A4F'}}>MX</span>
          </div>
          <div style={{fontSize:'22px',fontWeight:600,color:'#212D30',marginBottom:'4px'}}>
            Iniciar sesión
          </div>
          <div style={{fontSize:'13px',color:'rgba(33,45,48,.52)'}}>
            Accede a tu cuenta
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'14px'}}>
            <label style={{fontSize:'12px',fontWeight:500,color:'#212D30',display:'block',marginBottom:'5px'}}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width:'100%',padding:'9px 12px',borderRadius:'8px',
                border:'1px solid rgba(33,45,48,.2)',fontSize:'13px',
                fontFamily:'DM Sans,sans-serif',outline:'none',
                boxSizing:'border-box' as const
              }}
            />
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{fontSize:'12px',fontWeight:500,color:'#212D30',display:'block',marginBottom:'5px'}}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width:'100%',padding:'9px 12px',borderRadius:'8px',
                border:'1px solid rgba(33,45,48,.2)',fontSize:'13px',
                fontFamily:'DM Sans,sans-serif',outline:'none',
                boxSizing:'border-box' as const
              }}
            />
          </div>

          {error && (
            <div style={{
              background:'#FEF2F2',border:'1px solid #FCA5A5',borderRadius:'7px',
              padding:'9px 12px',fontSize:'12px',color:'#991B1B',marginBottom:'14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:'100%',padding:'10px',borderRadius:'9999px',
              background:'#212D30',color:'#fff',border:'none',
              fontSize:'13px',fontWeight:500,cursor:'pointer',
              fontFamily:'DM Sans,sans-serif',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{marginTop:'18px',textAlign:'center',fontSize:'13px',color:'rgba(33,45,48,.52)'}}>
          ¿No tienes cuenta?{' '}
          <a href="/auth/registro" style={{color:'#2D6A4F',textDecoration:'none',fontWeight:500}}>
            Regístrate
          </a>
        </div>
      </div>
    </div>
  )
}
