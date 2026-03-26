'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Unidad {
  id?: string
  project_id: string
  unit_id_display: string
  nivel: number
  m2_privados: number
  balcon_m2: number | null
  terraza_m2: number | null
  rg_m2: number | null
  recamaras: number
  banos: number
  cajones: number
  tipo_cajon: string
  bodega: boolean
  ubicacion: string
  precio: number
  estado: string
  isNew?: boolean
  isDirty?: boolean
}

interface Prototipo {
  id: string
  nombre: string
  m2_privados: number
  recamaras: number
  banos: number
  cajones: number
  precio_desde: number
}

const EMPTY_UNIT = (projectId: string): Unidad => ({
  project_id: projectId,
  unit_id_display: '',
  nivel: 1,
  m2_privados: 0,
  balcon_m2: null,
  terraza_m2: null,
  rg_m2: null,
  recamaras: 1,
  banos: 1,
  cajones: 1,
  tipo_cajon: 'individual',
  bodega: false,
  ubicacion: 'Interior',
  precio: 0,
  estado: 'disponible',
  isNew: true,
  isDirty: true,
})

export default function UnidadesPage({ params }: { params: { id: string } }) {
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [prototipos, setPrototipos] = useState<Prototipo[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkEstado, setBulkEstado] = useState('disponible')
  const [stats, setStats] = useState({ d:0, r:0, v:0, total:0 })
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: proj } = await supabase.from('projects').select('nombre').eq('id', params.id).single()
      if (proj) setProjectName(proj.nombre)
      const [{ data: u }, { data: p }] = await Promise.all([
        supabase.from('unidades').select('*').eq('project_id', params.id).order('nivel').order('unit_id_display'),
        supabase.from('prototipos').select('*').eq('project_id', params.id).order('nombre'),
      ])
      setUnidades((u as Unidad[]) || [])
      setPrototipos((p as Prototipo[]) || [])
      calcStats((u as Unidad[]) || [])
      setLoading(false)
    }
    load()
  }, [params.id])

  function calcStats(list: Unidad[]) {
    setStats({
      d: list.filter(u => u.estado === 'disponible').length,
      r: list.filter(u => u.estado === 'reservado').length,
      v: list.filter(u => u.estado === 'vendido').length,
      total: list.length,
    })
  }

  function updUnit(idx: number, key: string, val: string | number | boolean | null) {
    setUnidades(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: val, isDirty: true }
      calcStats(next)
      return next
    })
  }

  function addRow() {
    setUnidades(prev => {
      const next = [...prev, EMPTY_UNIT(params.id)]
      calcStats(next)
      return next
    })
  }

  function addMultipleRows(n: number) {
    const newRows = Array.from({ length: n }, () => EMPTY_UNIT(params.id))
    setUnidades(prev => {
      const next = [...prev, ...newRows]
      calcStats(next)
      return next
    })
  }

  function removeRow(idx: number) {
    setUnidades(prev => {
      const next = prev.filter((_, i) => i !== idx)
      calcStats(next)
      return next
    })
  }

  function applyProto(idx: number, protoNombre: string) {
    const proto = prototipos.find(p => p.nombre === protoNombre)
    if (!proto) return
    setUnidades(prev => {
      const next = [...prev]
      next[idx] = {
        ...next[idx],
        m2_privados: proto.m2_privados,
        recamaras: proto.recamaras,
        banos: proto.banos,
        cajones: proto.cajones,
        precio: proto.precio_desde,
        isDirty: true,
      }
      return next
    })
  }

  function toggleSelect(idx: number) {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function selectAll() {
    if (selectedRows.size === filtered.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filtered.map((_, i) => i)))
    }
  }

  function applyBulkEstado() {
    setUnidades(prev => {
      const next = prev.map((u, i) => {
        if (selectedRows.has(i)) return { ...u, estado: bulkEstado, isDirty: true }
        return u
      })
      calcStats(next)
      return next
    })
    setSelectedRows(new Set())
  }

  async function handleSave() {
    setSaving(true)
    const dirty = unidades.filter(u => u.isDirty)
    for (const u of dirty) {
      const payload = {
        project_id: u.project_id,
        unit_id_display: u.unit_id_display,
        nivel: u.nivel,
        m2_privados: u.m2_privados,
        balcon_m2: u.balcon_m2,
        terraza_m2: u.terraza_m2,
        rg_m2: u.rg_m2,
        recamaras: u.recamaras,
        banos: u.banos,
        cajones: u.cajones,
        tipo_cajon: u.tipo_cajon,
        bodega: u.bodega,
        ubicacion: u.ubicacion,
        precio: u.precio,
        estado: u.estado,
      }
      if (u.isNew || !u.id) {
        await supabase.from('unidades').insert(payload)
      } else {
        await supabase.from('unidades').update(payload).eq('id', u.id)
      }
    }
    // Reload
    const { data } = await supabase.from('unidades').select('*').eq('project_id', params.id).order('nivel').order('unit_id_display')
    setUnidades((data as Unidad[]) || [])
    calcStats((data as Unidad[]) || [])
    setSaving(false)
  }

  async function handleDeleteSelected() {
    if (selectedRows.size === 0) return
    if (!confirm(`¿Eliminar ${selectedRows.size} unidad(es)?`)) return
    const toDelete = [...selectedRows].map(i => unidades[i]).filter(u => u.id && !u.isNew)
    for (const u of toDelete) {
      if (u.id) await supabase.from('unidades').delete().eq('id', u.id)
    }
    setUnidades(prev => {
      const next = prev.filter((_, i) => !selectedRows.has(i))
      calcStats(next)
      return next
    })
    setSelectedRows(new Set())
  }

  // Importar CSV/Excel básico
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_'))
    const newUnits: Unidad[] = lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g,''))
      const obj: Record<string,string> = {}
      headers.forEach((h,i) => { obj[h] = vals[i] || '' })
      return {
        project_id: params.id,
        unit_id_display: obj['id'] || obj['depto'] || obj['unidad'] || obj['unit_id_display'] || '',
        nivel: parseInt(obj['nivel'] || obj['piso'] || '1') || 1,
        m2_privados: parseFloat(obj['m2_privados'] || obj['m2'] || obj['metros'] || '0') || 0,
        balcon_m2: parseFloat(obj['balcon_m2'] || obj['balcon'] || '0') || null,
        terraza_m2: parseFloat(obj['terraza_m2'] || obj['terraza'] || '0') || null,
        rg_m2: parseFloat(obj['rg_m2'] || obj['roof'] || '0') || null,
        recamaras: parseInt(obj['recamaras'] || obj['rec'] || '1') || 1,
        banos: parseInt(obj['banos'] || obj['ba_os'] || '1') || 1,
        cajones: parseInt(obj['cajones'] || '1') || 1,
        tipo_cajon: obj['tipo_cajon'] || obj['tipo_caj_n'] || 'individual',
        bodega: obj['bodega'] === 'true' || obj['bodega'] === 'si' || obj['bodega'] === 'sí' || obj['bodega'] === '1',
        ubicacion: obj['ubicacion'] || obj['ubicaci_n'] || 'Interior',
        precio: parseFloat(obj['precio'] || '0') || 0,
        estado: obj['estado'] || 'disponible',
        isNew: true,
        isDirty: true,
      }
    }).filter(u => u.unit_id_display)
    setUnidades(prev => {
      const next = [...prev, ...newUnits]
      calcStats(next)
      return next
    })
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = unidades.filter(u => filtroEstado === 'all' || u.estado === filtroEstado)
  const dirtyCount = unidades.filter(u => u.isDirty).length

  const cellStyle = {
    padding:'0', border:'none', borderBottom:'1px solid var(--bd2)',
  }

  const inputCell = {
    width:'100%', padding:'7px 8px', border:'none', outline:'none',
    fontSize:'12px', fontFamily:'var(--sans)', background:'transparent',
    color:'var(--dk)',
  }

  const selectCell = {
    ...inputCell, appearance:'none' as const, cursor:'pointer',
  }

  const estadoColors: Record<string,{bg:string,color:string}> = {
    disponible: {bg:'#DCFCE7',color:'#15803D'},
    reservado:  {bg:'#FEF9C3',color:'#A16207'},
    vendido:    {bg:'#FEE2E2',color:'#DC2626'},
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando unidades...</div>

  return (
    <div>
      {/* HEADER */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
            <a href={`/desarrolladores/proyectos/${params.id}`} style={{fontSize:'13px',color:'var(--mid)',textDecoration:'none'}}>← {projectName}</a>
          </div>
          <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)'}}>Gestión de unidades</div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginTop:'4px'}}>
            Editor inline — edita directamente en la tabla
          </div>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <label style={{
            fontFamily:'var(--sans)',fontSize:'12px',background:'var(--wh)',
            color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',
            padding:'8px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'5px'
          }}>
            {importing ? '⏳ Importando...' : '📥 Importar CSV'}
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleImport} style={{display:'none'}} />
          </label>
          <button onClick={() => addMultipleRows(10)} style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--wh)',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'8px 14px',cursor:'pointer'}}>
            ➕ Agregar 10 filas
          </button>
          <button onClick={addRow} style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--wh)',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'8px 14px',cursor:'pointer'}}>
            ➕ Agregar fila
          </button>
          <button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0}
            style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'8px 18px',cursor:'pointer',opacity:saving||dirtyCount===0?0.6:1}}
          >
            {saving ? 'Guardando...' : `💾 Guardar${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{display:'flex',gap:'12px',marginBottom:'16px',flexWrap:'wrap'}}>
        {[
          {label:'Total',v:stats.total,bg:'var(--bg2)',color:'var(--dk)'},
          {label:'Disponibles',v:stats.d,bg:'#DCFCE7',color:'#15803D'},
          {label:'Reservadas',v:stats.r,bg:'#FEF9C3',color:'#A16207'},
          {label:'Vendidas',v:stats.v,bg:'#FEE2E2',color:'#DC2626'},
          {label:'% Vendido',v:stats.total>0?Math.round(stats.v/stats.total*100)+'%':'0%',bg:'var(--bl-bg)',color:'var(--bl)'},
        ].map((s,i) => (
          <div key={i} style={{background:s.bg,borderRadius:'var(--rs)',padding:'8px 14px',display:'flex',gap:'8px',alignItems:'center'}}>
            <span style={{fontSize:'18px',fontWeight:600,color:s.color}}>{s.v}</span>
            <span style={{fontSize:'11px',color:s.color}}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'12px',flexWrap:'wrap'}}>
        {/* Filtro estado */}
        <div style={{display:'flex',gap:'4px'}}>
          {[['all','Todos'],['disponible','Disponibles'],['reservado','Reservados'],['vendido','Vendidos']].map(([v,l]) => (
            <button key={v} onClick={() => setFiltroEstado(v)} style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'4px 10px',borderRadius:'var(--rp)',border:filtroEstado===v?'none':'1px solid var(--bd)',background:filtroEstado===v?'var(--dk)':'var(--wh)',color:filtroEstado===v?'#fff':'var(--mid)',cursor:'pointer'}}>{l}</button>
          ))}
        </div>

        {/* Bulk actions */}
        {selectedRows.size > 0 && (
          <div style={{display:'flex',gap:'6px',alignItems:'center',marginLeft:'auto',background:'var(--bg2)',borderRadius:'var(--rs)',padding:'4px 10px'}}>
            <span style={{fontSize:'11px',color:'var(--mid)'}}>{selectedRows.size} seleccionadas</span>
            <select value={bulkEstado} onChange={e => setBulkEstado(e.target.value)} style={{fontFamily:'var(--sans)',fontSize:'11px',border:'1px solid var(--bd)',borderRadius:'var(--rs)',padding:'3px 8px',background:'var(--wh)',cursor:'pointer',outline:'none'}}>
              <option value="disponible">Disponible</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
            </select>
            <button onClick={applyBulkEstado} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rs)',padding:'4px 10px',cursor:'pointer'}}>Aplicar</button>
            <button onClick={handleDeleteSelected} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--rd-bg)',color:'var(--rd)',border:'none',borderRadius:'var(--rs)',padding:'4px 10px',cursor:'pointer'}}>🗑 Eliminar</button>
          </div>
        )}
      </div>

      {/* TABLA EDITABLE */}
      <div style={{overflowX:'auto',borderRadius:'var(--r)',border:'1px solid var(--bd)',background:'var(--wh)',marginBottom:'16px'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',whiteSpace:'nowrap'}}>
          <thead>
            <tr style={{background:'var(--dk)'}}>
              <th style={{padding:'8px',width:'32px'}}>
                <input type="checkbox" onChange={selectAll} checked={selectedRows.size === filtered.length && filtered.length > 0} style={{cursor:'pointer'}} />
              </th>
              {['ID Unidad','Nivel','Prototipo','M² Priv.','Balcón','Terraza','Rec.','Baños','Caj.','Tipo cajón','Bodega','Ubicación','Precio','Estado',''].map((h,i) => (
                <th key={i} style={{padding:'8px 10px',textAlign:'left',fontSize:'9px',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'rgba(255,255,255,.6)',borderLeft:i>0?'1px solid rgba(255,255,255,.1)':undefined}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={15} style={{padding:'32px',textAlign:'center',color:'var(--mid)'}}>
                  No hay unidades. Usa "Agregar fila" o "Importar CSV" para comenzar.
                </td>
              </tr>
            ) : filtered.map((u, idx) => {
              const isSelected = selectedRows.has(idx)
              const ec = estadoColors[u.estado] || estadoColors['disponible']
              return (
                <tr key={idx} style={{background: isSelected ? 'rgba(33,45,48,.04)' : u.isNew ? 'rgba(27,67,50,.03)' : 'transparent',borderBottom:'1px solid var(--bd2)'}}>
                  <td style={{...cellStyle,padding:'0 8px',textAlign:'center'}}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(idx)} style={{cursor:'pointer'}} />
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'80px',fontWeight:600}} value={u.unit_id_display} onChange={e => updUnit(idx,'unit_id_display',e.target.value)} placeholder="101" />
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'50px'}} type="number" value={u.nivel} onChange={e => updUnit(idx,'nivel',parseInt(e.target.value)||1)} />
                  </td>
                  <td style={cellStyle}>
                    <select style={{...selectCell,width:'80px'}} onChange={e => applyProto(idx, e.target.value)} defaultValue="">
                      <option value="" disabled>Proto</option>
                      {prototipos.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                    </select>
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'60px'}} type="number" value={u.m2_privados} onChange={e => updUnit(idx,'m2_privados',parseFloat(e.target.value)||0)} />
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'55px'}} type="number" value={u.balcon_m2||''} onChange={e => updUnit(idx,'balcon_m2',e.target.value?parseFloat(e.target.value):null)} placeholder="—" />
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'55px'}} type="number" value={u.terraza_m2||''} onChange={e => updUnit(idx,'terraza_m2',e.target.value?parseFloat(e.target.value):null)} placeholder="—" />
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'40px'}} type="number" value={u.recamaras} onChange={e => updUnit(idx,'recamaras',parseInt(e.target.value)||1)} min="1" max="6" />
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'40px'}} type="number" value={u.banos} onChange={e => updUnit(idx,'banos',parseInt(e.target.value)||1)} min="1" max="6" />
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'40px'}} type="number" value={u.cajones} onChange={e => updUnit(idx,'cajones',parseInt(e.target.value)||1)} min="0" max="4" />
                  </td>
                  <td style={cellStyle}>
                    <select style={{...selectCell,width:'110px'}} value={u.tipo_cajon} onChange={e => updUnit(idx,'tipo_cajon',e.target.value)}>
                      <option value="individual">Individual</option>
                      <option value="bateria_propia">Bat. propia</option>
                      <option value="bateria_vecino">Bat. vecino</option>
                      <option value="elevaautos">Eleva-autos</option>
                    </select>
                  </td>
                  <td style={{...cellStyle,textAlign:'center'}}>
                    <input type="checkbox" checked={u.bodega} onChange={e => updUnit(idx,'bodega',e.target.checked)} style={{cursor:'pointer'}} />
                  </td>
                  <td style={cellStyle}>
                    <select style={{...selectCell,width:'85px'}} value={u.ubicacion} onChange={e => updUnit(idx,'ubicacion',e.target.value)}>
                      <option>Interior</option>
                      <option>Exterior</option>
                    </select>
                  </td>
                  <td style={cellStyle}>
                    <input style={{...inputCell,width:'110px'}} type="number" value={u.precio} onChange={e => updUnit(idx,'precio',parseFloat(e.target.value)||0)} />
                  </td>
                  <td style={cellStyle}>
                    <select style={{...selectCell,width:'95px',background:ec.bg,color:ec.color,fontWeight:500}} value={u.estado} onChange={e => updUnit(idx,'estado',e.target.value)}>
                      <option value="disponible">Disponible</option>
                      <option value="reservado">Reservado</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  </td>
                  <td style={{...cellStyle,padding:'0 6px'}}>
                    <button onClick={() => removeRow(idx)} style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--dim)',fontSize:'14px',padding:'4px'}}>✕</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* AYUDA IMPORTAR CSV */}
      <div style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'12px 16px',fontSize:'11px',color:'var(--mid)'}}>
        <strong style={{color:'var(--dk)'}}>Formato CSV para importar:</strong> La primera fila debe tener los encabezados.
        Columnas reconocidas: <code>id</code> o <code>depto</code>, <code>nivel</code>, <code>m2_privados</code>, <code>balcon_m2</code>, <code>terraza_m2</code>, <code>recamaras</code>, <code>banos</code>, <code>cajones</code>, <code>tipo_cajon</code>, <code>bodega</code>, <code>ubicacion</code>, <code>precio</code>, <code>estado</code>
      </div>
    </div>
  )
}
