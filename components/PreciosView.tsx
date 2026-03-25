'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Unidad {
  id: string
  unit_id_display: string
  nivel: number
  m2_privados: number
  balcon_m2?: number
  terraza_m2?: number
  rg_m2?: number
  recamaras: number
  banos: number
  cajones: number
  tipo_cajon: string
  bodega: boolean
  precio: number
  estado: string
  orientacion?: string
  ubicacion?: string
  prototipo_id?: string
}

interface Prototipo {
  id: string
  nombre: string
  m2_privados: number
  balcon_m2?: number
  terraza_m2?: number
  rg_m2?: number
  recamaras: number
  banos: number
  cajones: number
  precio_desde: number
  unidades_disponibles: number
}

const CAJ: Record<string, {label: string; cls: string; icon: string; desc: string}> = {
  individual:     {label:'Individual',     cls:'ci', icon:'🟢', desc:'Cajón propio exclusivo. Sales cuando quieras sin mover a nadie ni coordinar con vecinos.'},
  bateria_propia: {label:'Batería propia', cls:'cp', icon:'🟡', desc:'Tándem contigo mismo. Tienes 2 cajones en línea — para sacar el trasero, debes mover primero el delantero.'},
  bateria_vecino: {label:'Batería vecino', cls:'cv', icon:'🔴', desc:'Tu cajón está bloqueado por el de un vecino. Necesitas coordinar con él cada vez que quieras salir.'},
  elevaautos:     {label:'Eleva-autos',    cls:'ce', icon:'🔵', desc:'Sistema mecánico automatizado. Generalmente compartido entre varios usuarios cuando se tiene 1 cajón.'},
}

const CAJCOLORS: Record<string, {bg: string; color: string}> = {
  ci: {bg:'var(--gr-bg)',  color:'var(--gr)'},
  cp: {bg:'var(--am-bg)',  color:'var(--am)'},
  cv: {bg:'var(--rd-bg)',  color:'var(--rd)'},
  ce: {bg:'var(--bl-bg)',  color:'var(--bl)'},
}

const ESTADOCOLORS: Record<string, {bg: string; color: string}> = {
  disponible: {bg:'#DCFCE7', color:'#15803D'},
  reservado:  {bg:'#FEF9C3', color:'#A16207'},
  vendido:    {bg:'#FEE2E2', color:'#DC2626'},
}

const FLOOR_COLORS: Record<string, string> = {
  disponible: '#4CAF7D',
  reservado:  '#FFD93D',
  vendido:    '#EF4444',
}

