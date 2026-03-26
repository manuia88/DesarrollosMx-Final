'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  user_id: string
  name: string
  email: string
  role: string
  whatsapp: string
  created_at: string
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroRole, setFiltroRole] = useState('all')
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers((data as User[]) || [])
    setLoading(false)
  }

  async function changeRole(userId: string, profileId: string, newRole: string) {
    const adminId = (await supabase.auth.getUser()).data.user?.id
    await supabase.from('profiles').update({ role: newRole }).eq('id', profileId)
    await supabase.from('admin_actions').insert({ admin_id: adminId, action: 'change_role', entity_type: 'user', entity_id: profileId, detail: `Cambio a ${newRole}` })
    load()
  }

  const filtered = users.filter(u => filtroRole === 'all' || u.role === filtroRole)
  const roleCounts = { all: users.length, asesor: users.filter(u => u.role === 'asesor').length, desarrollador: users.filter(u => u.role === 'desarrollador').length, superadmin: users.filter(u => u.role === 'superadmin').length, comprador: users.filter(u => !u.role || u.role === 'comprador').length }

  const roleStyle = (r: string) => {
    if (r === 'superadmin') return { bg: '#1B4332', color: '#fff' }
    if (r === 'asesor') return { bg: '#EBF0FA', color: '#1A4A9A' }
    if (r === 'desarrollador') return { bg: '#FEF9C3', color: '#A16207' }
    return { bg: 'var(--bg2)', color: 'var(--mid)' }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--mid)' }}>Cargando usuarios...</div>

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--dk)', marginBottom: '4px' }}>👤 Gestión de usuarios</div>
        <div style={{ fontSize: '13px', color: 'var(--mid)' }}>{users.length} usuarios registrados</div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
        {[['all', `Todos (${roleCounts.all})`], ['asesor', `Asesores (${roleCounts.asesor})`], ['desarrollador', `Desarrolladores (${roleCounts.desarrollador})`], ['superadmin', `Admins (${roleCounts.superadmin})`]].map(([v, l]) => (
          <button key={v} onClick={() => setFiltroRole(v)} style={{ fontFamily: 'var(--sans)', fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--rp)', border: filtroRole === v ? 'none' : '1px solid var(--bd)', background: filtroRole === v ? 'var(--dk)' : 'var(--wh)', color: filtroRole === v ? '#fff' : 'var(--mid)', cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      <div style={{ background: 'var(--wh)', borderRadius: 'var(--r)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['Nombre', 'Email', 'WhatsApp', 'Rol', 'Registro', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--mid)', borderBottom: '1px solid var(--bd)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const rs = roleStyle(u.role)
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--bd2)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--dk)' }}>{u.name || 'Sin nombre'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{u.email || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--mid)' }}>{u.whatsapp || '—'}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--rp)', background: rs.bg, color: rs.color }}>{u.role || 'comprador'}</span></td>
                  <td style={{ padding: '10px 12px', color: 'var(--dim)', fontSize: '11px' }}>{new Date(u.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <select value={u.role || 'comprador'} onChange={e => changeRole(u.user_id, u.id, e.target.value)} style={{ fontFamily: 'var(--sans)', fontSize: '11px', padding: '4px 8px', borderRadius: 'var(--rs)', border: '1px solid var(--bd)', cursor: 'pointer', outline: 'none' }}>
                      <option value="comprador">Comprador</option>
                      <option value="asesor">Asesor</option>
                      <option value="desarrollador">Desarrollador</option>
                      <option value="superadmin">SuperAdmin</option>
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
