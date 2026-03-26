'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  destacado: boolean
  total_unidades: number
}

interface ProjectWithScore extends Project {
  score: number
  categoria: 'JOYA' | 'BUENO' | 'REGULAR' | 'DIFICIL'
  unidades_disponibles: number
  unidades_vendidas: number
  absorcion_pct: number
  meses_sold_out: number
  precio_m2: number
  inWishlist: boolean
}

const ALCALDIAS = ['Todas','Álvaro Obregón','Azcapotzalco','Benito Juárez','Coyoacán','Cuajimalpa','Cuauhtémoc','GAM','Iztacalco','Iztapalapa','Magdalena Contreras','Miguel Hidalgo','Milpa Alta','Tláhuac','Tlalpan','Venustiano Carranza','Xochimilco']

export default function CatalogoPage() {
  const [projects, setProjects] = useState<ProjectWithScore[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [filtros, setFiltros] = useState({ alcaldia:'', tipo:'', precio:'', recamaras:'', entrega:'', categoria:'' })
  const [orden, setOrden] = useState('score')
  const [busqueda, setBusqueda] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const { data: projs } = await supabase
        .from('projects')
        .select('*')
        .eq('publicado', true)
        .order('destacado', { ascending: false })

      if (!projs) { setLoading(false); return }

      // Cargar unidades y wishlist en paralelo
      const projIds = projs.map(p => p.id)
      const [{ data: unidades }, { data: wishlist }] = await Promise.all([
        supabase.from('unidades').select('project_id, estado, precio, m2_privados').in('project_id', projIds),
        user ? supabase.from('wishlist').select('project_id').eq('user_id', user.id) : { data: [] }
      ])

      const wishlistIds = new Set((wishlist || []).map(w => w.project_id))

      const withScore: ProjectWithScore[] = projs.map(p => {
        const uds = (unidades || []).filter(u => u.project_id === p.id)
        const disponibles = uds.filter(u => u.estado === 'disponible').length
        const vendidos = uds.filter(u => u.estado === 'vendido').length
        const total = uds.length || p.total_unidades || 1
        const absorcion = total > 0 ? (vendidos / total) * 100 : 0
        const meses_sold_out = absorcion > 0 ? Math.round((disponibles / total) / (absorcion / 100 / 4)) : 99
        const precio_m2 = p.m2_min > 0 ? Math.round(p.precio_desde / p.m2_min) : 0

        // Score atractivo 1-10
        const score_absorcion = Math.min(10, absorcion / 2)
        const score_comision = Math.min(10, (p.comision_pct || 3) / 0.3 * 10 / 10)
        const score_inventario = Math.max(0, Math.min(10, 12 - meses_sold_out))
        const score_precio = disponibles > 0 ? 5 : 0
        const score_total = Math.round(
          score_absorcion * 0.30 +
          score_comision * 0.20 +
          score_inventario * 0.25 +
          score_precio * 0.25
        )

        const categoria: ProjectWithScore['categoria'] =
          score_total >= 8 ? 'JOYA' :
          score_total >= 6 ? 'BUENO' :
          score_total >= 4 ? 'REGULAR' : 'DIFICIL'

        return {
          ...p,
          score: score_total,
          categoria,
          unidades_disponibles: disponibles,
          unidades_vendidas: vendidos,
          absorcion_pct: Math.round(absorcion),
          meses_sold_out: Math.min(meses_sold_out, 99),
          precio_m2,
          inWishlist: wishlistIds.has(p.id),
        }
      })

      setProjects(withScore)
      setLoading(false)
    }
    load()
  }, [])

  async function toggleWishlist(p: ProjectWithScore) {
    if (!userId) { window.location.href = '/auth/login'; return }
    if (p.inWishlist) {
      await supabase.from('wishlist').delete().eq('user_id', userId).eq('project_id', p.id)
    } else {
      await supabase.from('wishlist').insert({ user_id: userId, project_id: p.id })
    }
    setProjects(prev => prev.map(x => x.id === p.id ? { ...x, inWishlist: !x.inWishlist } : x))
  }

  function getCatStyle(cat: string) {
    if (cat === 'JOYA') return { bg:'#FEF9C3', color:'#A16207', emoji:'💎' }
    if (cat === 'BUENO') return { bg:'#DCFCE7', color:'#15803D', emoji:'✅' }
    if (cat === 'REGULAR') return { bg:'var(--bl-bg)', color:'var(--bl)', emoji:'⚡' }
    return { bg:'#FEE2E2', color:'#DC2626', emoji:'⚠️' }
  }

  function getAbsorcionStyle(pct: number) {
    if (pct >= 15) return { color:'#15803D', label:'VERDE', bg:'#DCFCE7' }
    if (pct >= 8) return { color:'#A16207', label:'AMARILLO', bg:'#FEF9C3' }
    return { color:'#DC2626', label:'ROJO', bg:'#FEE2E2' }
  }

  const filtered = projects.filter(p => {
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
        !p.colonia.toLowerCase().includes(busqueda.toLowerCase()) &&
        !p.alcaldia.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtros.alcaldia && p.alcaldia !== filtros.alcaldia) return false
    if (filtros.tipo && p.tipo !== filtros.tipo) return false
    if (filtros.categoria && p.categoria !== filtros.categoria) return false
    if (filtros.precio === 'menos4' && p.precio_desde >= 4000000) return false
    if (filtros.precio === '4a7' && (p.precio_desde < 4000000 || p.precio_desde >= 7000000)) return false
    if (filtros.precio === '7a12' && (p.precio_desde < 7000000 || p.precio_desde >= 12000000)) return false
    if (filtros.precio === 'mas12' && p.precio_desde < 12000000) return false
    if (filtros.recamaras && filtros.recamaras !== '3+' && p.recamaras_min !== parseInt(filtros.recamaras)) return false
    if (filtros.recamaras === '3+' && p.recamaras_min < 3) return false
    if (filtros.entrega === 'inmediata' && p.estado !== 'Entrega inmediata') return false
    if (['2025','2026','2027'].includes(filtros.entrega) && p.entrega_year !== parseInt(filtros.entrega)) return false
    return true
  }).sort((a, b) => {
    if (orden === 'score') return b.score - a.score
    if (orden === 'precio_asc') return a.precio_desde - b.precio_desde
    if (orden === 'precio_desc') return b.precio_desde - a.precio_desde
    if (orden === 'comision') return (b.comision_pct || 0) - (a.comision_pct || 0)
    if (orden === 'absorcion') return b.absorcion_pct - a.absorcion_pct
    return 0
  })

  const selStyle = {
    fontFamily:'var(--sans)',fontSize:'12px',padding:'7px 12px',
    borderRadius:'var(--rp)',border:'1px solid var(--bd)',
    background:'var(--wh)',color:'var(--dk)',cursor:'pointer',
    outline:'none',appearance:'none' as const,
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando catálogo...</div>

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:'20px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>Catálogo de proyectos</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>
          <strong style={{color:'var(--dk)'}}>{filtered.length}</strong> proyectos con score de atractivo
        </div>
      </div>

      {/* BÚSQUEDA */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px',marginBottom:'16px'}}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, colonia o alcaldía..."
          style={{width:'100%',padding:'9px 12px',borderRadius:'8px',border:'1px solid var(--bd)',fontSize:'13px',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box'}}
        />
      </div>

      {/* FILTROS */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'14px 16px',marginBottom:'16px',display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
        <select style={selStyle} value={filtros.alcaldia} onChange={e => setFiltros(p => ({...p,alcaldia:e.target.value}))}>
          <option value=''>Alcaldía</option>
          {ALCALDIAS.slice(1).map(a => <option key={a}>{a}</option>)}
        </select>
        <select style={selStyle} value={filtros.tipo} onChange={e => setFiltros(p => ({...p,tipo:e.target.value}))}>
          <option value=''>Tipo</option>
          <option>Residencial</option><option>Boutique</option><option>Corporativo</option><option>Mixto</option>
        </select>
        <select style={selStyle} value={filtros.precio} onChange={e => setFiltros(p => ({...p,precio:e.target.value}))}>
          <option value=''>Precio</option>
          <option value='menos4'>Menos de $4M</option>
          <option value='4a7'>$4M–$7M</option>
          <option value='7a12'>$7M–$12M</option>
          <option value='mas12'>+$12M</option>
        </select>
        <select style={selStyle} value={filtros.recamaras} onChange={e => setFiltros(p => ({...p,recamaras:e.target.value}))}>
          <option value=''>Recámaras</option>
          <option value='1'>1</option><option value='2'>2</option><option value='3'>3</option><option value='3+'>3+</option>
        </select>
        <select style={selStyle} value={filtros.entrega} onChange={e => setFiltros(p => ({...p,entrega:e.target.value}))}>
          <option value=''>Entrega</option>
          <option value='inmediata'>Inmediata</option>
          <option value='2025'>2025</option><option value='2026'>2026</option><option value='2027'>2027</option>
        </select>
        <select style={selStyle} value={filtros.categoria} onChange={e => setFiltros(p => ({...p,categoria:e.target.value}))}>
          <option value=''>Categoría</option>
          <option value='JOYA'>💎 JOYA</option>
          <option value='BUENO'>✅ BUENO</option>
          <option value='REGULAR'>⚡ REGULAR</option>
          <option value='DIFICIL'>⚠️ DIFÍCIL</option>
        </select>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'12px',color:'var(--mid)'}}>Ordenar:</span>
          <select style={selStyle} value={orden} onChange={e => setOrden(e.target.value)}>
            <option value='score'>Score atractivo</option>
            <option value='comision'>Mayor comisión</option>
            <option value='absorcion'>Mayor absorción</option>
            <option value='precio_asc'>Precio: menor a mayor</option>
            <option value='precio_desc'>Precio: mayor a menor</option>
          </select>
        </div>
      </div>

      {/* GRID DE PROYECTOS */}
      <div style={{display:'grid',gap:'14px'}}>
        {filtered.map(p => {
          const catStyle = getCatStyle(p.categoria)
          const absStyle = getAbsorcionStyle(p.absorcion_pct)
          const comision = p.comision_pct ? Math.round(p.precio_desde * p.comision_pct / 100) : 0
          const gradients = ['linear-gradient(145deg,#0d2318,#1a5c3a)','linear-gradient(145deg,#0e1e2e,#1a3d5a)','linear-gradient(145deg,#1e0d0d,#4a1818)','linear-gradient(145deg,#121020,#2a2060)']
          const bg = gradients[p.id.charCodeAt(0) % gradients.length]

          return (
            <div key={p.id} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',overflow:'hidden',display:'flex',gap:'0'}}>

              {/* IMAGEN */}
              <div style={{width:'140px',flexShrink:0,background:bg,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                <span style={{fontSize:'32px',opacity:.15}}>🏙️</span>
                <div style={{position:'absolute',top:'8px',left:'8px',display:'flex',flexDirection:'column',gap:'4px'}}>
                  <span style={{fontSize:'9px',fontWeight:700,padding:'2px 7px',borderRadius:'var(--rp)',background:catStyle.bg,color:catStyle.color}}>
                    {catStyle.emoji} {p.categoria}
                  </span>
                </div>
                <button
                  onClick={() => toggleWishlist(p)}
                  style={{position:'absolute',top:'8px',right:'8px',width:'24px',height:'24px',borderRadius:'50%',background:'rgba(255,255,255,.88)',border:'none',fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                >{p.inWishlist ? '♥' : '♡'}</button>
              </div>

              {/* INFO PRINCIPAL */}
              <div style={{flex:1,padding:'16px 18px',minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
                  <div>
                    <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>{p.nombre}</div>
                    <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia} · {p.tipo} · {p.estado}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,marginLeft:'12px'}}>
                    <div style={{fontSize:'18px',fontWeight:500,color:'var(--gr)'}}>
                      ${p.precio_desde.toLocaleString('es-MX')}
                    </div>
                    {p.precio_m2 > 0 && (
                      <div style={{fontSize:'10px',color:'var(--mid)'}}>
                        ${p.precio_m2.toLocaleString('es-MX')}/m²
                      </div>
                    )}
                  </div>
                </div>

                {/* SPECS */}
                <div style={{display:'flex',gap:'14px',fontSize:'11px',color:'var(--mid)',marginBottom:'10px',flexWrap:'wrap'}}>
                  {p.m2_min && <span>📐 {p.m2_min}–{p.m2_max} m²</span>}
                  {p.recamaras_min && <span>🛏 {p.recamaras_min}–{p.recamaras_max} rec.</span>}
                  {p.cajones_min && <span>🚗 {p.cajones_min}–{p.cajones_max} caj.</span>}
                  {p.entrega_quarter && <span>🗓 {p.entrega_quarter} {p.entrega_year}</span>}
                  {p.plusvalia_pct && <span>📈 +{p.plusvalia_pct}% plusvalía/año</span>}
                </div>

                {/* MÉTRICAS DE INTELIGENCIA */}
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {/* Score */}
                  <div style={{display:'flex',alignItems:'center',gap:'5px',background:'var(--bg2)',borderRadius:'var(--rs)',padding:'4px 10px'}}>
                    <span style={{fontSize:'10px',color:'var(--mid)'}}>Score:</span>
                    <span style={{fontSize:'11px',fontWeight:700,color:'var(--dk)'}}>{p.score}/10</span>
                  </div>

                  {/* Absorción */}
                  <div style={{display:'flex',alignItems:'center',gap:'5px',background:absStyle.bg,borderRadius:'var(--rs)',padding:'4px 10px'}}>
                    <span style={{fontSize:'10px',color:absStyle.color}}>Absorción:</span>
                    <span style={{fontSize:'11px',fontWeight:700,color:absStyle.color}}>{p.absorcion_pct}%</span>
                    <span style={{fontSize:'9px',color:absStyle.color}}>● {absStyle.label}</span>
                  </div>

                  {/* Unidades */}
                  <div style={{display:'flex',alignItems:'center',gap:'5px',background:'var(--bg2)',borderRadius:'var(--rs)',padding:'4px 10px'}}>
                    <span style={{fontSize:'10px',color:'var(--mid)'}}>Disponibles:</span>
                    <span style={{fontSize:'11px',fontWeight:700,color:'var(--dk)'}}>{p.unidades_disponibles}</span>
                  </div>

                  {/* Sold out */}
                  {p.meses_sold_out < 99 && (
                    <div style={{display:'flex',alignItems:'center',gap:'5px',background: p.meses_sold_out <= 3 ? '#FEE2E2' : '#FEF9C3',borderRadius:'var(--rs)',padding:'4px 10px'}}>
                      <span style={{fontSize:'10px',color: p.meses_sold_out <= 3 ? '#DC2626' : '#A16207'}}>Sold out est.:</span>
                      <span style={{fontSize:'11px',fontWeight:700,color: p.meses_sold_out <= 3 ? '#DC2626' : '#A16207'}}>{p.meses_sold_out} meses</span>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA COMISIÓN + ACCIONES */}
              <div style={{width:'160px',flexShrink:0,borderLeft:'1px solid var(--bd)',padding:'16px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:'10px',color:'var(--mid)',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.06em'}}>Tu comisión</div>
                  <div style={{fontSize:'18px',fontWeight:600,color:'var(--gr)',marginBottom:'2px'}}>
                    {comision > 0 ? `$${Math.round(comision/1000)}k` : '—'}
                  </div>
                  {p.comision_pct && (
                    <div style={{fontSize:'10px',color:'var(--mid)'}}>{p.comision_pct}% del precio base</div>
                  )}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'6px',marginTop:'12px'}}>
                  <a href={`/?view=detail&id=${p.id}`} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'7px',cursor:'pointer',textDecoration:'none',textAlign:'center'}}>
                    Ver ficha →
                  </a>
                  <a href={`/asesores/comparador?add=${p.id}`} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'transparent',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'7px',cursor:'pointer',textDecoration:'none',textAlign:'center'}}>
                    ⚖️ Comparar
                  </a>
                  <a href={`/asesores/clientes?project=${p.id}`} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'transparent',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'7px',cursor:'pointer',textDecoration:'none',textAlign:'center'}}>
                    👥 A cliente
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
