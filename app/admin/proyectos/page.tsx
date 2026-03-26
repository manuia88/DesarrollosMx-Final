'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  nombre: string
  tipo: string
  estado: string
  alcaldia: string
  colonia: string
  precio_desde: number
  total_unidades: number
  publicado: boolean
  destacado: boolean
  estado_publicacion: string
  vistas_count: number
  created_at: string
  updated_at: string
  desarrolladoras?: any
}

export default function AdminProyectosPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('all')
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('projects')
      .select('id, nombre, tipo, estado, alcaldia, colonia, precio_desde, total_unidades, publicado, destacado, estado_publicacion, vistas_count, created_at, updated_at, desarrolladoras(nombre)')
      .order('created_at', { ascending: false })
    setProjects((data || []) as unknown as Project[])
    setLoading(false)
  }

  async function updateProject(id: string, updates: Record<string, unknown>) {
    const adminId = (await supabase.auth.getUser()).data.user?.id
    await supabase.from('projects').update(updates).eq('id', id)
    await supabase.from('admin_actions').insert({
      admin_id: adminId, action: Object.keys(updates).join(','),
      entity_type: 'project', entity_id: id,
      detail: JSON.stringify(updates)
    })
    load()
  }

  const filtered = projects.filter(p => {
    if (filtro === 'pendientes' && p.estado_publicacion !== 'en_revision') return false
    if (filtro === 'publicados' && !p.publicado) return false
    if (filtro === 'borrador' && p.estado_publicacion !== 'borrador') return false
    if (filtro === 'rechazados' && p.estado_publicacion !== 'rechazado') return false
    if (filtro === 'destacados' && !p.destacado) return false
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase()) && !p.alcaldia.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    all: projects.length,
    pendientes: projects.filter(p => p.estado_publicacion === 'en_revision').length,
    publicados: projects.filter(p => p.publicado).length,
    borrador: projects.filter(p => p.estado_publicacion === 'borrador').length,
    rechazados: projects.filter(p => p.estado_publicacion === 'rechazado').length,
    destacados: projects.filter(p => p.destacado).length,
  }

  const pubStyle = (ep: string) => {
    if (ep === 'publicado') return { bg: '#DCFCE7', color: '#15803D' }
    if (ep === 'en_revision') return { bg: '#FEF9C3', color: '#A16207' }
    if (ep === 'rechazado') return { bg: '#FEE2E2', color: '#DC2626' }
    return { bg: 'var(--bg2)', color: 'var(--mid)' }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando proyectos...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>🏗️ Gestión de proyectos</div>
          <div style={{ fontSize: '13px', color: 'var(--mid)' }}>{projects.length} proyectos en el sistema</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o alcaldía..." style={{ padding: '8px 14px', borderRadius: 'var(--rp)', border: '1px solid var(--bd)', fontSize: '12px', fontFamily: 'var(--sans)', width: '250px', outline: 'none' }} />
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {[
          ['all', `Todos (${counts.all})`],
          ['pendientes', `Pendientes (${counts.pendientes})`],
          ['publicados', `Publicados (${counts.publicados})`],
          ['borrador', `Borrador (${counts.borrador})`],
          ['rechazados', `Rechazados (${counts.rechazados})`],
          ['destacados', `Destacados (${counts.destacados})`],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} style={{ fontFamily: 'var(--sans)', fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--rp)', border: filtro === v ? 'none' : '1px solid var(--bd)', background: filtro === v ? 'var(--dk)' : 'var(--wh)', color: filtro === v ? '#fff' : 'var(--mid)', cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* TABLA */}
      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['Proyecto', 'Desarrolladora', 'Zona', 'Precio desde', 'Estado', 'Publicación', 'Vistas', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--mid)', borderBottom: '1px solid var(--bd)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const ps = pubStyle(p.estado_publicacion)
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--bd2)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--dk)' }}>{p.nombre}</div>
                    <div style={{ fontSize: '10px', color: 'var(--dim)' }}>{p.tipo} · {p.estado}</div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{(Array.isArray(p.desarrolladoras) ? p.desarrolladoras[0]?.nombre : p.desarrolladoras?.nombre) || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{p.colonia}, {p.alcaldia}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--gr)' }}>${p.precio_desde?.toLocaleString('es-MX')}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 'var(--rp)', background: p.publicado ? '#DCFCE7' : '#FEE2E2', color: p.publicado ? '#15803D' : '#DC2626' }}>{p.publicado ? 'Publicado' : 'No publicado'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 'var(--rp)', background: ps.bg, color: ps.color }}>{p.estado_publicacion}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{p.vistas_count || 0}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {p.estado_publicacion === 'en_revision' && (
                        <>
                          <button onClick={() => updateProject(p.id, { estado_publicacion: 'publicado', publicado: true, published_at: new Date().toISOString() })} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', background: '#DCFCE7', color: '#15803D', border: 'none', cursor: 'pointer' }}>✓ Aprobar</button>
                          <button onClick={() => { const motivo = prompt('Motivo de rechazo:'); if (motivo) updateProject(p.id, { estado_publicacion: 'rechazado', rechazo_motivo: motivo }) }} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer' }}>✕ Rechazar</button>
                        </>
                      )}
                      {p.publicado && !p.destacado && (
                        <button onClick={() => updateProject(p.id, { destacado: true })} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', background: '#FEF9C3', color: '#A16207', border: 'none', cursor: 'pointer' }}>⭐ Destacar</button>
                      )}
                      {p.destacado && (
                        <button onClick={() => updateProject(p.id, { destacado: false })} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', background: 'var(--bg2)', color: 'var(--mid)', border: 'none', cursor: 'pointer' }}>Quitar ⭐</button>
                      )}
                      {p.publicado && (
                        <button onClick={() => updateProject(p.id, { publicado: false, estado_publicacion: 'borrador' })} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', background: 'var(--bg2)', color: 'var(--mid)', border: 'none', cursor: 'pointer' }}>Despublicar</button>
                      )}
                      <a href={`/presentacion/${p.id}`} target="_blank" style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', background: 'var(--bg2)', color: 'var(--dk)', textDecoration: 'none' }}>👁️ Ver</a>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>No hay proyectos con estos filtros</div>}
      </div>
    </div>
  )
}
