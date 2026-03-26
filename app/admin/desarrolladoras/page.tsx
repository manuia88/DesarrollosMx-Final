'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Dev {
  id: string
  nombre: string
  ciudad: string
  ano_fundacion: number
  proyectos_entregados: number
  unidades_vendidas: number
  verificacion_constitucion: boolean
  verificacion_antecedentes: boolean
  verificacion_profeco: boolean
  activa: boolean
  created_at: string
  score?: { score_total: number; churn_risk: string }
}

export default function AdminDesarrolladorasPage() {
  const [devs, setDevs] = useState<Dev[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('desarrolladoras').select('*').order('nombre')
    const { data: scores } = await supabase.from('developer_scores').select('desarrolladora_id, score_total, churn_risk')
    const scoreMap: Record<string, { score_total: number; churn_risk: string }> = {}
    ;(scores || []).forEach((s: { desarrolladora_id: string; score_total: number; churn_risk: string }) => { scoreMap[s.desarrolladora_id] = s })
    setDevs(((data || []) as Dev[]).map(d => ({ ...d, score: scoreMap[d.id] })))
    setLoading(false)
  }

  async function updateDev(id: string, updates: Record<string, unknown>) {
    const adminId = (await supabase.auth.getUser()).data.user?.id
    await supabase.from('desarrolladoras').update(updates).eq('id', id)
    await supabase.from('admin_actions').insert({ admin_id: adminId, action: 'update_dev', entity_type: 'desarrolladora', entity_id: id, detail: JSON.stringify(updates) })
    load()
  }

  const checks = (d: Dev) => [d.verificacion_constitucion, d.verificacion_antecedentes, d.verificacion_profeco].filter(Boolean).length

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando desarrolladoras...</div>

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>🏢 Gestión de desarrolladoras</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>{devs.length} desarrolladoras registradas</div>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {devs.map(d => (
          <div key={d.id} style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--dk)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', flexShrink: 0 }}>🏗️</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--dk)' }}>{d.nombre}</span>
                {!d.activa && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: 'var(--rp)', background: '#FEE2E2', color: '#DC2626' }}>Inactiva</span>}
                {d.score?.churn_risk === 'alto' && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: 'var(--rp)', background: '#FEE2E2', color: '#DC2626' }}>⚠️ Churn risk</span>}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--mid)', marginBottom: '6px' }}>
                {d.ciudad || 'CDMX'} · Desde {d.ano_fundacion} · {d.proyectos_entregados} proyectos · {d.unidades_vendidas} unidades
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => updateDev(d.id, { verificacion_constitucion: !d.verificacion_constitucion })} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', border: 'none', cursor: 'pointer', background: d.verificacion_constitucion ? '#DCFCE7' : '#FEE2E2', color: d.verificacion_constitucion ? '#15803D' : '#DC2626' }}>{d.verificacion_constitucion ? '✓' : '✕'} Constitución</button>
                <button onClick={() => updateDev(d.id, { verificacion_antecedentes: !d.verificacion_antecedentes })} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', border: 'none', cursor: 'pointer', background: d.verificacion_antecedentes ? '#DCFCE7' : '#FEE2E2', color: d.verificacion_antecedentes ? '#15803D' : '#DC2626' }}>{d.verificacion_antecedentes ? '✓' : '✕'} Antecedentes</button>
                <button onClick={() => updateDev(d.id, { verificacion_profeco: !d.verificacion_profeco })} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '3px 8px', borderRadius: 'var(--rp)', border: 'none', cursor: 'pointer', background: d.verificacion_profeco ? '#DCFCE7' : '#FEE2E2', color: d.verificacion_profeco ? '#15803D' : '#DC2626' }}>{d.verificacion_profeco ? '✓' : '✕'} PROFECO</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: (d.score?.score_total || 0) >= 7 ? '#15803D' : (d.score?.score_total || 0) >= 4 ? '#A16207' : '#DC2626' }}>{d.score?.score_total?.toFixed(1) || '—'}</div>
                <div style={{ fontSize: '9px', color: 'var(--mid)' }}>Score</div>
              </div>
              <div style={{ textAlign: 'center', background: checks(d) === 3 ? '#DCFCE7' : checks(d) >= 1 ? '#FEF9C3' : '#FEE2E2', padding: '6px 10px', borderRadius: 'var(--rs)' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: checks(d) === 3 ? '#15803D' : checks(d) >= 1 ? '#A16207' : '#DC2626' }}>{checks(d)}/3</div>
                <div style={{ fontSize: '9px', color: 'var(--mid)' }}>Verificaciones</div>
              </div>
              <button onClick={() => updateDev(d.id, { activa: !d.activa })} style={{ fontFamily: 'var(--sans)', fontSize: '10px', padding: '5px 12px', borderRadius: 'var(--rp)', border: 'none', cursor: 'pointer', background: d.activa ? '#FEE2E2' : '#DCFCE7', color: d.activa ? '#DC2626' : '#15803D' }}>{d.activa ? 'Desactivar' : 'Activar'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
