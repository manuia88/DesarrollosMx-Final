'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',background:'var(--bg)'}}>
      <div style={{textAlign:'center',maxWidth:'400px',padding:'40px'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>😵</div>
        <h1 style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>Algo salió mal</h1>
        <p style={{fontSize:'13px',color:'var(--mid)',lineHeight:1.6,marginBottom:'24px'}}>
          Ocurrió un error inesperado. Puedes intentar recargar la página.
        </p>
        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <button onClick={reset} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 24px',cursor:'pointer'}}>
            Reintentar
          </button>
          <a href="/" style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'10px 24px',textDecoration:'none'}}>
            Ir al inicio
          </a>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <pre style={{marginTop:'20px',fontSize:'10px',color:'var(--dim)',textAlign:'left',background:'var(--bg2)',padding:'12px',borderRadius:'var(--rs)',overflow:'auto',maxHeight:'200px'}}>
            {error.message}
          </pre>
        )}
      </div>
    </div>
  )
}
