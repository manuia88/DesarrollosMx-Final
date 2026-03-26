export default function Loading() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--sans)',background:'var(--bg)'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'36px',height:'36px',border:'3px solid var(--bd)',borderTopColor:'var(--dk)',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}} />
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Cargando...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
