import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('nombre, colonia, alcaldia, precio_desde, estado, desarrolladoras(nombre)')
    .eq('id', id)
    .single()

  if (!project) return { title: 'Proyecto no encontrado | DesarrollosMX' }

  const devName = Array.isArray(project.desarrolladoras) ? (project.desarrolladoras as any)[0]?.nombre : (project.desarrolladoras as any)?.nombre
  const title = `${project.nombre} — ${project.colonia}, ${project.alcaldia}`
  const description = `${devName ? devName + ' · ' : ''}${project.estado} · Desde $${(project.precio_desde/1e6).toFixed(1)}M MXN · ${project.colonia}, ${project.alcaldia}, CDMX`

  return {
    title,
    description,
    openGraph: {
      title: `${project.nombre} | DesarrollosMX`,
      description,
      type: 'website',
      locale: 'es_MX',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.nombre} | DesarrollosMX`,
      description,
    },
  }
}

export default function PresentacionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
