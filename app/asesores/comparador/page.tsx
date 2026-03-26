'use client'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

interface Project {
  id: string
  nombre: string
  tipo: string
  estado: string
  colonia: string
  alcaldia: string
  precio_desde: number
  precio_hasta: number
  entrega_quarter: string
  entrega_year: number
  m2_min: number
  m2_max: number
  recamaras_min: number
  recamaras_max: number
  cajones_min: number
  cajones_max: number
  plusvalia_pct: number
  comision_pct: number
  amenidades: string[]
  descripcion: string
  total_unidades: number
}

function ComparadorContent() {
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('projects').select('*').eq('publicado', true).order('destacado', { ascending: false })
      const projs = (data as Project[]) || []
      setAllProjects(projs)
      const addId = searchParams.get('add')
      if (addId) {
        const p = projs.find(x => x.id === addId)
        if (p) setSelected([p])
      }
      setLoading(false)
    }
    load()
  }, [])

  function addProject(p: Project) {
    if (selected.length >= 5) return
    if (selected.find(x => x.id === p.id)) return
    setSelected(prev => [...prev, p])
    setShowPicker(false)
    setBusqueda('')
  }

  function removeProject(id: string) {
    setSelected(prev => prev.filter(p => p.id !== id))
  }

  const filtered = allProjects.filter(p =>
    !selected.find(s => s.id === p.id) &&
    (busqueda === '' ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.colonia.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.alcaldia.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const gradients = [
    'linear-gradient(145deg,#0d2318,#1a5c3a)',
    'linear-gradient(145deg,#0e1e2e,#1a3d5a)',
    'linear-gradient(145deg,#1e0d0d,#4a1818)',
    'linear-gradient(145deg,#121020,#2a2060)',
    'linear-gradient(145deg,#1a1208,#5a3a10)',
  ]

  function getBest(key: keyof Project, higher = true): string {
    if (selected.length < 2) return ''
    const vals = selected.map(p => p[key] as number)
    const best = higher ? Math.max(...vals) : Math.min(...vals)
    return String(best)
  }

  function isBest(p: Project, key: keyof Project, higher = true): boolean {
    if (selected.length < 2) return false
    const vals = selected.map(x => x[key] as number)
    const best = higher ? Math.max(...vals) : Math.min(...vals)
    return (p[key] as number) === best
  }

  const compareRows = [
    { label:'Precio desde', key:'precio_desde' as keyof Project, format: (v: number) => `$${v.toLocaleString('es-MX')}`, best:'lower' },
    { label:'Precio hasta', key:'precio_hasta' as keyof Project, format: (v: number) => v ? `$${v.toLocaleString('es-MX')}` : '—', best:'none' },
    { label:'M² mínimos', key:'m2_min' as keyof Project, format: (v: number) => `${v} m²`, best:'higher' },
    { label:'M² máximos', key:'m2_max' as keyof Project, format: (v: number) => `${v} m²`, best:'higher' },
    { label:'Recámaras mín.', key:'recamaras_min' as keyof Project, format: (v: number) => String(v), best:'none' },
    { label:'Recámaras máx.', key:'recamaras_max' as keyof Project, format: (v: number) => String(v), best:'higher' },
    { label:'Cajones', key:'cajones_min' as keyof Project, format: (v: number) => `${v}–`, best:'none' },
    { label:'Plusvalía/año', key:'plusvalia_pct' as keyof Project, format: (v: number) => `${v}%`, best:'higher' },
    { label:'Comisión asesor', key:'comision_pct' as keyof Project, format: (v: number) => `${v}%`, best:'higher' },
    { label:'Total unidades', key:'total_unidades' as keyof Project, format: (v: number) => v ? String(v) : '—', best:'none' },
  ]

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando comparador...</div>

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>Comparador de proyectos</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Compara hasta 5 proyectos lado a lado · {selected.length}/5 seleccionados</div>
      </div>

      {/* SLOTS DE PROYECTOS */}
      <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.max(selected.length + (selected.length < 5 ? 1 : 0), 1)}, 1fr)`,gap:'12px',marginBottom:'28px',overflowX:'auto'}}>

        {/* PROYECTOS SELECCIONADOS */}
        {selected.map((p, i) => {
          const comision = p.comision_pct ? Math.round(p.precio_desde * p.comision_pct / 100) : 0
          return (
            <div key={p.id} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'2px solid var(--dk)',overflow:'hidden',minWidth:'200px'}}>
              {/* IMG */}
              <div style={{height:'120px',background:gradients[i % gradients.length],display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                <span style={{fontSize:'28px',opacity:.15}}>🏙️</span>
                <button onClick={() => removeProject(p.id)} style={{position:'absolute',top:'8px',right:'8px',width:'22px',height:'22px',borderRadius:'50%',background:'rgba(255,255,255,.88)',border:'none',fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>✕</button>
                <div style={{position:'absolute',bottom:'8px',left:'8px',fontSize:'9px',fontWeight:600,background:'var(--dk)',color:'#fff',padding:'2px 7px',borderRadius:'var(--rp)'}}>#{i+1}</div>
              </div>
              {/* INFO */}
              <div style={{padding:'12px'}}>
                <div style={{fontSize:'13px',fontWeight:600,color:'var(--dk)',marginBottom:'2px',lineHeight:1.2}}>{p.nombre}</div>
                <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'8px'}}>{p.colonia}, {p.alcaldia}</div>
                <div style={{fontSize:'10px',color:'var(--mid)',background:'var(--bg2)',padding:'2px 7px',borderRadius:'4px',display:'inline-block',marginBottom:'4px'}}>{p.estado}</div>
                {comision > 0 && (
                  <div style={{fontSize:'11px',fontWeight:600,color:'var(--gr)',marginTop:'4px'}}>💰 Comisión: ${Math.round(comision/1000)}k</div>
                )}
              </div>
            </div>
          )
        })}

        {/* SLOT VACÍO PARA AGREGAR */}
        {selected.length < 5 && (
          <div
            onClick={() => setShowPicker(true)}
            style={{background:'var(--bg2)',borderRadius:'var(--r)',border:'2px dashed var(--bd)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:'32px 16px',minWidth:'200px',gap:'8px',transition:'all .15s'}}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--dk)'; e.currentTarget.style.background='var(--wh)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--bd)'; e.currentTarget.style.background='var(--bg2)' }}
          >
            <span style={{fontSize:'28px',opacity:.3}}>+</span>
            <span style={{fontSize:'12px',color:'var(--mid)',textAlign:'center'}}>Agregar proyecto</span>
            <span style={{fontSize:'10px',color:'var(--dim)'}}>({5 - selected.length} restante{5 - selected.length !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>

      {/* PICKER DE PROYECTOS */}
      {showPicker && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px',marginBottom:'20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>Selecciona un proyecto</div>
            <button onClick={() => { setShowPicker(false); setBusqueda('') }} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--mid)',fontSize:'16px'}}>✕</button>
          </div>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar proyecto..."
            style={{width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1px solid var(--bd)',fontSize:'13px',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box',marginBottom:'12px'}}
            autoFocus
          />
          <div style={{maxHeight:'240px',overflowY:'auto',display:'grid',gap:'6px'}}>
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => addProject(p)}
                style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',borderRadius:'var(--rs)',cursor:'pointer',border:'1px solid var(--bd)',background:'var(--bg2)',transition:'all .15s'}}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--dk)'; e.currentTarget.style.background='var(--wh)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--bd)'; e.currentTarget.style.background='var(--bg2)' }}
              >
                <div>
                  <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>{p.nombre}</div>
                  <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia} · ${p.precio_desde.toLocaleString('es-MX')}</div>
                </div>
                <span style={{fontSize:'20px',color:'var(--gr)'}}>+</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{textAlign:'center',padding:'20px',color:'var(--mid)',fontSize:'13px'}}>No se encontraron proyectos</div>
            )}
          </div>
        </div>
      )}

      {/* TABLA COMPARATIVA */}
      {selected.length >= 2 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',overflow:'hidden',marginBottom:'20px'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid var(--bd)',fontSize:'14px',fontWeight:500,color:'var(--dk)'}}>
            📊 Comparativa detallada
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'var(--bg2)'}}>
                  <th style={{padding:'10px 14px',textAlign:'left',fontSize:'11px',fontWeight:600,color:'var(--mid)',letterSpacing:'.04em',textTransform:'uppercase',borderBottom:'1px solid var(--bd)',width:'160px'}}>Característica</th>
                  {selected.map((p,i) => (
                    <th key={p.id} style={{padding:'10px 14px',textAlign:'center',fontSize:'11px',fontWeight:600,color:'var(--mid)',letterSpacing:'.04em',textTransform:'uppercase',borderBottom:'1px solid var(--bd)',borderLeft:'1px solid var(--bd)'}}>
                      #{i+1} {p.nombre.split('·')[0].trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* UBICACIÓN */}
                <tr>
                  <td style={{padding:'10px 14px',fontSize:'12px',fontWeight:600,color:'var(--mid)',background:'var(--bg2)',textTransform:'uppercase',letterSpacing:'.04em'}}>Ubicación</td>
                  {selected.map(p => (
                    <td key={p.id} style={{padding:'10px 14px',textAlign:'center',borderLeft:'1px solid var(--bd2)',borderBottom:'1px solid var(--bd2)',fontSize:'12px',color:'var(--mid)'}}>
                      {p.colonia}, {p.alcaldia}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{padding:'10px 14px',fontSize:'12px',fontWeight:600,color:'var(--mid)',background:'var(--bg2)',textTransform:'uppercase',letterSpacing:'.04em'}}>Estado</td>
                  {selected.map(p => (
                    <td key={p.id} style={{padding:'10px 14px',textAlign:'center',borderLeft:'1px solid var(--bd2)',borderBottom:'1px solid var(--bd2)'}}>
                      <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:'var(--bg2)',color:'var(--mid)'}}>{p.estado}</span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{padding:'10px 14px',fontSize:'12px',fontWeight:600,color:'var(--mid)',background:'var(--bg2)',textTransform:'uppercase',letterSpacing:'.04em'}}>Entrega est.</td>
                  {selected.map(p => (
                    <td key={p.id} style={{padding:'10px 14px',textAlign:'center',borderLeft:'1px solid var(--bd2)',borderBottom:'1px solid var(--bd2)',fontSize:'12px',color:'var(--dk)'}}>
                      {p.entrega_quarter && p.entrega_year ? `${p.entrega_quarter} ${p.entrega_year}` : '—'}
                    </td>
                  ))}
                </tr>

                {/* MÉTRICAS NUMÉRICAS */}
                {compareRows.map((row, ri) => (
                  <tr key={ri} style={{background: ri%2===0 ? 'transparent' : 'rgba(33,45,48,.015)'}}>
                    <td style={{padding:'10px 14px',fontSize:'10px',fontWeight:600,color:'var(--mid)',background:'var(--bg2)',textTransform:'uppercase',letterSpacing:'.04em'}}>{row.label}</td>
                    {selected.map(p => {
                      const val = p[row.key] as number
                      const best = row.best === 'higher' ? isBest(p, row.key, true) : row.best === 'lower' ? isBest(p, row.key, false) : false
                      return (
                        <td key={p.id} style={{padding:'10px 14px',textAlign:'center',borderLeft:'1px solid var(--bd2)',borderBottom:'1px solid var(--bd2)'}}>
                          <span style={{fontSize:'13px',fontWeight: best ? 700 : 400, color: best ? 'var(--gr)' : 'var(--dk)'}}>
                            {val ? row.format(val) : '—'}
                          </span>
                          {best && <span style={{fontSize:'9px',color:'var(--gr)',display:'block',marginTop:'1px'}}>✓ mejor</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* AMENIDADES */}
                <tr>
                  <td style={{padding:'10px 14px',fontSize:'10px',fontWeight:600,color:'var(--mid)',background:'var(--bg2)',textTransform:'uppercase',letterSpacing:'.04em'}}>Amenidades</td>
                  {selected.map(p => (
                    <td key={p.id} style={{padding:'10px 14px',textAlign:'center',borderLeft:'1px solid var(--bd2)',borderBottom:'1px solid var(--bd2)'}}>
                      <span style={{fontSize:'13px',fontWeight: isBest(p, 'amenidades' as keyof Project, true) ? 700 : 400, color:'var(--dk)'}}>
                        {p.amenidades?.length || 0}
                      </span>
                      <div style={{fontSize:'9px',color:'var(--mid)',marginTop:'2px'}}>
                        {p.amenidades?.slice(0,3).join(', ')}{(p.amenidades?.length || 0) > 3 ? '...' : ''}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* COMISIÓN EN PESOS */}
                <tr style={{background:'var(--gr-bg)'}}>
                  <td style={{padding:'10px 14px',fontSize:'10px',fontWeight:700,color:'var(--gr)',background:'rgba(27,67,50,.08)',textTransform:'uppercase',letterSpacing:'.04em'}}>💰 Tu comisión</td>
                  {selected.map(p => {
                    const comision = p.comision_pct ? Math.round(p.precio_desde * p.comision_pct / 100) : 0
                    const best = selected.length >= 2 && comision === Math.max(...selected.map(x => x.comision_pct ? Math.round(x.precio_desde * x.comision_pct / 100) : 0))
                    return (
                      <td key={p.id} style={{padding:'10px 14px',textAlign:'center',borderLeft:'1px solid rgba(27,67,50,.1)',borderBottom:'1px solid rgba(27,67,50,.1)'}}>
                        <span style={{fontSize:'15px',fontWeight:700,color: best ? 'var(--gr)' : 'var(--dk)'}}>
                          {comision > 0 ? `$${comision.toLocaleString('es-MX')}` : '—'}
                        </span>
                        {best && <span style={{fontSize:'9px',color:'var(--gr)',display:'block',marginTop:'1px'}}>✓ mayor comisión</span>}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {selected.length === 0 && !showPicker && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'2px dashed var(--bd)',padding:'60px',textAlign:'center'}}>
          <div style={{fontSize:'36px',marginBottom:'14px'}}>⚖️</div>
          <div style={{fontSize:'18px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>Compara hasta 5 proyectos</div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'24px'}}>Selecciona proyectos para ver una comparativa detallada lado a lado</div>
          <button onClick={() => setShowPicker(true)} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 24px',cursor:'pointer'}}>
            + Agregar primer proyecto
          </button>
        </div>
      )}

      {selected.length === 1 && (
        <div style={{background:'var(--bl-bg)',borderRadius:'var(--r)',border:'1px solid var(--bl-bg)',padding:'16px',textAlign:'center',fontSize:'13px',color:'var(--bl)'}}>
          Agrega al menos un proyecto más para ver la comparativa
        </div>
      )}
    </div>
  )
}

export default function ComparadorPage() {
  return (
    <Suspense fallback={<div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando...</div>}>
      <ComparadorContent />
    </Suspense>
  )
}
