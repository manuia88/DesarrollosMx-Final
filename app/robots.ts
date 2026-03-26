export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://desarrollosmx.com'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/desarrolladores/', '/cliente/'] },
      { userAgent: 'Googlebot', allow: '/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
