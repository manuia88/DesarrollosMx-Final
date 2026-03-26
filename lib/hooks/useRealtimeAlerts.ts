import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RealtimeAlert {
  id: string
  project_id: string
  tipo: string
  detalle: string
  dato_anterior: string
  dato_actual: string
  cambio_pct: number
  urgencia: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  leida: boolean
  created_at: string
}

export function useRealtimeAlerts(projectIds: string[]) {
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  const fetchAlerts = useCallback(async () => {
    if (projectIds.length === 0) return
    const { data } = await supabase
      .from('market_alerts')
      .select('*')
      .in('project_id', projectIds)
      .eq('leida', false)
      .order('created_at', { ascending: false })
      .limit(20)
    setAlerts((data as RealtimeAlert[]) || [])
    setUnreadCount((data || []).length)
  }, [projectIds.join(',')])

  useEffect(() => {
    if (projectIds.length === 0) return
    fetchAlerts()

    // Suscripción Realtime
    const channel = supabase
      .channel('market_alerts_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'market_alerts',
      }, (payload) => {
        const newAlert = payload.new as RealtimeAlert
        if (projectIds.includes(newAlert.project_id)) {
          setAlerts(prev => [newAlert, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectIds.join(',')])

  async function markAllRead() {
    if (projectIds.length === 0) return
    await supabase
      .from('market_alerts')
      .update({ leida: true })
      .in('project_id', projectIds)
      .eq('leida', false)
    setAlerts([])
    setUnreadCount(0)
  }

  async function markRead(alertId: string) {
    await supabase
      .from('market_alerts')
      .update({ leida: true })
      .eq('id', alertId)
    setAlerts(prev => prev.filter(a => a.id !== alertId))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return { alerts, unreadCount, markAllRead, markRead, refetch: fetchAlerts }
}
