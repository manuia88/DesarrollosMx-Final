'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comision {
  id: string
  project_id: string
  lead_id: string
  valor_venta: number
  porcentaje: number
  monto_estimado: number
  estado: string
  notas: string
  pagado_at: string
  created_at: string
  projects?: { nombre: string; colonia: string; alcaldia: string }
}

interface OutcomeCerrado {
  id: string
  project_id: string
  valor_cierre: number
  comision_estimada: number
  created_at: string
  projects?: { nombre: string; colonia: string; comision_pct: number; precio_desde: number }
}

export default function ComisionesPage() {
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [outcomes, setOutcomes] = useState<OutcomeCerrado[]>([])
  const [loading, setLoading] = useState(true)
  const [asesorId, setAsesorId] = useState<string | null>(null)
  const [metaMensual, setMetaMensual] = useState(150000)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
      if (!profile) return
      setAsesorId(profile.id)
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from('comisiones').select('*, projects(nombre, colonia, alcaldia)').eq('asesor_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('asesor_outcomes').select('*, projects(nombre, colonia, comision_pct, precio_desde)').eq('asesor_id', profile.id).eq('resultado', 'cerrado').order('created_at', { ascending: false }),
      ])
      setComisiones((c as Comision[]) || [])
      setOutcomes((o as OutcomeCerrado[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalProyectado = outcomes.reduce((sum, o) => sum + (o.comision_estimada || 0), 0)
  const totalPagado = comisiones.filter(c => c.estado === 'pagada').reduce((sum, c) => sum + (c.monto_estimado || 0), 0)
  const totalPendiente = comisiones.filter(c => c.estado === 'confirmada').reduce((sum, c) => sum + (c.monto_estimado || 0), 0)
  const pctMeta = metaMensual > 0 ? Math.min(100, Math.round(totalProyectado / metaMensual * 100)) : 0

  function getEstadoStyle(e: string) {
    if (e === 'pagada') return { bg:'#DCFCE7', color:'#15803D' }
    if (e === 'confirmada') return { bg:'#FEF9C3', color:'#A16207' }
    if (e === 'en_proceso') return { bg:'var(--bl-bg)', color:'var(--bl)' }
    if (e === 'cancelada') return { bg:'#FEE2E2', color:'#DC2626' }
    return { bg:'var(--bg2)', color:'var(--mid)' }
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando comisiones...</div>

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>Mis comisiones</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Seguimiento de ingresos y proyecciones</div>
      </div>

      {/* META MENSUAL */}
      <div style={{background:'var(--dk)',borderRadius:'var(--r)',padding:'24px',marginBottom:'20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <div style={{fontSize:'11px',fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginBottom:'4px'}}>Meta mensual</div>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <span style={{fontSize:'28px',fontWeight:600,color:'#fff'}}>${metaMensual.toLocaleString('es-MX')}</span>
              <input
                type="range" min="50000" max="1000000" step="50000" value={metaMensual}
                onChange={e => setMetaMensual(+e.target.value)}
                style={{width:'120px',cursor:'pointer'}}
              />
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'11px',color:'rgba(255,255,255,.4)',marginBottom:'4px'}}>Proyectado este mes</div>
            <div style={{fontSize:'28px',fontWeight:600,color: pctMeta >= 100 ? '#4CAF7D' : '#fff'}}>${Math.round(totalProyectado/1000)}k</div>
          </div>
        </div>
        <div style={{background:'rgba(255,255,255,.1)',borderRadius:'var(--rp)',height:'8px',overflow:'hidden',marginBottom:'8px'}}>
          <div style={{height:'100%',background: pctMeta >= 100 ? '#4CAF7D' : '#fff',borderRadius:'var(--rp)',width:`${pctMeta}%`,transition:'width .4s'}} />
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'rgba(255,255,255,.4)'}}>
          <span>{pctMeta}% de la meta</span>
          <span>{pctMeta >= 100 ? '🎉 Meta alcanzada' : `Faltan $${Math.round((metaMensual - totalProyectado)/1000)}k`}</span>
        </div>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'24px'}}>
        {[
          {l:'Cierres registrados',v:outcomes.length,c:'var(--dk)',icon:'🏆'},
          {l:'Comisión proyectada',v:`$${Math.round(totalProyectado/1000)}k`,c:'var(--gr)',icon:'📈'},
          {l:'Comisión confirmada',v:`$${Math.round(totalPendiente/1000)}k`,c:'var(--am)',icon:'⏳'},
          {l:'Comisión cobrada',v:`$${Math.round(totalPagado/1000)}k`,c:'var(--gr)',icon:'✅'},
        ].map((s,i) => (
          <div key={i} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'18px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <span style={{fontSize:'11px',color:'var(--mid)',textTransform:'uppercase',letterSpacing:'.06em'}}>{s.l}</span>
              <span style={{fontSize:'16px'}}>{s.icon}</span>
            </div>
            <div style={{fontSize:'24px',fontWeight:600,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* CIERRES REGISTRADOS */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',marginBottom:'20px'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid var(--bd)',fontSize:'14px',fontWeight:500,color:'var(--dk)'}}>
          🏆 Cierres registrados
        </div>
        {outcomes.length === 0 ? (
          <div style={{padding:'32px',textAlign:'center',color:'var(--mid)',fontSize:'13px'}}>
            Registra tus cierres desde la sección de Leads para ver tu historial aquí
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'var(--bg2)'}}>
                {['Proyecto','Fecha','Comisión estimada','Acciones'].map((h,i) => (
                  <th key={i} style={{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:600,color:'var(--mid)',letterSpacing:'.04em',textTransform:'uppercase',borderBottom:'1px solid var(--bd)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outcomes.map((o,idx) => {
                const comision = o.comision_estimada || (o.projects?.comision_pct && o.projects?.precio_desde ? Math.round(o.projects.precio_desde * o.projects.comision_pct / 100) : 0)
                return (
                  <tr key={o.id} style={{borderBottom:'1px solid var(--bd2)',background:idx%2===0?'transparent':'rgba(33,45,48,.015)'}}>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{fontWeight:500,color:'var(--dk)'}}>{o.projects?.nombre || '—'}</div>
                      <div style={{fontSize:'11px',color:'var(--mid)'}}>{o.projects?.colonia}</div>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:'12px',color:'var(--mid)'}}>{new Date(o.created_at).toLocaleDateString('es-MX')}</td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontSize:'14px',fontWeight:600,color:'var(--gr)'}}>
                        ${comision.toLocaleString('es-MX')}
                      </span>
                      {o.projects?.comision_pct && (
                        <div style={{fontSize:'10px',color:'var(--mid)'}}>{o.projects.comision_pct}% del precio base</div>
                      )}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:'#DCFCE7',color:'#15803D'}}>✓ Cerrado</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* CALCULADORA DE PROYECCIÓN */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px'}}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'16px'}}>🧮 Calculadora de proyección</div>
        <div style={{fontSize:'12px',color:'var(--mid)',marginBottom:'16px',lineHeight:1.6}}>
          ¿Cuánto puedes ganar si cierras X proyectos este mes?
        </div>
        {[
          {cierres:1,ticket:6500000,comision:3},
          {cierres:2,ticket:6500000,comision:3},
          {cierres:3,ticket:8500000,comision:3},
          {cierres:5,ticket:7000000,comision:3},
        ].map((s,i) => {
          const ingreso = s.cierres * s.ticket * s.comision / 100
          return (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderRadius:'var(--rs)',background:'var(--bg2)',marginBottom:'8px'}}>
              <div style={{fontSize:'13px',color:'var(--dk)'}}>
                {s.cierres} cierre{s.cierres>1?'s':''} · ticket promedio ${(s.ticket/1e6).toFixed(1)}M · {s.comision}%
              </div>
              <div style={{fontSize:'15px',fontWeight:600,color:'var(--gr)'}}>
                ${ingreso.toLocaleString('es-MX')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
