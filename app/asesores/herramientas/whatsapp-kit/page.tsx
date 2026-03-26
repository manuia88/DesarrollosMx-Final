'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Template {
  id: string
  nombre: string
  categoria: string
  contenido: string
  variables: string[]
  usos_count: number
  es_global: boolean
}

const CATEGORIA_LABELS: Record<string,string> = {
  'primer_contacto':'Primer contacto',
  'envio_ficha':'Envío de ficha',
  'seguimiento_visita':'Seguimiento post-visita',
  'urgencia':'Urgencia / Sold out',
  'bajada_precio':'Bajada de precio',
  'recordatorio_cita':'Recordatorio de cita',
  'cierre':'Cierre',
  'recuperacion_frio':'Recuperación cliente frío',
}

export default function WhatsAppKitPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [vars, setVars] = useState<Record<string,string>>({})
  const [previewId, setPreviewId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('whatsapp_templates').select('*').order('categoria').order('usos_count', { ascending: false })
      .then(({ data }) => { setTemplates((data as Template[]) || []); setLoading(false) })
  }, [])

  function getPreview(template: Template): string {
    let text = template.contenido
    ;(template.variables || []).forEach(v => {
      const key = v.replace(/[{}]/g, '')
      text = text.replace(v, vars[key] || v)
    })
    return text
  }

  async function copyTemplate(t: Template) {
    const text = getPreview(t)
    await navigator.clipboard.writeText(text)
    setCopiedId(t.id)
    setTimeout(() => setCopiedId(null), 2000)
    await supabase.from('whatsapp_templates').update({ usos_count: (t.usos_count || 0) + 1 }).eq('id', t.id)
    setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, usos_count: x.usos_count + 1 } : x))
  }

  function openWhatsApp(t: Template) {
    const text = encodeURIComponent(getPreview(t))
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const categorias = ['all', ...Object.keys(CATEGORIA_LABELS)]
  const filtered = templates.filter(t => categoriaActiva === 'all' || t.categoria === categoriaActiva)

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'var(--mid)'}}>Cargando templates...</div>

  return (
    <div>
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>💬 WhatsApp Kit</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Templates listos para usar · Personaliza las variables y copia con un click</div>
      </div>

      {/* VARIABLES GLOBALES */}
      <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px',marginBottom:'20px'}}>
        <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'10px'}}>Variables rápidas</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
          {[
            {key:'nombre',placeholder:'Nombre del cliente'},
            {key:'proyecto',placeholder:'Nombre del proyecto'},
            {key:'precio',placeholder:'Precio (ej: $6,500,000)'},
            {key:'colonia',placeholder:'Colonia'},
            {key:'unidades',placeholder:'Unidades disponibles'},
            {key:'dias',placeholder:'Días estimados'},
            {key:'fecha',placeholder:'Fecha de visita'},
            {key:'hora',placeholder:'Hora de visita'},
            {key:'link',placeholder:'Link del proyecto'},
          ].map(v => (
            <div key={v.key}>
              <div style={{fontSize:'10px',color:'var(--mid)',marginBottom:'3px',fontFamily:'monospace'}}>{`{${v.key}}`}</div>
              <input
                value={vars[v.key] || ''}
                onChange={e => setVars(p => ({...p,[v.key]:e.target.value}))}
                placeholder={v.placeholder}
                style={{width:'100%',padding:'6px 10px',borderRadius:'var(--rs)',border:'1px solid var(--bd)',fontSize:'12px',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box'}}
              />
            </div>
          ))}
        </div>
      </div>

      {/* FILTRO POR CATEGORÍA */}
      <div style={{display:'flex',gap:'6px',marginBottom:'16px',flexWrap:'wrap'}}>
        {categorias.map(c => (
          <button key={c} onClick={() => setCategoriaActiva(c)} style={{fontFamily:'var(--sans)',fontSize:'11px',padding:'5px 12px',borderRadius:'var(--rp)',border:categoriaActiva===c?'none':'1px solid var(--bd)',background:categoriaActiva===c?'var(--dk)':'var(--wh)',color:categoriaActiva===c?'#fff':'var(--mid)',cursor:'pointer',whiteSpace:'nowrap'}}>
            {c === 'all' ? 'Todos' : CATEGORIA_LABELS[c] || c}
          </button>
        ))}
      </div>

      {/* TEMPLATES */}
      <div style={{display:'grid',gap:'12px'}}>
        {filtered.map(t => {
          const preview = getPreview(t)
          const isPreview = previewId === t.id
          return (
            <div key={t.id} style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',overflow:'hidden'}}>
              <div style={{padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'12px'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>{t.nombre}</span>
                    <span style={{fontSize:'10px',fontWeight:500,padding:'2px 7px',borderRadius:'var(--rp)',background:'var(--bg2)',color:'var(--mid)'}}>{CATEGORIA_LABELS[t.categoria] || t.categoria}</span>
                    {t.usos_count > 0 && <span style={{fontSize:'10px',color:'var(--dim)'}}>Usado {t.usos_count} veces</span>}
                  </div>
                  <div style={{fontSize:'12px',color:'var(--mid)',lineHeight:1.6,fontStyle: isPreview ? 'normal' : 'italic'}}>
                    {isPreview ? preview : t.contenido}
                  </div>
                  {t.variables?.length > 0 && (
                    <div style={{display:'flex',gap:'4px',marginTop:'6px',flexWrap:'wrap'}}>
                      {t.variables.map(v => (
                        <span key={v} style={{fontSize:'9px',fontFamily:'monospace',background:'var(--am-bg)',color:'var(--am)',padding:'1px 6px',borderRadius:'3px'}}>{v}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                  <button onClick={() => setPreviewId(isPreview ? null : t.id)} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'var(--bg2)',color:'var(--mid)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'5px 10px',cursor:'pointer'}}>
                    {isPreview ? 'Original' : '👁 Preview'}
                  </button>
                  <button onClick={() => copyTemplate(t)} style={{fontFamily:'var(--sans)',fontSize:'11px',background: copiedId===t.id ? 'var(--gr)' : 'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'5px 12px',cursor:'pointer'}}>
                    {copiedId===t.id ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                  <button onClick={() => openWhatsApp(t)} style={{fontFamily:'var(--sans)',fontSize:'11px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'5px 12px',cursor:'pointer'}}>
                    💬
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
