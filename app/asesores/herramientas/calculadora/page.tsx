'use client'
import { useState } from 'react'

export default function CalculadoraPage() {
  const [precio, setPrecio] = useState(6500000)
  const [enganche, setEnganche] = useState(20)
  const [meses, setMeses] = useState(18)
  const [plusvalia, setPlusvalia] = useState(8)
  const [años, setAños] = useState(3)
  const [rentaMensual, setRentaMensual] = useState(18000)
  const [escenario, setEscenario] = useState<'vivir'|'rentar'|'revender'>('vivir')

  const engancheMonto = Math.round(precio * enganche / 100)
  const resto = precio - engancheMonto
  const mensualidad = meses > 0 ? Math.round(resto * 0.4 / meses) : 0
  const pagoFinal = meses > 0 ? Math.round(resto * 0.6) : resto
  const valorFuturo = Math.round(precio * Math.pow(1 + plusvalia/100, años))
  const gananciaReventa = valorFuturo - precio
  const rentaAnual = rentaMensual * 12
  const rentaTotal = rentaAnual * años
  const roiRenta = precio > 0 ? Math.round(rentaAnual / precio * 100 * 10) / 10 : 0
  const gastoNotarial = Math.round(precio * 0.06)

  const sectionStyle = { background:'var(--wh)', borderRadius:'var(--r)', border:'1px solid var(--bd)', padding:'20px', marginBottom:'16px' }
  const labelStyle = { fontSize:'12px', fontWeight:500 as const, color:'var(--dk)', display:'block' as const, marginBottom:'5px' }
  const valueStyle = { fontSize:'20px', fontWeight:600 as const, color:'var(--gr)' }

  return (
    <div style={{maxWidth:'800px'}}>
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>🧮 Calculadora de inversión</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Analiza los 3 escenarios: vivir, rentar o revender</div>
      </div>

      {/* PRECIO BASE */}
      <div style={sectionStyle}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Parámetros del proyecto</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <div>
            <label style={labelStyle}>Precio de compra</label>
            <input type="number" value={precio} onChange={e => setPrecio(+e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1px solid var(--bd)',fontSize:'13px',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box' as const}} />
            <div style={{fontSize:'11px',color:'var(--gr)',marginTop:'4px'}}>${precio.toLocaleString('es-MX')} MXN</div>
          </div>
          <div>
            <label style={labelStyle}>Plusvalía anual estimada (%)</label>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <input type="range" min="3" max="20" value={plusvalia} onChange={e => setPlusvalia(+e.target.value)} style={{flex:1,cursor:'pointer'}} />
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--dk)',minWidth:'35px'}}>{plusvalia}%</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Horizonte de inversión (años)</label>
            <div style={{display:'flex',gap:'8px'}}>
              {[1,2,3,5,10].map(y => (
                <button key={y} onClick={() => setAños(y)} style={{fontFamily:'var(--sans)',fontSize:'12px',padding:'6px 12px',borderRadius:'var(--rp)',border:años===y?'none':'1px solid var(--bd)',background:años===y?'var(--dk)':'var(--wh)',color:años===y?'#fff':'var(--mid)',cursor:'pointer'}}>{y}a</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Renta mensual estimada</label>
            <input type="number" value={rentaMensual} onChange={e => setRentaMensual(+e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1px solid var(--bd)',fontSize:'13px',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box' as const}} />
          </div>
        </div>
      </div>

      {/* PLAN DE PAGOS */}
      <div style={sectionStyle}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Plan de pagos</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'14px'}}>
          <div>
            <label style={labelStyle}>Enganche (%)</label>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <input type="range" min="10" max="50" value={enganche} onChange={e => setEnganche(+e.target.value)} style={{flex:1,cursor:'pointer'}} />
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--dk)',minWidth:'35px'}}>{enganche}%</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Mensualidades durante construcción</label>
            <div style={{display:'flex',gap:'6px'}}>
              {[0,6,12,18,24].map(m => (
                <button key={m} onClick={() => setMeses(m)} style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'5px 10px',borderRadius:'var(--rp)',border:meses===m?'none':'1px solid var(--bd)',background:meses===m?'var(--dk)':'var(--wh)',color:meses===m?'#fff':'var(--mid)',cursor:'pointer'}}>{m === 0 ? 'Sin' : m}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
          {[
            {l:'Enganche',v:`$${engancheMonto.toLocaleString('es-MX')}`,s:`${enganche}% del precio`},
            {l:meses>0?`${meses} mensualidades`:'Sin mensualidades',v:meses>0?`$${mensualidad.toLocaleString('es-MX')}/mes`:'—',s:meses>0?'durante construcción':'pago directo'},
            {l:'Pago final',v:`$${pagoFinal.toLocaleString('es-MX')}`,s:'al escriturar'},
          ].map((item,i) => (
            <div key={i} style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:'14px',fontWeight:600,color:'var(--gr)',marginBottom:'2px'}}>{item.v}</div>
              <div style={{fontSize:'10px',color:'var(--mid)',marginBottom:'1px'}}>{item.l}</div>
              <div style={{fontSize:'9px',color:'var(--dim)'}}>{item.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ESCENARIOS */}
      <div style={sectionStyle}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Análisis de escenarios</div>
        <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
          {[['vivir','🏠 Para vivir'],['rentar','🏢 Para rentar'],['revender','📈 Para revender']].map(([v,l]) => (
            <button key={v} onClick={() => setEscenario(v as typeof escenario)} style={{fontFamily:'var(--sans)',fontSize:'13px',padding:'9px 18px',borderRadius:'var(--rp)',border:escenario===v?'none':'1px solid var(--bd)',background:escenario===v?'var(--dk)':'var(--wh)',color:escenario===v?'#fff':'var(--mid)',cursor:'pointer',flex:1}}>{l}</button>
          ))}
        </div>

        {escenario === 'vivir' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>Costo total de adquisición</div>
              {[
                {l:'Precio de compra',v:`$${precio.toLocaleString('es-MX')}`},
                {l:'Gastos notariales (~6%)',v:`$${gastoNotarial.toLocaleString('es-MX')}`},
                {l:'Total desembolso',v:`$${(precio+gastoNotarial).toLocaleString('es-MX')}`,bold:true},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>
                  <span style={{color:'var(--mid)'}}>{r.l}</span>
                  <span style={{fontWeight: r.bold ? 700 : 500,color:'var(--dk)'}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',padding:'16px',border:'1px solid rgba(27,67,50,.15)'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--gr)',marginBottom:'10px'}}>Plusvalía en {años} año{años>1?'s':''}</div>
              <div style={{fontSize:'28px',fontWeight:700,color:'var(--gr)',marginBottom:'4px'}}>${valorFuturo.toLocaleString('es-MX')}</div>
              <div style={{fontSize:'12px',color:'var(--gr)',marginBottom:'12px'}}>+${gananciaReventa.toLocaleString('es-MX')} de ganancia potencial</div>
              <div style={{fontSize:'11px',color:'var(--mid)'}}>
                Con plusvalía de {plusvalia}%/año el valor sube {Math.round((valorFuturo/precio-1)*100)}% en {años} año{años>1?'s':''}
              </div>
            </div>
          </div>
        )}

        {escenario === 'rentar' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>Flujo de renta en {años} año{años>1?'s':''}</div>
              {[
                {l:'Renta mensual',v:`$${rentaMensual.toLocaleString('es-MX')}`},
                {l:'Renta anual',v:`$${rentaAnual.toLocaleString('es-MX')}`},
                {l:`Renta total (${años}a)`,v:`$${rentaTotal.toLocaleString('es-MX')}`,bold:true},
                {l:'ROI por renta',v:`${roiRenta}%/año`,bold:true},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>
                  <span style={{color:'var(--mid)'}}>{r.l}</span>
                  <span style={{fontWeight: r.bold ? 700 : 500,color:'var(--dk)'}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',padding:'16px',border:'1px solid rgba(27,67,50,.15)'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--gr)',marginBottom:'10px'}}>Retorno total en {años} año{años>1?'s':''}</div>
              <div style={{fontSize:'24px',fontWeight:700,color:'var(--gr)',marginBottom:'4px'}}>${(rentaTotal + gananciaReventa).toLocaleString('es-MX')}</div>
              <div style={{fontSize:'11px',color:'var(--gr)',marginBottom:'12px'}}>Renta + plusvalía combinadas</div>
              {[
                {l:'Solo por rentas',v:`$${rentaTotal.toLocaleString('es-MX')}`},
                {l:'Solo por plusvalía',v:`$${gananciaReventa.toLocaleString('es-MX')}`},
                {l:'ROI combinado',v:`${Math.round((rentaTotal+gananciaReventa)/precio*100)}%`},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'11px',padding:'3px 0',borderBottom:'1px solid rgba(27,67,50,.1)'}}>
                  <span style={{color:'var(--mid)'}}>{r.l}</span>
                  <span style={{fontWeight:600,color:'var(--gr)'}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {escenario === 'revender' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
            <div style={{background:'var(--bg2)',borderRadius:'var(--r)',padding:'16px'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>Proyección de reventa en {años} año{años>1?'s':''}</div>
              {[
                {l:'Precio de compra hoy',v:`$${precio.toLocaleString('es-MX')}`},
                {l:`Valor estimado en ${años}a`,v:`$${valorFuturo.toLocaleString('es-MX')}`,bold:true},
                {l:'Ganancia bruta',v:`$${gananciaReventa.toLocaleString('es-MX')}`,bold:true},
                {l:'Ganancia neta (~ISR 30%)',v:`$${Math.round(gananciaReventa*0.7).toLocaleString('es-MX')}`},
                {l:'ROI total',v:`${Math.round(gananciaReventa/precio*100)}%`},
              ].map((r,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>
                  <span style={{color:'var(--mid)'}}>{r.l}</span>
                  <span style={{fontWeight: r.bold ? 700 : 500,color: r.bold ? 'var(--gr)' : 'var(--dk)'}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{background:'var(--gr-bg)',borderRadius:'var(--r)',padding:'16px',border:'1px solid rgba(27,67,50,.15)'}}>
              <div style={{fontSize:'12px',fontWeight:500,color:'var(--gr)',marginBottom:'10px'}}>¿Cuándo recuperas la inversión?</div>
              <div style={{fontSize:'24px',fontWeight:700,color:'var(--gr)',marginBottom:'4px'}}>{Math.round(100/plusvalia*10)/10} años</div>
              <div style={{fontSize:'11px',color:'var(--gr)',marginBottom:'14px'}}>Con plusvalía de {plusvalia}%/año</div>
              <div style={{fontSize:'11px',color:'var(--mid)',lineHeight:1.6}}>
                La preventa permite comprar hoy al precio actual y revender después de la entrega con la plusvalía acumulada durante la construcción.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DISCLAIMER */}
      <div style={{fontSize:'10px',color:'var(--dim)',textAlign:'center',lineHeight:1.6}}>
        * Las proyecciones son estimadas y no garantizan rendimientos futuros. La plusvalía real depende de factores de mercado. Consulta con un asesor financiero antes de tomar decisiones de inversión.
      </div>
    </div>
  )
}
