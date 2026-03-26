export default function AdminLoading() {
  return (
    <div style={{padding:'40px',textAlign:'center',fontFamily:'var(--sans)'}}>
      <div style={{width:'28px',height:'28px',border:'3px solid var(--bd)',borderTopColor:'var(--dk)',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 10px'}} />
      <div style={{fontSize:'13px',color:'var(--mid)'}}>Cargando panel...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
