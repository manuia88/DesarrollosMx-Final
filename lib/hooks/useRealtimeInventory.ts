import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface InventoryUpdate {
  project_id: string
  disponibles: number
  vendidas: number
  reservadas: number
  total: number
  absorcion_pct: number
  meses_sold_out: number
}

export function useRealtimeInventory(projectIds: string[]) {
  const [inventory, setInventory] = useState<Record<string, InventoryUpdate>>({})
  const supabase = createClient()

  async function fetchInventory() {
    if (projectIds.length === 0) return
    const { data } = await supabase
      .from('unidades')
      .select('project_id, estado')
      .in('project_id', projectIds)

    const map: Record<string, InventoryUpdate> = {}
    projectIds.forEach(id => {
      const uds = (data || []).filter(u => u.project_id === id)
      const disponibles = uds.filter(u => u.estado === 'disponible').length
      const vendidas = uds.filter(u => u.estado === 'vendido').length
      const reservadas = uds.filter(u => u.estado === 'reservado').length
      const total = uds.length || 1
      const absorcion_pct = Math.round(vendidas / total * 100)
      const meses_sold_out = absorcion_pct > 0
        ? Math.min(99, Math.round(disponibles / (vendidas / 4)))
        : 99
      map[id] = { project_id: id, disponibles, vendidas, reservadas, total, absorcion_pct, meses_sold_out }
    })
    setInventory(map)
  }

  useEffect(() => {
    if (projectIds.length === 0) return
    fetchInventory()

    const channel = supabase
      .channel('inventory_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'unidades',
      }, () => {
        // Refetch cuando cambia cualquier unidad
        fetchInventory()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectIds.join(',')])

  return { inventory, refetch: fetchInventory }
}
