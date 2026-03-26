'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  nombre: string
  estado: string
  estado_publicacion: string
  precio_desde: number
  colonia: string
  alcaldia: string
  total_unidades: number
  publicado: boolean
  created_at: string
}

interface Stats {
  totalProyectos: number
  proyectosPublicados: number
  proyectosBorrador: number
  proyectosRevision: number
  totalUnidades: number
  unidadesDisponibles: number
  unidadesVendidas: number
  unidadesReservadas: number
  totalLeads: number
  leadsNuevos: number
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Stats>({
    totalProyectos:0, proyectosPublicados:0, proyectosBorrador:0,
    proyectosRevision:0, totalUnidades:0, unidadesDisponibles:0,
    unidadesVendidas:0, unidadesReservadas:0, totalLeads:0, leadsNuevos:0
  })
  const [devId, setDevId] = useState<string | null>(null)
  const [devName, setDevName] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: dev } = await supabase
        .from('desarrolladoras')
        .select('id, nombre')
        .eq('user_id', user.id)
        .single()

      if (!dev) return
      setDevId(dev.id)
      setDevName(dev.nombre)

      const { data: projs } = await supabase
        .from('projects')
        .select('*')
        .eq('desarrolladora_id', dev.id)
        .order('created_at', { ascending: false })

      const projList = (projs as Project[]) || []
      setProjects(projList)

      const projIds = projList.map(p => p.id)

      let unidades: {estado: string}[] = []
      let leads: {estado: string}[] = []

      if (projIds.length > 0) {
        const { data: u } = await supabase
          .from('unidades')
          .select('estado')
          .in('project_id', projIds)
        unidades = u || []

        const { data: l } = await supabase
          .from('leads')
          .select('estado')
          .in('project_id', projIds)
        leads = l || []
      }

      setStats({
        totalProyectos: projList.length,
        proyectosPublicados: projList.filter(p => p.estado_publicacion === 'publicado').length,
        proyectosBorrador: projList.filter(p => p.estado_publicacion === 'borrador').length,
        proyectosRevision: projList.filter(p => p.estado_publicacion === 'en_revision').length,
        totalUnidades: unidades.length,
        unidadesDisponibles: unidades.filter(u => u.estado === 'disponible').length,
        unidadesVendidas: unidades.filter(u => u.estado === 'vendido').length,
        unidadesReservadas: unidades.filter(u => u.estado === 'reservado').length,
        totalLeads: leads.length,
        leadsNuevos: leads.filter(l => l.estado === 'Nuevo').length,
      })

      setLoading(false)
    }
    load()
  }, [])

  function getEstadoPubStyle(ep: string) {
    if (ep === 'publicado') return { bg: '#DCFCE7', color: '#15803D', label: 'Publicado' }
    if (ep === 'en_revision') return { bg: '#FEF9C3', color: '#A16207', label: 'En revisión' }
    if (ep === 'rechazado') return { bg: '#FEE2E2', color: '#DC2626', label: 'Rechazado' }
    return { bg: 'var(--bg2)', color: 'var(--mid)', label: 'Borrador' }
  }

  if (loading) return (
    <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando dashboard...</div>
  )

  const statCards = [
    { label:'Proyectos activos', value: stats.proyectosPublicados, icon:'🏗️', sub:`${stats.proyectosBorrador} en borrador · ${stats.proyectosRevision} en revisión` },
    { label:'Unidades disponibles', value: stats.unidadesDisponibles, icon:'🏠', sub:`${stats.unidadesVendidas} vendidas · ${stats.unidadesReservadas} reservadas` },
    { label:'Total leads', value: stats.totalLeads, icon:'👥', sub:`${stats.leadsNuevos} nuevos sin atender` },
    { label:'% Vendido', value: stats.totalUnidades > 0 ? Math.round(stats.unidadesVendidas/stats.totalUnidades*100)+'%' : '0%', icon:'📈', sub:`${stats.unidadesVendidas} de ${stats.totalUnidades} unidades` },
  ]

  return (
    <div>
      {/* HEADER */}
      <div style={{marginBottom:'28px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>
          Bienvenido, {devName}
        </div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>
          Resumen de tus proyectos y actividad reciente
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'28px'}}>
        {statCards.map((s,i) => (
          <div key={i} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
              <div style={{fontSize:'11px',color:'var(--mid)',fontWeight:500,textTransform:'uppercase',letterSpacing:'.06em'}}>{s.label}</div>
              <span style={{fontSize:'20px'}}>{s.icon}</span>
            </div>
            <div style={{fontSize:'28px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>{s.value}</div>
            <div style={{fontSize:'11px',color:'var(--dim)'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* CTA si no hay proyectos */}
      {projects.length === 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'2px dashed var(--bd)',padding:'48px',textAlign:'center',marginBottom:'28px'}}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}>🏗️</div>
          <div style={{fontSize:'18px',fontWeight:600,color:'var(--dk)',marginBottom:'8px'}}>
            Aún no tienes proyectos
          </div>
          <div style={{fontSize:'13px',color:'var(--mid)',marginBottom:'20px'}}>
            Crea tu primer proyecto y empieza a recibir leads de compradores y asesores
          </div>
          <a href="/desarrolladores/proyectos/nuevo" style={{
            display:'inline-flex',alignItems:'center',gap:'6px',
            background:'var(--dk)',color:'#fff',borderRadius:'var(--rp)',
            padding:'10px 24px',fontSize:'13px',fontWeight:500,textDecoration:'none'
          }}>➕ Crear primer proyecto</a>
        </div>
      )}

      {/* PROYECTOS RECIENTES */}
      {projects.length > 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',marginBottom:'28px'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>Mis proyectos</div>
            <a href="/desarrolladores/proyectos/nuevo" style={{
              display:'inline-flex',alignItems:'center',gap:'5px',
              background:'var(--dk)',color:'#fff',borderRadius:'var(--rp)',
              padding:'7px 16px',fontSize:'12px',textDecoration:'none'
            }}>➕ Nuevo proyecto</a>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'var(--bg2)'}}>
                {['Proyecto','Ubicación','Estado','Publicación','Unidades','Leads','Acciones'].map((h,i) => (
                  <th key={i} style={{padding:'10px 16px',textAlign:'left',fontSize:'11px',fontWeight:600,color:'var(--mid)',letterSpacing:'.04em',textTransform:'uppercase',borderBottom:'1px solid var(--bd)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p,idx) => {
                const epStyle = getEstadoPubStyle(p.estado_publicacion || 'borrador')
                return (
                  <tr key={p.id} style={{borderBottom:'1px solid var(--bd2)',background:idx%2===0?'transparent':'rgba(33,45,48,.015)'}}>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{fontWeight:500,color:'var(--dk)',marginBottom:'2px'}}>{p.nombre}</div>
                      <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.estado}</div>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'12px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:'var(--bg2)',color:'var(--mid)'}}>{p.estado}</span>
                    </td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:'10px',fontWeight:500,padding:'2px 8px',borderRadius:'var(--rp)',background:epStyle.bg,color:epStyle.color}}>{epStyle.label}</span>
                    </td>
                    <td style={{padding:'12px 16px',fontSize:'12px',color:'var(--mid)'}}>{p.total_unidades || '—'}</td>
                    <td style={{padding:'12px 16px',fontSize:'12px',color:'var(--mid)'}}>—</td>
                    <td style={{padding:'12px 16px'}}>
                      <div style={{display:'flex',gap:'6px'}}>
                        <a href={`/desarrolladores/proyectos/${p.id}`} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'5px 12px',cursor:'pointer',textDecoration:'none'}}>Editar</a>
                        <a href={`/desarrolladores/proyectos/${p.id}/unidades`} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'transparent',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'5px 12px',cursor:'pointer',textDecoration:'none'}}>Unidades</a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ALERTAS DE MERCADO */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',marginBottom:'28px'}}>
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--bd)'}}>
          <div style={{fontSize:'15px',fontWeight:500,color:'var(--dk)'}}>🔔 Alertas recientes</div>
        </div>
        <div style={{padding:'20px',color:'var(--mid)',fontSize:'13px',textAlign:'center'}}>
          Las alertas aparecerán aquí cuando haya actividad en tus proyectos
        </div>
      </div>
    </div>
  )
}
