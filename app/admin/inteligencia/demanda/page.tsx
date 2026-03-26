'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DemandaPage() {
  const [gaps, setGaps] = useState<any[]>([])
  const [searchStats, setSearchStats] = useState<{total:number,con_resultados:number,sin_resultados:number,tasa_match:number}>({ total: 0, con_resultados: 0, sin_resultados: 0, tasa_match: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const [fuenteStats, setFuenteStats] = useState<{fuente:string,count:number,gaps:number}[]>([])
  const [recentQueries, setRecentQueries] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: unmet }, { data: searches }, { data: demand }] = await Promise.all([
        supabase.from('unmet_demand').select('*').order('busquedas_count', { ascending: false }).limit(20),
        supabase.from('search_logs').select('had_results'),
        supabase.from('demand_queries').select('*').order('created_at', { ascending: false }).limit(200),
      ])

      const totalSearches = (searches || []).length
      const conRes = (searches || []).filter((s: any) => s.had_results).length
      const sinRes = totalSearches - conRes
      setSearchStats({ total: totalSearches, con_resultados: conRes, sin_resultados: sinRes, tasa_match: totalSearches > 0 ? Math.round(conRes / totalSearches * 100) : 0 })
      setGaps((unmet || []) as any[])

      // Stats por fuente
      const fMap: Record<string, {count:number,gaps:number}> = {}
      ;(demand || []).forEach((d: any) => {
        const f = d.fuente || 'desconocido'
        if (!fMap[f]) fMap[f] = {count:0,gaps:0}
        fMap[f].count++
        if (d.gap_detected) fMap[f].gaps++
      })
      setFuenteStats(Object.entries(fMap).map(([fuente,v]) => ({fuente,...v})).sort((a,b) => b.count - a.count))

      // Queries recientes con gaps
      setRecentQueries(((demand || []) as any[]).filter((d: any) => d.gap_detected).slice(0, 10))

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando demanda...</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>🔍 Demanda vs oferta</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Gaps de mercado — qué buscan que no existe</div>
      </div>

      {/* KPIs de búsqueda */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { l: 'Búsquedas totales', v: searchStats.total, icon: '🔍' },
          { l: 'Con resultados', v: searchStats.con_resultados, icon: '✅' },
          { l: 'Sin resultados', v: searchStats.sin_resultados, icon: '❌' },
          { l: 'Tasa de match', v: `${searchStats.tasa_match}%`, icon: '🎯' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '18px' }}>
            <span style={{ fontSize: '14px' }}>{k.icon}</span>
            <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', margin: '6px 0 2px' }}>{k.v}</div>
            <div style={{ fontSize: '11px', color: 'var(--mid)' }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Gaps */}
      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '4px' }}>Demanda no atendida</div>
        <div style={{ fontSize: '11px', color: 'var(--mid)', marginBottom: '14px' }}>Búsquedas que no encontraron proyectos. Cada fila es una oportunidad de mercado.</div>
        {gaps.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--mid)', padding: '30px' }}>Los gaps se detectan automáticamente cuando usuarios buscan sin encontrar resultados</div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {gaps.map((g: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg2)', borderRadius: 'var(--rs)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dk)' }}>{g.alcaldia}{g.colonia ? ` · ${g.colonia}` : ''}</div>
                  <div style={{ fontSize: '11px', color: 'var(--mid)' }}>
                    {g.recamaras ? `${g.recamaras} rec. · ` : ''}Hasta ${g.precio_max ? `$${(g.precio_max / 1e6).toFixed(1)}M` : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#A16207' }}>{g.busquedas_count}</div>
                  <div style={{ fontSize: '9px', color: 'var(--mid)' }}>búsquedas</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FUENTES DE DEMANDA */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginTop:'20px'}}>
        <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>📡 Fuentes de demanda</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'10px'}}>
          {fuenteStats.map((f,i) => (
            <div key={i} style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:'18px',fontWeight:700,color:'var(--dk)'}}>{f.count}</div>
              <div style={{fontSize:'11px',color:'var(--mid)',marginTop:'2px'}}>{f.fuente}</div>
              <div style={{fontSize:'10px',color:f.gaps>0?'#DC2626':'var(--dim)',marginTop:'2px'}}>{f.gaps} gaps</div>
            </div>
          ))}
          {fuenteStats.length === 0 && <div style={{fontSize:'12px',color:'var(--mid)',padding:'10px'}}>Sin datos de fuentes aún</div>}
        </div>
      </div>

      {/* GAPS RECIENTES DETALLADOS */}
      {recentQueries.length > 0 && (
        <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'20px',marginTop:'20px'}}>
          <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>🔴 Gaps recientes detallados</div>
          <div style={{display:'grid',gap:'8px'}}>
            {recentQueries.map((q: any,i: number) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#FEF2F2',borderRadius:'var(--rs)',border:'1px solid #FECACA'}}>
                <div>
                  <div style={{fontSize:'12px',fontWeight:500,color:'#DC2626'}}>{q.gap_detail || 'Sin detalle'}</div>
                  <div style={{fontSize:'10px',color:'var(--mid)',marginTop:'2px'}}>
                    Fuente: {q.fuente} · {q.query_raw ? `"${q.query_raw.slice(0,50)}${q.query_raw.length>50?'...':''}"` : 'Sin texto'}
                    {q.best_match_score > 0 && ` · Mejor match: ${q.best_match_score}%`}
                  </div>
                </div>
                <div style={{fontSize:'10px',color:'var(--dim)',flexShrink:0}}>{new Date(q.created_at).toLocaleDateString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
