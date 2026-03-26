'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Lead {
  id: string
  project_id: string
  fuente: string
  nombre_lead: string
  email_lead: string
  whatsapp_lead: string
  tipo_accion: string
  estado: string
  notas: string
  ref_slug: string
  created_at: string
  projects?: { nombre: string; colonia: string; alcaldia: string; comision_pct: number; precio_desde: number }
}

interface Outcome {
  id?: string
  lead_id: string
  project_id: string
  resultado: string
  motivo_perdida?: string
  notas?: string
  valor_cierre?: number
  comision_estimada?: number
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [loading, setLoading] = useState(true)
  const [asesorId, setAsesorId] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [stats, setStats] = useState({ total:0, nuevos:0, enProceso:0, cerrados:0, perdidos:0, comisionTotal:0 })
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
      if (!profile) return
      setAsesorId(profile.id)
      const [{ data: l }, { data: o }] = await Promise.all([
        supabase.from('leads').select('*, projects(nombre, colonia, alcaldia, comision_pct, precio_desde)').eq('asesor_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('asesor_outcomes').select('*').eq('asesor_id', profile.id),
      ])
      const leadList = (l as Lead[]) || []
      const outcomeMap: Record<string, Outcome> = {}
      ;(o || []).forEach(out => { outcomeMap[out.lead_id] = out })
      setLeads(leadList)
      setOutcomes(outcomeMap)
      const comisionTotal = (o || []).filter(x => x.resultado === 'cerrado').reduce((sum, x) => sum + (x.comision_estimada || 0), 0)
      setStats({
        total: leadList.length,
        nuevos: leadList.filter(l => l.estado === 'Nuevo').length,
        enProceso: leadList.filter(l => l.estado === 'En proceso').length,
        cerrados: (o || []).filter(x => x.resultado === 'cerrado').length,
        perdidos: (o || []).filter(x => x.resultado === 'perdido').length,
        comisionTotal,
      })
      setLoading(false)
    }
    load()
  }, [])

  async function updateOutcome(leadId: string, projectId: string, resultado: string, motivo?: string) {
    if (!asesorId) return
    const existing = outcomes[leadId]
    const lead = leads.find(l => l.id === leadId)
    const comision = lead?.projects?.comision_pct && lead?.projects?.precio_desde
      ? Math.round(lead.projects.precio_desde * lead.projects.comision_pct / 100)
      : 0

    if (existing?.id) {
      await supabase.from('asesor_outcomes').update({ resultado, motivo_perdida: motivo || null, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('asesor_outcomes').insert({ asesor_id: asesorId, lead_id: leadId, project_id: projectId, resultado, motivo_perdida: motivo || null, comision_estimada: resultado === 'cerrado' ? comision : 0 })
    }
    setOutcomes(prev => ({ ...prev, [leadId]: { ...prev[leadId], lead_id: leadId, project_id: projectId, resultado, motivo_perdida: motivo } }))
  }

  async function updateLeadEstado(leadId: string, estado: string) {
    await supabase.from('leads').update({ estado }).eq('id', leadId)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado } : l))
  }

  function getEstadoStyle(e: string) {
    if (e === 'Nuevo') return { bg:'var(--bl-bg)', color:'var(--bl)' }
    if (e === 'Contactado') return { bg:'#FEF9C3', color:'#A16207' }
    if (e === 'En proceso') return { bg:'var(--am-bg)', color:'var(--am)' }
    if (e === 'Cerrado') return { bg:'#DCFCE7', color:'#15803D' }
    return { bg:'var(--bg2)', color:'var(--mid)' }
  }

  function getResultadoStyle(r: string) {
    if (r === 'cerrado') return { bg:'#DCFCE7', color:'#15803D' }
    if (r === 'perdido') return { bg:'#FEE2E2', color:'#DC2626' }
    if (r === 'visita_agendada') return { bg:'var(--am-bg)', color:'var(--am)' }
    if (r === 'en_negociacion') return { bg:'var(--bl-bg)', color:'var(--bl)' }
    return { bg:'var(--bg2)', color:'var(--mid)' }
  }

  const filtered = leads.filter(l => filtroEstado === 'all' || l.estado === filtroEstado)

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando leads...</div>

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>Mis leads</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Gestiona y da seguimiento a tus prospectos</div>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'12px',marginBottom:'24px'}}>
        {[
          {l:'Total leads',v:stats.total,c:'var(--dk)'},
          {l:'Nuevos',v:stats.nuevos,c:'var(--bl)'},
          {l:'En proceso',v:stats.enProceso,c:'var(--am)'},
          {l:'Cerrados',v:stats.cerrados,c:'var(--gr)'},
          {l:'Comisiones est.',v:stats.comisionTotal>0?'$'+Math.round(stats.comisionTotal/1000)+'k':'$0',c:'var(--gr)'},
        ].map((s,i) => (
          <div key={i} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px'}}>
            <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.06em'}}>{s.l}</div>
            <div style={{fontSize:'24px',fontWeight:600,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div style={{display:'flex',gap:'6px',marginBottom:'16px'}}>
        {[['all','Todos'],['Nuevo','Nuevos'],['Contactado','Contactados'],['En proceso','En proceso'],['Cerrado','Cerrados']].map(([v,l]) => (
          <button key={v} onClick={() => setFiltroEstado(v)} style={{fontFamily:'var(--sans)',fontSize:'12px',padding:'6px 14px',borderRadius:'var(--rp)',border:filtroEstado===v?'none':'1px solid var(--bd)',background:filtroEstado===v?'var(--dk)':'var(--wh)',color:filtroEstado===v?'#fff':'var(--mid)',cursor:'pointer'}}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'2px dashed var(--bd)',padding:'60px',textAlign:'center'}}>
          <div style={{fontSize:'36px',marginBottom:'14px'}}>🎯</div>
          <div style={{fontSize:'18px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>Sin leads aún</div>
          <div style={{fontSize:'13px',color:'var(--mid)'}}>Los leads aparecerán aquí cuando compartas tu link de referido y los clientes contacten proyectos</div>
        </div>
      ) : (
        <div style={{display:'grid',gap:'8px'}}>
          {filtered.map(lead => {
            const outcome = outcomes[lead.id]
            const estStyle = getEstadoStyle(lead.estado)
            const resStyle = outcome ? getResultadoStyle(outcome.resultado) : null
            const comision = lead.projects?.comision_pct && lead.projects?.precio_desde
              ? Math.round(lead.projects.precio_desde * lead.projects.comision_pct / 100)
              : 0
            const isExpanded = expandedLead === lead.id

            return (
              <div key={lead.id} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',overflow:'hidden'}}>
                <div style={{padding:'14px 16px',display:'flex',gap:'14px',alignItems:'center',cursor:'pointer'}} onClick={() => setExpandedLead(isExpanded ? null : lead.id)}>
                  {/* INFO */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>{lead.nombre_lead || 'Sin nombre'}</span>
                      <span style={{fontSize:'10px',fontWeight:500,padding:'2px 7px',borderRadius:'var(--rp)',...estStyle}}>{lead.estado}</span>
                      {outcome && resStyle && (
                        <span style={{fontSize:'10px',fontWeight:500,padding:'2px 7px',borderRadius:'var(--rp)',...resStyle}}>{outcome.resultado.replace(/_/g,' ')}</span>
                      )}
                    </div>
                    <div style={{fontSize:'11px',color:'var(--mid)'}}>
                      {lead.projects?.nombre} · {new Date(lead.created_at).toLocaleDateString('es-MX')}
                      {lead.whatsapp_lead && ` · 📱 ${lead.whatsapp_lead}`}
                    </div>
                  </div>

                  {/* COMISIÓN */}
                  {comision > 0 && (
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:'14px',fontWeight:600,color:'var(--gr)'}}>+${Math.round(comision/1000)}k</div>
                      <div style={{fontSize:'9px',color:'var(--mid)'}}>comisión est.</div>
                    </div>
                  )}

                  {/* EXPAND */}
                  <div style={{fontSize:'12px',color:'var(--mid)',flexShrink:0}}>{isExpanded ? '▲' : '▼'}</div>
                </div>

                {/* EXPANDED */}
                {isExpanded && (
                  <div style={{padding:'14px 16px',borderTop:'1px solid var(--bd2)',background:'var(--bg2)'}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                      {/* DATOS DEL LEAD */}
                      <div>
                        <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'8px'}}>Datos del prospecto</div>
                        {[
                          {l:'Email',v:lead.email_lead},
                          {l:'WhatsApp',v:lead.whatsapp_lead},
                          {l:'Acción',v:lead.tipo_accion},
                          {l:'Fuente',v:lead.fuente},
                          {l:'Proyecto',v:lead.projects?.nombre},
                        ].filter(x => x.v).map((item,i) => (
                          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:'11px',borderBottom:'1px solid var(--bd2)'}}>
                            <span style={{color:'var(--mid)'}}>{item.l}</span>
                            <span style={{color:'var(--dk)',fontWeight:500}}>{item.v}</span>
                          </div>
                        ))}
                        {lead.whatsapp_lead && (
                          <a href={`https://wa.me/${lead.whatsapp_lead.replace(/[^0-9]/g,'')}?text=Hola ${encodeURIComponent(lead.nombre_lead || '')}, te contacto de DesarrollosMX.`} target="_blank" style={{display:'inline-flex',alignItems:'center',gap:'5px',marginTop:'10px',fontFamily:'var(--sans)',fontSize:'11px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'6px 12px',textDecoration:'none'}}>
                            💬 Contactar por WhatsApp
                          </a>
                        )}
                      </div>

                      {/* GESTIÓN DEL OUTCOME */}
                      <div>
                        <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'8px'}}>Actualizar estado</div>
                        <div style={{display:'grid',gap:'6px'}}>
                          <select
                            value={lead.estado}
                            onChange={e => updateLeadEstado(lead.id, e.target.value)}
                            style={{fontFamily:'var(--sans)',fontSize:'12px',padding:'7px 10px',borderRadius:'var(--rs)',border:'1px solid var(--bd)',background:'var(--wh)',cursor:'pointer',outline:'none'}}
                          >
                            <option>Nuevo</option>
                            <option>Contactado</option>
                            <option>En proceso</option>
                            <option>Cerrado</option>
                          </select>
                          <div style={{fontSize:'11px',color:'var(--mid)',marginTop:'4px'}}>Resultado:</div>
                          <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                            {['contactado','visita_agendada','visita_realizada','en_negociacion','cerrado','perdido'].map(r => (
                              <button key={r} onClick={() => updateOutcome(lead.id, lead.project_id, r)} style={{fontFamily:'var(--sans)',fontSize:'10px',padding:'3px 8px',borderRadius:'var(--rp)',border:'1px solid var(--bd)',background: outcome?.resultado === r ? 'var(--dk)' : 'var(--wh)',color: outcome?.resultado === r ? '#fff' : 'var(--mid)',cursor:'pointer'}}>
                                {r.replace(/_/g,' ')}
                              </button>
                            ))}
                          </div>
                          {outcome?.resultado === 'perdido' && (
                            <select onChange={e => updateOutcome(lead.id, lead.project_id, 'perdido', e.target.value)} value={outcome.motivo_perdida || ''} style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'6px 10px',borderRadius:'var(--rs)',border:'1px solid var(--bd)',background:'var(--wh)',cursor:'pointer',outline:'none',marginTop:'4px'}}>
                              <option value=''>Motivo de pérdida...</option>
                              <option value='precio'>Precio</option>
                              <option value='ubicacion'>Ubicación</option>
                              <option value='plazo'>Plazo de entrega</option>
                              <option value='financiamiento'>Financiamiento</option>
                              <option value='competencia'>Eligió competencia</option>
                              <option value='cambio_planes'>Cambió de planes</option>
                              <option value='sin_respuesta'>Sin respuesta</option>
                              <option value='otro'>Otro</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
