import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, bio, zonas, especialidades')
    .eq('slug', slug)
    .eq('role', 'asesor')
    .single()

  if (!profile) return { title: 'Asesor no encontrado | DesarrollosMX' }

  const title = `${profile.name} — Asesor inmobiliario CDMX`
  const description = profile.bio || `${profile.name} · Asesor de vivienda nueva en CDMX${profile.zonas?.length ? ' · Zonas: ' + profile.zonas.join(', ') : ''}`

  return {
    title,
    description,
    openGraph: { title, description, type: 'profile', locale: 'es_MX' },
  }
}

export default function AsesorSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
