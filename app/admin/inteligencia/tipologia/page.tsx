'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TipologiaPage() {
  const [data, setData] = useState<{dimension:string,valor:string,total:number,vendidas:number,disponibles:number,absorcion:number}[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: unidades } = await supabase.from('unidades').select('recamaras, m2_privados, tipo_cajon, ubicacion, estado')
      if (!unidades) { setLoading(false); return }

      const dimensions: {dim:string,fn:(u:any)=>string}[] = [
        { dim: 'Recámaras', fn: u => `${u.recamaras} rec.` },
        { dim: 'Rango m²', fn: u => u.m2_privados < 70 ? '<70m²' : u.m2_privados < 100 ? '70-100m²' : u.m2_privados < 130 ? '100-130m²' : '>130m²' },
        { dim: 'Ubicación', fn: u => u.ubicacion || 'Sin dato' },
        { dim: 'Tipo cajón', fn: u => u.tipo_cajon || 'Sin dato' },
      ]

      const results: typeof data = []
      dimensions.forEach(({ dim, fn }) => {
        const groups: Record<string, { total: number, vendidas: number, disponibles: number }> = {}
        unidades.forEach((u: any) => {
          const val = fn(u)
          if (!groups[val]) groups[val] = { total: 0, vendidas: 0, disponibles: 0 }
          groups[val].total++
          if (u.estado === 'vendido') groups[val].vendidas++
          if (u.estado === 'disponible') groups[val].disponibles++
        })
        Object.entries(groups).forEach(([valor, g]) => {
          results.push({ dimension: dim, valor, total: g.total, vendidas: g.vendidas, disponibles: g.disponibles, absorcion: g.total > 0 ? Math.round(g.vendidas / g.total * 100) : 0 })
        })
      })
      setData(results)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando tipología...</div>

  const dimensions = [...new Set(data.map(d => d.dimension))]

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>🏆 Tipología ganadora</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>Qué tipo de unidades se venden más rápido</div>
      </div>

      {dimensions.map(dim => {
        const items = data.filter(d => d.dimension === dim).sort((a, b) => b.absorcion - a.absorcion)
        const maxAbs = items.length > 0 ? Math.max(items[0].absorcion, 1) : 1
        return (
          <div key={dim} style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dk)', marginBottom: '14px' }}>Por {dim}</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ width: '90px', fontSize: '12px', fontWeight: 500, color: 'var(--dk)', flexShrink: 0 }}>{item.valor}</div>
                <div style={{ flex: 1, background: 'var(--bg2)', borderRadius: 'var(--rp)', height: '20px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 'var(--rp)', width: `${(item.absorcion / maxAbs) * 100}%`, background: item.absorcion >= 50 ? '#15803D' : item.absorcion >= 25 ? '#F59E0B' : '#DC2626' }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dk)', minWidth: '40px', textAlign: 'right' }}>{item.absorcion}%</div>
                <div style={{ fontSize: '10px', color: 'var(--dim)', minWidth: '80px' }}>{item.vendidas}v / {item.total}</div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