export default function PreciosView({ projectId }: { projectId: string }) {
  const [subTab, setSubTab] = useState('general')
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [prototipos, setPrototipos] = useState<Prototipo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroE, setFiltroE] = useState('all')
  const [filtroR, setFiltroR] = useState('all')
  const [filtroB, setFiltroB] = useState('all')
  const [filtroC, setFiltroC] = useState('all')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [selectedProto, setSelectedProto] = useState<string | null>(null)
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<Unidad | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: u }, { data: p }] = await Promise.all([
        supabase.from('unidades').select('*').eq('project_id', projectId).order('nivel').order('unit_id_display'),
        supabase.from('prototipos').select('*').eq('project_id', projectId).order('nombre'),
      ])
      setUnidades((u as Unidad[]) || [])
      setPrototipos((p as Prototipo[]) || [])
      if (p && p.length > 0) setSelectedProto(p[0].nombre)
      setLoading(false)
    }
    load()
  }, [projectId])

  // FILTROS
  const filtered = unidades.filter(u => {
    if (filtroE !== 'all' && u.estado !== filtroE) return false
    if (filtroR !== 'all') {
      if (filtroR === '3+' && u.recamaras < 3) return false
      if (filtroR !== '3+' && u.recamaras !== +filtroR) return false
    }
    if (filtroB !== 'all') {
      if (filtroB === '3+' && u.banos < 3) return false
      if (filtroB !== '3+' && u.banos !== +filtroB) return false
    }
    if (filtroC !== 'all') {
      if (filtroC === '3+' && u.cajones < 3) return false
      if (filtroC !== '3+' && u.cajones !== +filtroC) return false
    }
    return true
  })

  const filteredByProto = selectedProto
    ? unidades.filter(u => {
        const proto = prototipos.find(p => p.id === u.prototipo_id)
        return proto?.nombre === selectedProto
      })
    : unidades

  const counts = {
    d: unidades.filter(u => u.estado === 'disponible').length,
    r: unidades.filter(u => u.estado === 'reservado').length,
    v: unidades.filter(u => u.estado === 'vendido').length,
  }

  // NIVELES para vista de planta
  const niveles = [...new Set(unidades.map(u => u.nivel))].sort((a, b) => a - b)
  const nivelesStr = niveles.map(n => n === 99 ? 'PH' : String(n))

  const fStyle = (active: boolean) => ({
    fontFamily:'var(--sans)',fontSize:'11px',padding:'4px 10px',
    borderRadius:'var(--rp)',border: active ? 'none' : '1px solid var(--bd)',
    background: active ? 'var(--dk)' : 'var(--bg)',
    cursor:'pointer',color: active ? '#fff' : 'var(--mid)',
    transition:'all .15s',whiteSpace:'nowrap' as const
  })

  const lpTabStyle = (id: string) => ({
    fontSize:'13px',padding:'10px 0',marginRight:'22px',
    color: subTab === id ? 'var(--dk)' : 'var(--mid)',
    borderTop:'none',borderLeft:'none',borderRight:'none',
    borderBottomWidth:'2px',borderBottomStyle:'solid' as const,
    borderBottomColor: subTab === id ? 'var(--dk)' : 'transparent',
    marginBottom:'-1px',cursor:'pointer',
    fontWeight: subTab === id ? 500 : 400,
    background:'transparent',fontFamily:'var(--sans)',
    whiteSpace:'nowrap' as const
  })

  if (loading) return <div style={{padding:'40px',color:'var(--mid)',fontSize:'13px'}}>Cargando inventario...</div>

  return (
    <div>
      {/* SUB-TABS */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--bd)',marginBottom:'22px'}}>
        <button style={lpTabStyle('general')} onClick={() => setSubTab('general')}>Inventario completo</button>
        <button style={lpTabStyle('proto')} onClick={() => setSubTab('proto')}>Por prototipo</button>
        <button style={lpTabStyle('planta')} onClick={() => setSubTab('planta')}>
          Vista de planta{' '}
          <span style={{fontSize:'9px',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase' as const,background:'var(--am-bg)',color:'var(--am)',border:'1px solid #FCD34D',padding:'1px 5px',borderRadius:'3px',marginLeft:'4px'}}>NUEVO</span>
        </button>
      </div>

      {/* ═══ SUB-TAB: INVENTARIO COMPLETO ═══ */}
      {subTab === 'general' && (
        <div>
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>
              {prototipos[0] ? `${prototipos[0].nombre ? 'ARQ Living' : ''} — ${unidades.length} unidades totales` : `${unidades.length} unidades totales`}
            </div>
            <div style={{fontSize:'12px',color:'var(--mid)'}}>Haz clic en "+ Info" para ver detalle de cada unidad</div>
          </div>

          {/* FILTROS */}
          <div style={{display:'flex',gap:'5px',flexWrap:'wrap',marginBottom:'14px',alignItems:'center',padding:'12px 14px',background:'var(--wh)',border:'1px solid var(--bd)',borderRadius:'var(--r)'}}>
            <span style={{fontSize:'11px',color:'var(--mid)',fontWeight:500,whiteSpace:'nowrap',alignSelf:'center'}}>Estado</span>
            {[['all','Todos'],['disponible','Disponible'],['reservado','Reservado'],['vendido','Vendido']].map(([v,l]) => (
              <button key={v} style={fStyle(filtroE===v)} onClick={() => setFiltroE(v)}>{l}</button>
            ))}
            <div style={{width:'1px',height:'16px',background:'var(--bd)',margin:'0 3px',flexShrink:0}} />
            <span style={{fontSize:'11px',color:'var(--mid)',fontWeight:500,whiteSpace:'nowrap',alignSelf:'center'}}>Rec.</span>
            {[['all','Todos'],['1','1'],['2','2'],['3+','3+']].map(([v,l]) => (
              <button key={v} style={fStyle(filtroR===v)} onClick={() => setFiltroR(v)}>{l}</button>
            ))}
            <div style={{width:'1px',height:'16px',background:'var(--bd)',margin:'0 3px',flexShrink:0}} />
            <span style={{fontSize:'11px',color:'var(--mid)',fontWeight:500,whiteSpace:'nowrap',alignSelf:'center'}}>Baños</span>
            {[['all','Todos'],['1','1'],['2','2'],['3+','3+']].map(([v,l]) => (
              <button key={v} style={fStyle(filtroB===v)} onClick={() => setFiltroB(v)}>{l}</button>
            ))}
            <div style={{width:'1px',height:'16px',background:'var(--bd)',margin:'0 3px',flexShrink:0}} />
            <span style={{fontSize:'11px',color:'var(--mid)',fontWeight:500,whiteSpace:'nowrap',alignSelf:'center'}}>Cajones</span>
            {[['all','Todos'],['1','1'],['2','2'],['3+','3+']].map(([v,l]) => (
              <button key={v} style={fStyle(filtroC===v)} onClick={() => setFiltroC(v)}>{l}</button>
            ))}
          </div>

          {/* TABLA */}
          <div style={{overflowX:'auto',borderRadius:'var(--r)',border:'1px solid var(--bd)',marginBottom:'8px'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',whiteSpace:'nowrap'}}>
              <thead>
                <tr>
                  {[
                    {label:'Unidad',cols:3,bg:'#2C3E42',color:'rgba(255,255,255,.5)'},
                    {label:'M² desglosados',cols:5,bg:'#1B3A30',color:'rgba(255,255,255,.65)',bl:true},
                    {label:'Características',cols:3,bg:'#1C2E50',color:'rgba(255,255,255,.65)',bl:true},
                    {label:'Adicionales',cols:3,bg:'#3A2A10',color:'rgba(255,255,255,.65)',bl:true},
                    {label:'Precio',cols:2,bg:'#1A3020',color:'rgba(255,255,255,.65)',bl:true},
                    {label:'',cols:1,bg:'#2C3E42',color:'rgba(255,255,255,.3)'},
                  ].map((g,i) => (
                    <th key={i} colSpan={g.cols} style={{
                      padding:'5px 10px 4px',fontSize:'9px',fontWeight:700,
                      letterSpacing:'.07em',textTransform:'uppercase',
                      borderBottom:'1px solid rgba(255,255,255,.15)',
                      background:g.bg,color:g.color,
                      borderLeft: g.bl ? '1px solid rgba(255,255,255,.12)' : undefined,
                      textAlign:'left'
                    }}>{g.label}</th>
                  ))}
                </tr>
                <tr style={{background:'var(--bg2)'}}>
                  {[
                    {l:'ID'},{l:'Proto.'},{l:'Nivel'},
                    {l:'M² Priv.',bl:true},{l:'Balcón'},{l:'Terraza'},{l:'RG Priv.'},{l:'M² Tot.'},
                    {l:'Rec.',bl:true},{l:'Baños'},{l:'Cajones'},
                    {l:'Tipo cajón',bl:true},{l:'Bodega'},{l:'Ubicación'},
                    {l:'Precio',bl:true},{l:'Estado'},
                    {l:''},
                  ].map((h,i) => (
                    <th key={i} style={{
                      padding:'7px 10px',textAlign:'left',fontSize:'10px',
                      fontWeight:600,color:'var(--mid)',letterSpacing:'.04em',
                      textTransform:'uppercase',borderBottom:'1px solid var(--bd)',
                      borderLeft: h.bl ? '1px solid var(--bd)' : undefined
                    }}>{h.l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => {
                  const proto = prototipos.find(p => p.id === u.prototipo_id)
                  const caj = CAJ[u.tipo_cajon] || CAJ['individual']
                  const cajColor = CAJCOLORS[caj.cls]
                  const estColor = ESTADOCOLORS[u.estado] || ESTADOCOLORS['disponible']
                  const m2tot = (u.m2_privados||0) + (u.balcon_m2||0) + (u.terraza_m2||0) + (u.rg_m2||0)
                  const isExpanded = expandedRow === u.id

                  return (
                    <>
                      <tr
                        key={u.id}
                        className="dr"
                        style={{background: idx%2===0 ? 'transparent' : 'rgba(33,45,48,.028)',cursor:'pointer'}}
                        onMouseEnter={e => (e.currentTarget.style.background='rgba(33,45,48,.055)')}
                        onMouseLeave={e => (e.currentTarget.style.background= idx%2===0 ? 'transparent' : 'rgba(33,45,48,.028)')}
                      >
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{fontWeight:600,fontSize:'12px'}}>{u.unit_id_display}</span></td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{fontSize:'10px',background:'var(--bg2)',color:'var(--mid)',padding:'2px 7px',borderRadius:'4px',fontWeight:500}}>{proto?.nombre||'—'}</span></td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',fontSize:'12px',color:'var(--mid)'}}>{u.nivel === 99 ? 'PH' : u.nivel}</td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',borderLeft:'1px solid var(--bd2)'}}>
                          <span style={{fontSize:'13px',fontWeight:500}}>{u.m2_privados}</span>
                          <span style={{fontSize:'10px',color:'var(--dim)',display:'block'}}>m²</span>
                        </td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>{u.balcon_m2 ? <span style={{fontSize:'12px',fontWeight:500,color:'var(--gr)'}}>{u.balcon_m2} m²</span> : <span style={{fontSize:'11px',color:'var(--dim)'}}>—</span>}</td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>{u.terraza_m2 ? <span style={{fontSize:'12px',fontWeight:500,color:'var(--gr)'}}>{u.terraza_m2} m²</span> : <span style={{fontSize:'11px',color:'var(--dim)'}}>—</span>}</td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>{u.rg_m2 ? <span style={{fontSize:'12px',fontWeight:500,color:'var(--gr)'}}>{u.rg_m2} m²</span> : <span style={{fontSize:'11px',color:'var(--dim)'}}>—</span>}</td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{fontSize:'13px',fontWeight:500}}>{m2tot} m²</span></td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',borderLeft:'1px solid var(--bd2)',fontSize:'12px'}}>{u.recamaras}</td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>{u.banos}</td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>{u.cajones}</td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',borderLeft:'1px solid var(--bd2)'}}>
                          <span style={{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'var(--rp)',whiteSpace:'nowrap',...cajColor}}>
                            ● {caj.label}
                          </span>
                        </td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>{u.bodega ? <span style={{fontSize:'11px',color:'var(--gr)',fontWeight:500}}>Incluida</span> : <span style={{fontSize:'11px',color:'var(--dim)'}}>No</span>}</td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{fontSize:'11px',fontWeight:500,color: u.ubicacion==='Exterior' ? 'var(--bl)' : 'var(--mid)'}}>{u.ubicacion||'—'}</span></td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',borderLeft:'1px solid var(--bd2)'}}><span style={{fontSize:'13px',fontWeight:500,color:'var(--gr)'}}>${u.precio.toLocaleString('es-MX')}</span></td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>
                          <span style={{display:'inline-block',fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',...estColor}}>
                            {u.estado.charAt(0).toUpperCase()+u.estado.slice(1)}
                          </span>
                        </td>
                        <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : u.id)}
                            style={{
                              fontFamily:'var(--sans)',fontSize:'11px',background: isExpanded ? 'var(--dk)' : 'transparent',
                              border:'1px solid var(--bd)',borderRadius:'var(--rp)',
                              color: isExpanded ? '#fff' : 'var(--mid)',padding:'4px 10px',cursor:'pointer',
                              transition:'all .15s'
                            }}
                          >{isExpanded ? '– Info' : '+ Info'}</button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`exp-${u.id}`}>
                          <td colSpan={16} style={{background:'rgba(27,67,50,.03)',padding:'16px 18px'}}>
                            <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'12px'}}>
                              {[
                                {l:'M² Totales',v:`${m2tot} m²`,gr:true},
                                {l:'M² Privados',v:`${u.m2_privados} m²`,gr:false},
                                u.balcon_m2 ? {l:'Balcón',v:`${u.balcon_m2} m²`,gr:true} : null,
                                u.terraza_m2 ? {l:'Terraza',v:`${u.terraza_m2} m²`,gr:true} : null,
                                {l:'Recámaras',v:u.recamaras,gr:false},
                                {l:'Baños',v:u.banos,gr:false},
                                {l:'Cajones',v:u.cajones,gr:false},
                                {l:'Bodega',v:u.bodega?'Incluida':'No incluida',gr:u.bodega},
                              ].filter(Boolean).map((item,i) => (
                                <div key={i} style={{background:'var(--wh)',border:'1px solid var(--bd)',borderRadius:'var(--rs)',padding:'10px 14px',minWidth:'120px'}}>
                                  <div style={{fontSize:'10px',fontWeight:600,color:'var(--mid)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'3px'}}>{item!.l}</div>
                                  <div style={{fontSize:'14px',fontWeight:500,color: item!.gr ? 'var(--gr)' : 'var(--dk)'}}>{String(item!.v)}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{background:'var(--wh)',border:'1px solid var(--bd)',borderRadius:'var(--rs)',padding:'10px 14px',display:'flex',alignItems:'flex-start',gap:'10px',marginTop:'8px'}}>
                              <div style={{fontSize:'20px',flexShrink:0,lineHeight:1}}>{caj.icon}</div>
                              <div>
                                <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>Estacionamiento: {caj.label}</div>
                                <div style={{fontSize:'11px',color:'var(--mid)',lineHeight:1.6}}>{caj.desc}</div>
                              </div>
                            </div>
                            {u.estado !== 'vendido' && (
                              <button
                                onClick={() => alert(`Solicitar unidad ${u.unit_id_display}`)}
                                style={{marginTop:'12px',fontFamily:'var(--sans)',fontSize:'12px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px 18px',cursor:'pointer'}}
                              >Solicitar esta unidad</button>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* SUMMARY */}
          <div style={{display:'flex',gap:'14px',fontSize:'12px',color:'var(--mid)',flexWrap:'wrap',alignItems:'center',marginBottom:'6px'}}>
            <span><strong style={{color:'var(--dk)'}}>{counts.d}</strong> disponibles</span>
            <span><strong style={{color:'var(--dk)'}}>{counts.r}</strong> reservados</span>
            <span><strong style={{color:'var(--dk)'}}>{counts.v}</strong> vendidos</span>
            <span style={{marginLeft:'auto',fontSize:'11px',color:'var(--dim)'}}>{unidades.length} unidades totales</span>
          </div>

          {/* LEYENDA */}
          <div style={{display:'flex',gap:'16px',flexWrap:'wrap',padding:'12px 16px',background:'var(--wh)',border:'1px solid var(--bd)',borderRadius:'var(--r)',marginTop:'14px'}}>
            <span style={{fontSize:'11px',fontWeight:500,color:'var(--mid)',alignSelf:'center',whiteSpace:'nowrap'}}>Tipos de cajón:</span>
            {Object.entries(CAJ).map(([key, caj]) => (
              <div key={key} style={{display:'flex',alignItems:'flex-start',gap:'6px',fontSize:'11px',flexDirection:'column'}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'var(--rp)',marginBottom:'2px',...CAJCOLORS[caj.cls]}}>● {caj.label}</span>
                <span style={{fontSize:'10px',color:'var(--mid)',lineHeight:1.4,maxWidth:'180px'}}>{caj.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SUB-TAB: POR PROTOTIPO ═══ */}
      {subTab === 'proto' && (
        <div>
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>Explorar por prototipo</div>
            <div style={{fontSize:'12px',color:'var(--mid)'}}>Selecciona un tipo para ver su plano y unidades disponibles</div>
          </div>

          {/* GRID PROTOTIPOS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'22px'}}>
            {prototipos.map(proto => {
              const dispCount = unidades.filter(u => {
                const p = prototipos.find(x => x.id === u.prototipo_id)
                return p?.nombre === proto.nombre && u.estado === 'disponible'
              }).length
              const isSelected = selectedProto === proto.nombre

              return (
                <div
                  key={proto.id}
                  onClick={() => setSelectedProto(proto.nombre)}
                  style={{
                    borderRadius:'var(--r)',border: isSelected ? '1.5px solid var(--dk)' : '1.5px solid var(--bd)',
                    background:'var(--wh)',padding:'12px',cursor:'pointer',
                    transition:'all .15s',position:'relative',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor='rgba(33,45,48,.3)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor='var(--bd)' }}
                >
                  {isSelected && (
                    <span style={{position:'absolute',top:'8px',right:'10px',fontSize:'12px',color:'var(--dk)',fontWeight:600}}>✓</span>
                  )}
                  {/* PLANO SVG */}
                  <div style={{height:'88px',background:'var(--bg2)',borderRadius:'5px',marginBottom:'9px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {proto.nombre === 'A' && (
                      <svg viewBox="0 0 140 88" width="100%" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="132" height="80" rx="2" fill="none" stroke="#212D30" strokeWidth="1.5"/>
                        <rect x="4" y="4" width="72" height="50" fill="rgba(27,67,50,.08)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="40" y="32" textAnchor="middle" fontSize="8" fill="#212D30" fontFamily="DM Sans,sans-serif">Sala/Comedor</text>
                        <rect x="76" y="4" width="60" height="50" fill="rgba(33,45,48,.05)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="106" y="32" textAnchor="middle" fontSize="8" fill="#555" fontFamily="DM Sans,sans-serif">Recámara</text>
                        <rect x="4" y="54" width="56" height="30" fill="rgba(33,45,48,.04)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="32" y="72" textAnchor="middle" fontSize="7" fill="#888" fontFamily="DM Sans,sans-serif">Cocina</text>
                        <rect x="60" y="54" width="76" height="30" fill="rgba(33,45,48,.03)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="98" y="72" textAnchor="middle" fontSize="7" fill="#888" fontFamily="DM Sans,sans-serif">Baño / Closet</text>
                      </svg>
                    )}
                    {proto.nombre === 'B' && (
                      <svg viewBox="0 0 140 88" width="100%" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="132" height="80" rx="2" fill="none" stroke="#212D30" strokeWidth="1.5"/>
                        <rect x="4" y="4" width="60" height="45" fill="rgba(27,67,50,.08)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="34" y="30" textAnchor="middle" fontSize="7" fill="#212D30" fontFamily="DM Sans,sans-serif">Sala/Comedor</text>
                        <rect x="64" y="4" width="72" height="40" fill="rgba(33,45,48,.05)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="100" y="27" textAnchor="middle" fontSize="7" fill="#555" fontFamily="DM Sans,sans-serif">Recámara 1</text>
                        <rect x="64" y="44" width="72" height="40" fill="rgba(33,45,48,.04)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="100" y="67" textAnchor="middle" fontSize="7" fill="#555" fontFamily="DM Sans,sans-serif">Recámara 2</text>
                        <rect x="4" y="49" width="60" height="35" fill="rgba(33,45,48,.03)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="34" y="70" textAnchor="middle" fontSize="7" fill="#888" fontFamily="DM Sans,sans-serif">Cocina / Baños</text>
                      </svg>
                    )}
                    {proto.nombre === 'C' && (
                      <svg viewBox="0 0 140 88" width="100%" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="132" height="80" rx="2" fill="none" stroke="#212D30" strokeWidth="1.5"/>
                        <rect x="4" y="4" width="55" height="40" fill="rgba(27,67,50,.08)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="31" y="27" textAnchor="middle" fontSize="7" fill="#212D30" fontFamily="DM Sans,sans-serif">Sala</text>
                        <rect x="59" y="4" width="77" height="35" fill="rgba(33,45,48,.05)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="97" y="25" textAnchor="middle" fontSize="7" fill="#555" fontFamily="DM Sans,sans-serif">Rec. Principal</text>
                        <rect x="4" y="44" width="55" height="40" fill="rgba(33,45,48,.04)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="31" y="67" textAnchor="middle" fontSize="7" fill="#888" fontFamily="DM Sans,sans-serif">Cocina/Comedor</text>
                        <rect x="59" y="39" width="37" height="45" fill="rgba(33,45,48,.03)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="77" y="65" textAnchor="middle" fontSize="7" fill="#888" fontFamily="DM Sans,sans-serif">Rec. 2</text>
                        <rect x="96" y="39" width="40" height="45" fill="rgba(33,45,48,.03)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="116" y="65" textAnchor="middle" fontSize="7" fill="#888" fontFamily="DM Sans,sans-serif">Rec. 3</text>
                      </svg>
                    )}
                    {proto.nombre === 'PH' && (
                      <svg viewBox="0 0 140 88" width="100%" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="132" height="80" rx="2" fill="none" stroke="#212D30" strokeWidth="1.5"/>
                        <rect x="4" y="4" width="80" height="45" fill="rgba(27,67,50,.1)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="42" y="30" textAnchor="middle" fontSize="8" fill="#212D30" fontFamily="DM Sans,sans-serif">Terraza/Sala</text>
                        <rect x="84" y="4" width="52" height="40" fill="rgba(33,45,48,.06)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="110" y="27" textAnchor="middle" fontSize="7" fill="#555" fontFamily="DM Sans,sans-serif">Rec. Principal</text>
                        <rect x="4" y="49" width="40" height="35" fill="rgba(33,45,48,.04)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="24" y="70" textAnchor="middle" fontSize="6" fill="#888" fontFamily="DM Sans,sans-serif">Rec. 2</text>
                        <rect x="44" y="49" width="40" height="35" fill="rgba(33,45,48,.04)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="64" y="70" textAnchor="middle" fontSize="6" fill="#888" fontFamily="DM Sans,sans-serif">Rec. 3</text>
                        <rect x="84" y="44" width="52" height="40" fill="rgba(33,45,48,.03)" stroke="#212D30" strokeWidth=".8"/>
                        <text x="110" y="67" textAnchor="middle" fontSize="7" fill="#888" fontFamily="DM Sans,sans-serif">Baños/Cocina</text>
                      </svg>
                    )}
                    {!['A','B','C','PH'].includes(proto.nombre) && (
                      <span style={{fontSize:'24px',opacity:.2}}>📐</span>
                    )}
                  </div>
                  <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>Prototipo {proto.nombre}</div>
                  <div style={{fontSize:'10px',color:'var(--mid)',marginBottom:'4px',lineHeight:1.5}}>
                    {proto.recamaras} rec. · {proto.banos} baño{proto.banos>1?'s':''} · {proto.cajones} cajón<br/>
                    {proto.m2_privados} m² priv.{proto.balcon_m2 ? ` · balcón ${proto.balcon_m2} m²` : ''}
                  </div>
                  <div style={{fontSize:'11px',fontWeight:500,color:'var(--gr)'}}>
                    Desde ${proto.precio_desde?.toLocaleString('es-MX')}
                  </div>
                  {proto.balcon_m2 && (
                    <div style={{display:'flex',gap:'4px',marginTop:'5px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'9px',fontWeight:600,padding:'1px 5px',borderRadius:'3px',background:'var(--gr-bg)',color:'var(--gr)'}}>Balcón {proto.balcon_m2}m²</span>
                    </div>
                  )}
                  <div style={{fontSize:'10px',color:'var(--mid)',marginTop:'2px'}}>
                    {dispCount} unidad{dispCount!==1?'es':''} disponible{dispCount!==1?'s':''}
                  </div>
                </div>
              )
            })}
          </div>

          {/* TABLA FILTRADA POR PROTOTIPO */}
          {selectedProto && (
            <div>
              <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>
                Unidades — Prototipo {selectedProto}
              </div>
              <div style={{overflowX:'auto',borderRadius:'var(--r)',border:'1px solid var(--bd)'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',whiteSpace:'nowrap'}}>
                  <thead>
                    <tr>
                      {[
                        {label:'Unidad',cols:3,bg:'#2C3E42',color:'rgba(255,255,255,.5)'},
                        {label:'M² desglosados',cols:5,bg:'#1B3A30',color:'rgba(255,255,255,.65)',bl:true},
                        {label:'Características',cols:3,bg:'#1C2E50',color:'rgba(255,255,255,.65)',bl:true},
                        {label:'Adicionales',cols:3,bg:'#3A2A10',color:'rgba(255,255,255,.65)',bl:true},
                        {label:'Precio',cols:2,bg:'#1A3020',color:'rgba(255,255,255,.65)',bl:true},
                        {label:'',cols:1,bg:'#2C3E42',color:'rgba(255,255,255,.3)'},
                      ].map((g,i) => (
                        <th key={i} colSpan={g.cols} style={{padding:'5px 10px 4px',fontSize:'9px',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,.15)',background:g.bg,color:g.color,borderLeft:g.bl?'1px solid rgba(255,255,255,.12)':undefined,textAlign:'left'}}>{g.label}</th>
                      ))}
                    </tr>
                    <tr style={{background:'var(--bg2)'}}>
                      {[
                        {l:'ID'},{l:'Proto.'},{l:'Nivel'},
                        {l:'M² Priv.',bl:true},{l:'Balcón'},{l:'Terraza'},{l:'RG Priv.'},{l:'M² Tot.'},
                        {l:'Rec.',bl:true},{l:'Baños'},{l:'Cajones'},
                        {l:'Tipo cajón',bl:true},{l:'Bodega'},{l:'Ubicación'},
                        {l:'Precio',bl:true},{l:'Estado'},
                        {l:''},
                      ].map((h,i) => (
                        <th key={i} style={{padding:'7px 10px',textAlign:'left',fontSize:'10px',fontWeight:600,color:'var(--mid)',letterSpacing:'.04em',textTransform:'uppercase',borderBottom:'1px solid var(--bd)',borderLeft:h.bl?'1px solid var(--bd)':undefined}}>{h.l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredByProto.map((u,idx) => {
                      const proto2 = prototipos.find(p => p.id === u.prototipo_id)
                      const caj = CAJ[u.tipo_cajon] || CAJ['individual']
                      const cajColor = CAJCOLORS[caj.cls]
                      const estColor = ESTADOCOLORS[u.estado] || ESTADOCOLORS['disponible']
                      const m2tot = (u.m2_privados||0)+(u.balcon_m2||0)+(u.terraza_m2||0)+(u.rg_m2||0)
                      const isExpanded2 = expandedRow === u.id+'_p'
                      return (
                        <>
                        <tr key={u.id} style={{background:idx%2===0?'transparent':'rgba(33,45,48,.028)',cursor:'pointer'}}
                          onMouseEnter={e=>(e.currentTarget.style.background='rgba(33,45,48,.055)')}
                          onMouseLeave={e=>(e.currentTarget.style.background=idx%2===0?'transparent':'rgba(33,45,48,.028)')}>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{fontWeight:600,fontSize:'12px'}}>{u.unit_id_display}</span></td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{fontSize:'10px',background:'var(--bg2)',color:'var(--mid)',padding:'2px 7px',borderRadius:'4px',fontWeight:500}}>{proto2?.nombre||'—'}</span></td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',fontSize:'12px',color:'var(--mid)'}}>{u.nivel===99?'PH':u.nivel}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',borderLeft:'1px solid var(--bd2)'}}><span style={{fontSize:'13px',fontWeight:500}}>{u.m2_privados}</span><span style={{fontSize:'10px',color:'var(--dim)',display:'block'}}>m²</span></td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>{u.balcon_m2?<span style={{fontSize:'12px',fontWeight:500,color:'var(--gr)'}}>{u.balcon_m2} m²</span>:<span style={{fontSize:'11px',color:'var(--dim)'}}>—</span>}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>{u.terraza_m2?<span style={{fontSize:'12px',fontWeight:500,color:'var(--gr)'}}>{u.terraza_m2} m²</span>:<span style={{fontSize:'11px',color:'var(--dim)'}}>—</span>}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>{u.rg_m2?<span style={{fontSize:'12px',fontWeight:500,color:'var(--gr)'}}>{u.rg_m2} m²</span>:<span style={{fontSize:'11px',color:'var(--dim)'}}>—</span>}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{fontSize:'13px',fontWeight:500}}>{m2tot} m²</span></td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',borderLeft:'1px solid var(--bd2)',fontSize:'12px'}}>{u.recamaras}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>{u.banos}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',fontSize:'12px'}}>{u.cajones}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',borderLeft:'1px solid var(--bd2)'}}><span style={{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'10px',fontWeight:600,padding:'2px 8px',borderRadius:'var(--rp)',whiteSpace:'nowrap',...cajColor}}>● {caj.label}</span></td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}>{u.bodega?<span style={{fontSize:'11px',color:'var(--gr)',fontWeight:500}}>Incluida</span>:<span style={{fontSize:'11px',color:'var(--dim)'}}>No</span>}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{fontSize:'11px',fontWeight:500,color:u.ubicacion==='Exterior'?'var(--bl)':'var(--mid)'}}>{u.ubicacion||'—'}</span></td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)',borderLeft:'1px solid var(--bd2)'}}><span style={{fontSize:'13px',fontWeight:500,color:'var(--gr)'}}>${u.precio.toLocaleString('es-MX')}</span></td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><span style={{display:'inline-block',fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',...estColor}}>{u.estado.charAt(0).toUpperCase()+u.estado.slice(1)}</span></td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--bd2)'}}><button onClick={()=>setExpandedRow(isExpanded2?null:u.id+'_p')} style={{fontFamily:'var(--sans)',fontSize:'11px',background:isExpanded2?'var(--dk)':'transparent',border:'1px solid var(--bd)',borderRadius:'var(--rp)',color:isExpanded2?'#fff':'var(--mid)',padding:'4px 10px',cursor:'pointer'}}>{isExpanded2?'– Info':'+ Info'}</button></td>
                        </tr>
                        {isExpanded2 && (
                          <tr key={'exp2-'+u.id}>
                            <td colSpan={17} style={{background:'rgba(27,67,50,.03)',padding:'16px 18px'}}>
                              <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'12px'}}>
                                {[
                                  {l:'M² Totales',v:m2tot+' m²',gr:true},
                                  {l:'M² Privados',v:u.m2_privados+' m²',gr:false},
                                  u.balcon_m2?{l:'Balcón',v:u.balcon_m2+' m²',gr:true}:null,
                                  u.terraza_m2?{l:'Terraza',v:u.terraza_m2+' m²',gr:true}:null,
                                  {l:'Recámaras',v:u.recamaras,gr:false},
                                  {l:'Baños',v:u.banos,gr:false},
                                  {l:'Cajones',v:u.cajones,gr:false},
                                  {l:'Bodega',v:u.bodega?'Incluida':'No incluida',gr:u.bodega},
                                  {l:'Ubicación',v:u.ubicacion||'—',gr:false},
                                ].filter(Boolean).map((item,i)=>(
                                  <div key={i} style={{background:'var(--wh)',border:'1px solid var(--bd)',borderRadius:'var(--rs)',padding:'10px 14px',minWidth:'120px'}}>
                                    <div style={{fontSize:'10px',fontWeight:600,color:'var(--mid)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'3px'}}>{item.l}</div>
                                    <div style={{fontSize:'14px',fontWeight:500,color:item.gr?'var(--gr)':'var(--dk)'}}>{String(item.v)}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{background:'var(--wh)',border:'1px solid var(--bd)',borderRadius:'var(--rs)',padding:'10px 14px',display:'flex',alignItems:'flex-start',gap:'10px',marginTop:'8px'}}>
                                <div style={{fontSize:'20px',flexShrink:0,lineHeight:1}}>{caj.icon}</div>
                                <div>
                                  <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>Estacionamiento: {caj.label}</div>
                                  <div style={{fontSize:'11px',color:'var(--mid)',lineHeight:1.6}}>{caj.desc}</div>
                                </div>
                              </div>
                              {u.estado !== 'vendido' && <button onClick={()=>alert('Solicitar unidad '+u.unit_id_display)} style={{marginTop:'12px',fontFamily:'var(--sans)',fontSize:'12px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px 18px',cursor:'pointer'}}>Solicitar esta unidad</button>}
                            </td>
                          </tr>
                        )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SUB-TAB: VISTA DE PLANTA ═══ */}
      {subTab === 'planta' && (
        <div>
          <div style={{overflowX:'auto',background:'var(--bg2)',borderRadius:'var(--r)',padding:'20px'}}>
            <div style={{display:'flex',gap:0,alignItems:'stretch',minWidth:'max-content'}}>
              {niveles.map((niv, ni) => {
                const unidadesNivel = unidades.filter(u => u.nivel === niv)
                const nivLabel = niv === 99 ? 'PH' : `Nivel ${niv}`
                return (
                  <div key={niv} style={{display:'flex',flexDirection:'column',alignItems:'center',borderRight: ni < niveles.length-1 ? '1px solid var(--bd)' : 'none',padding:'0 14px',minWidth:'130px'}}>
                    <div style={{fontSize:'10px',fontWeight:600,color:'var(--mid)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'10px',textAlign:'center',whiteSpace:'nowrap'}}>{nivLabel}</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'5px',width:'100%'}}>
                      {unidadesNivel.map(u => {
                        const isSelected = selectedUnit?.id === u.id
                        const proto = prototipos.find(p => p.id === u.prototipo_id)
                        const m2tot = (u.m2_privados||0)+(u.balcon_m2||0)+(u.terraza_m2||0)+(u.rg_m2||0)
                        return (
                          <div
                            key={u.id}
                            onClick={() => { setSelectedUnit(u); setSelectedFloor(String(niv)) }}
                            style={{
                              display:'flex',flexDirection:'column',alignItems:'center',
                              justifyContent:'center',borderRadius:'6px',padding:'7px 8px',
                              cursor:'pointer',transition:'all .15s',minHeight:'58px',
                              width:'100%',textAlign:'center',
                              background: FLOOR_COLORS[u.estado] || FLOOR_COLORS['disponible'],
                              border: isSelected ? '1.5px solid rgba(255,255,255,.8)' : '1.5px solid transparent',
                              boxShadow: isSelected ? '0 0 0 3px rgba(255,255,255,.4)' : 'none',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.03)'; e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.15)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow= isSelected ? '0 0 0 3px rgba(255,255,255,.4)' : 'none' }}
                          >
                            <span style={{fontSize:'11px',fontWeight:500,color: u.estado==='reservado' ? '#1a1a1a' : '#fff',lineHeight:1}}>{u.unit_id_display}</span>
                            <span style={{fontSize:'9px',color: u.estado==='reservado' ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.82)',marginTop:'2px'}}>{proto?.nombre||'—'} · {m2tot}m²</span>
                            <span style={{fontSize:'9px',color: u.estado==='reservado' ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.65)',marginTop:'1px'}}>${(u.precio/1e6).toFixed(1)}M</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* LEYENDA PLANTA */}
          <div style={{display:'flex',gap:'14px',fontSize:'11px',color:'var(--mid)',marginTop:'12px'}}>
            {[['#4CAF7D','Disponible'],['#FFD93D','Reservado'],['#EF4444','Vendido']].map(([bg,label]) => (
              <div key={label} style={{display:'flex',alignItems:'center',gap:'5px'}}>
                <div style={{width:'12px',height:'12px',borderRadius:'3px',background:bg}} />
                {label}
              </div>
            ))}
          </div>

          {/* DETALLE UNIDAD SELECCIONADA */}
          {selectedUnit && (
            <div style={{background:'var(--wh)',border:'1px solid var(--bd)',borderRadius:'var(--r)',padding:'18px',marginTop:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}}>
                <div>
                  <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>
                    Unidad {selectedUnit.unit_id_display} · Proto {prototipos.find(p=>p.id===selectedUnit.prototipo_id)?.nombre}{' '}
                    <span style={{
                      display:'inline-block',fontSize:'11px',fontWeight:500,
                      padding:'2px 9px',borderRadius:'var(--rp)',marginLeft:'5px',
                      ...ESTADOCOLORS[selectedUnit.estado]
                    }}>
                      {selectedUnit.estado.charAt(0).toUpperCase()+selectedUnit.estado.slice(1)}
                    </span>
                  </div>
                  <div style={{fontSize:'12px',color:'var(--mid)'}}>
                    Nivel {selectedUnit.nivel===99?'PH':selectedUnit.nivel} · {selectedUnit.orientacion||'—'}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'20px',fontWeight:500,color:'var(--gr)'}}>
                    ${selectedUnit.precio.toLocaleString('es-MX')}
                  </div>
                  <div style={{fontSize:'11px',color:'var(--mid)'}}>precio total</div>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',marginBottom:'14px'}}>
                {[
                  {l:'M² Totales',v:`${(selectedUnit.m2_privados||0)+(selectedUnit.balcon_m2||0)+(selectedUnit.terraza_m2||0)} m²`,gr:true},
                  {l:'M² Privados',v:`${selectedUnit.m2_privados} m²`,gr:false},
                  {l:'Recámaras',v:selectedUnit.recamaras,gr:false},
                  {l:'Baños',v:selectedUnit.banos,gr:false},
                  {l:'Cajones',v:selectedUnit.cajones,gr:false},
                ].map((item,i) => (
                  <div key={i} style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'10px',textAlign:'center'}}>
                    <span style={{fontSize:'14px',fontWeight:500,color: item.gr ? 'var(--gr)' : 'var(--dk)',display:'block',marginBottom:'1px'}}>{String(item.v)}</span>
                    <span style={{fontSize:'10px',color:'var(--mid)'}}>{item.l}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const caj = CAJ[selectedUnit.tipo_cajon] || CAJ['individual']
                return (
                  <div style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'10px 14px',display:'flex',alignItems:'flex-start',gap:'10px',marginBottom:'12px'}}>
                    <div style={{fontSize:'18px',flexShrink:0}}>{caj.icon}</div>
                    <div>
                      <div style={{fontSize:'12px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>Estacionamiento: {caj.label}</div>
                      <div style={{fontSize:'11px',color:'var(--mid)',lineHeight:1.6}}>{caj.desc}</div>
                    </div>
                  </div>
                )
              })()}

              <div style={{display:'flex',gap:'8px'}}>
                {selectedUnit.estado !== 'vendido' && (
                  <button
                    onClick={() => alert(`Solicitar unidad ${selectedUnit.unit_id_display}`)}
                    style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'9px 22px',cursor:'pointer'}}
                  >Solicitar esta unidad</button>
                )}
                <button style={{fontFamily:'var(--sans)',fontSize:'13px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'9px 22px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
                  💬 WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
