import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',background:'var(--bg)'}}>
      <div style={{textAlign:'center',maxWidth:'400px',padding:'40px'}}>
        <div style={{fontSize:'64px',fontWeight:700,color:'var(--bd)',marginBottom:'8px'}}>404</div>
        <h1 style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>Página no encontrada</h1>
        <p style={{fontSize:'13px',color:'var(--mid)',lineHeight:1.6,marginBottom:'24px'}}>
          La página que buscas no existe o fue movida.
        </p>
        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <Link href="/" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'9999px',padding:'10px 24px',textDecoration:'none'}}>
            Ir al inicio
          </Link>
          <Link href="/auth/login" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:'var(--dk)',border:'1px solid rgba(33,45,48,.12)',borderRadius:'9999px',padding:'10px 24px',textDecoration:'none'}}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
