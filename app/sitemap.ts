import { createClient } from '@/lib/supabase/server'

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://desarrollosmx.io'
  const supabase = await createClient()

  // Páginas estáticas
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
  ]

  // Proyectos dinámicos
  const { data: projects } = await supabase
    .from('projects')
    .select('id, updated_at')
    .eq('publicado', true)

  const projectPages = (projects || []).map((p: { id: string; updated_at: string }) => ({
    url: `${baseUrl}/proyecto/${p.id}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Microsites de asesores
  const { data: asesores } = await supabase
    .from('profiles')
    .select('slug, created_at')
    .eq('role', 'asesor')
    .not('slug', 'is', null)

  const asesorPages = (asesores || []).map((a: { slug: string; created_at: string }) => ({
    url: `${baseUrl}/asesores/${a.slug}`,
    lastModified: new Date(a.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...projectPages, ...asesorPages]
}
