'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import HomeView from '@/components/HomeView'

interface Project {
  id: string
  nombre: string
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
  destacado: boolean
  fotos: { url: string; is_hero: boolean }[]
}

export default function HomePage() {
  const [view, setView] = useState('home')
  const [projects, setProjects] = useState<Project[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('projects')
      .select(`*, fotos (url, is_hero, orden)`)
      .eq('publicado', true)
      .order('destacado', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setProjects(data as Project[]) })
  }, [])

  function handleNavigate(v: string, id?: string) {
    setView(v)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <div style={{
        position:'fixed',bottom:'10px',left:'50%',transform:'translateX(-50%)',
        background:'rgba(33,45,48,.72)',color:'rgba(255,255,255,.6)',
        fontSize:'10px',padding:'4px 12px',borderRadius:'var(--rp)',
        pointerEvents:'none',zIndex:9999
      }}>
        DesarrollosMX v5 · Prototipo completo
      </div>
      <Navbar onNavigate={handleNavigate} />
      {view === 'home' && (
        <HomeView projects={projects} onNavigate={handleNavigate} />
      )}
      {view === 'explorar' && (
        <div style={{padding:'40px',fontFamily:'var(--sans)'}}>
          Vista Explorar — Fase 2
        </div>
      )}
      {view === 'detail' && (
        <div style={{padding:'40px',fontFamily:'var(--sans)'}}>
          Ficha de Proyecto — Fase 3
        </div>
      )}
    </>
  )
}
