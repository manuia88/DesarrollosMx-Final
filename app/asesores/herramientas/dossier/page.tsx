'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  nombre: string
  tipo: string
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
  plusvalia_pct: number
  comision_pct: number
  amenidades: string[]
  descripcion: string
}

interface Folder {
  id: string
  nombre: string
  presupuesto_max: number
  zona_preferida: string
  recamaras_min: number
  temperatura: string
}

export default function DossierPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([])
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [asesorName, setAsesorName] = useState('')
  const [asesorPhone, setAsesorPhone] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [step, setStep] = useState(1)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('id, name, whatsapp').eq('user_id', user.id).single()
      if (profile) { setAsesorName(profile.name); setAsesorPhone(profile.whatsapp || '') }
      const { data: asesorProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
      const [{ data: p }, { data: f }] = await Promise.all([
        supabase.from('projects').select('*').eq('publicado', true).order('destacado', { ascending: false }),
        asesorProfile ? supabase.from('client_folders').select('*').eq('asesor_id', asesorProfile.id) : { data: [] },
      ])
      setProjects((p as Project[]) || [])
      setFolders((f as Folder[]) || [])
    }
    load()
  }, [])

  function toggleProject(p: Project) {
    if (selectedProjects.find(x => x.id === p.id)) {
      setSelectedProjects(prev => prev.filter(x => x.id !== p.id))
    } else if (selectedProjects.length < 5) {
      setSelectedProjects(prev => [...prev, p])
    }
  }

  async function generateDossier() {
    if (selectedProjects.length === 0) return
    setGenerating(true)
    setGeneratedText('')

    const prompt = `Eres un asesor inmobiliario profesional en CDMX llamado ${asesorName}. 
Genera un dossier profesional en español para presentar a ${selectedFolder?.nombre || 'un cliente potencial'}.

${selectedFolder ? `Perfil del cliente:
- Nombre: ${selectedFolder.nombre}
- Presupuesto máximo: $${selectedFolder.presupuesto_max?.toLocaleString('es-MX')} MXN
- Zona preferida: ${selectedFolder.zona_preferida || 'CDMX'}
- Recámaras mínimas: ${selectedFolder.recamaras_min}` : ''}

Proyectos a presentar:
${selectedProjects.map((p, i) => `
${i+1}. ${p.nombre}
   - Ubicación: ${p.colonia}, ${p.alcaldia}
   - Estado: ${p.estado}
   - Precio desde: $${p.precio_desde.toLocaleString('es-MX')} MXN
   - M²: ${p.m2_min}-${p.m2_max} m²
   - Recámaras: ${p.recamaras_min}-${p.recamaras_max}
   - Entrega: ${p.entrega_quarter || ''} ${p.entrega_year || ''}
   - Plusvalía anual: ${p.plusvalia_pct}%
   - Amenidades: ${p.amenidades?.slice(0,5).join(', ')}
   - Descripción: ${p.descripcion?.slice(0,200) || ''}
`).join('')}

Genera un dossier ejecutivo con:
1. Saludo personalizado al cliente
2. Resumen de por qué estos proyectos encajan con su perfil
3. Para cada proyecto: puntos clave de venta, análisis de inversión, plan de pagos estimado
4. Comparativa rápida entre los proyectos
5. Recomendación del asesor sobre cuál es la mejor opción y por qué
6. Llamada a la acción para agendar una visita

Usa un tono profesional pero cercano. Incluye números concretos. El dossier debe ser conciso pero completo.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await response.json()
      const text = data.content?.[0]?.text || 'Error generando el dossier. Intenta de nuevo.'
      setGeneratedText(text)
      setStep(3)
    } catch {
      setGeneratedText('Error de conexión. Verifica tu conexión a internet.')
    }
    setGenerating(false)
  }

  function copyDossier() {
    navigator.clipboard.writeText(generatedText)
    alert('Dossier copiado al portapapeles')
  }

  function sendWhatsApp() {
    if (!selectedFolder?.nombre) return
    const text = encodeURIComponent(`Hola ${selectedFolder.nombre}, te comparto el análisis de los proyectos que seleccioné para ti:\n\n${generatedText}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const gradients = ['linear-gradient(145deg,#0d2318,#1a5c3a)','linear-gradient(145deg,#0e1e2e,#1a3d5a)','linear-gradient(145deg,#1e0d0d,#4a1818)','linear-gradient(145deg,#121020,#2a2060)','linear-gradient(145deg,#1a1208,#5a3a10)']

  return (
    <div style={{maxWidth:'800px'}}>
      <div style={{marginBottom:'24px'}}>
        <div style={{fontSize:'22px',fontWeight:600,color:'var(--dk)',marginBottom:'4px'}}>🤖 Dossier IA</div>
        <div style={{fontSize:'13px',color:'var(--mid)'}}>Genera un análisis personalizado para tu cliente con inteligencia artificial</div>
      </div>

      {/* PASOS */}
      <div style={{display:'flex',gap:'0',marginBottom:'24px',background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',overflow:'hidden'}}>
        {[
          {n:1,l:'Seleccionar proyectos'},
          {n:2,l:'Configurar dossier'},
          {n:3,l:'Dossier generado'},
        ].map((s,i) => (
          <div key={s.n} style={{flex:1,padding:'12px 16px',textAlign:'center',background: step === s.n ? 'var(--dk)' : step > s.n ? 'var(--gr-bg)' : 'transparent',borderRight: i < 2 ? '1px solid var(--bd)' : 'none'}}>
            <div style={{fontSize:'12px',fontWeight:500,color: step === s.n ? '#fff' : step > s.n ? 'var(--gr)' : 'var(--mid)'}}>
              {step > s.n ? '✓ ' : `${s.n}. `}{s.l}
            </div>
          </div>
        ))}
      </div>

      {/* PASO 1 — SELECCIONAR PROYECTOS */}
      {step === 1 && (
        <div>
          <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>
            Selecciona de 1 a 5 proyectos ({selectedProjects.length}/5)
          </div>
          <div style={{display:'grid',gap:'8px',marginBottom:'20px'}}>
            {projects.map((p,i) => {
              const isSelected = selectedProjects.find(x => x.id === p.id)
              return (
                <div
                  key={p.id}
                  onClick={() => toggleProject(p)}
                  style={{display:'flex',gap:'12px',alignItems:'center',padding:'12px 14px',borderRadius:'var(--rs)',cursor:'pointer',border: isSelected ? '2px solid var(--dk)' : '1px solid var(--bd)',background: isSelected ? 'var(--bg2)' : 'var(--wh)',transition:'all .15s'}}
                >
                  <div style={{width:'36px',height:'36px',borderRadius:'var(--rs)',background:gradients[i%gradients.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>🏙️</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>{p.nombre}</div>
                    <div style={{fontSize:'11px',color:'var(--mid)'}}>{p.colonia}, {p.alcaldia} · ${p.precio_desde.toLocaleString('es-MX')}</div>
                  </div>
                  <div style={{width:'20px',height:'20px',borderRadius:'50%',border: isSelected ? 'none' : '2px solid var(--bd)',background: isSelected ? 'var(--dk)' : 'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {isSelected && <span style={{color:'#fff',fontSize:'11px',fontWeight:700}}>✓</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={selectedProjects.length === 0}
            style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 24px',cursor:'pointer',opacity:selectedProjects.length===0?0.5:1}}
          >Siguiente → Configurar</button>
        </div>
      )}

      {/* PASO 2 — CONFIGURAR */}
      {step === 2 && (
        <div>
          <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)',marginBottom:'14px'}}>Configurar el dossier</div>

          {/* PROYECTOS SELECCIONADOS */}
          <div style={{background:'var(--bg2)',borderRadius:'var(--rs)',padding:'12px',marginBottom:'16px'}}>
            <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'8px'}}>Proyectos seleccionados:</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {selectedProjects.map(p => (
                <span key={p.id} style={{fontSize:'11px',background:'var(--dk)',color:'#fff',padding:'3px 10px',borderRadius:'var(--rp)'}}>{p.nombre.split('·')[0].trim()}</span>
              ))}
            </div>
          </div>

          {/* CLIENTE */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'12px'}}>Cliente (opcional)</div>
            {folders.length > 0 ? (
              <div style={{display:'grid',gap:'6px'}}>
                <div onClick={() => setSelectedFolder(null)} style={{padding:'10px 12px',borderRadius:'var(--rs)',cursor:'pointer',border: !selectedFolder ? '2px solid var(--dk)' : '1px solid var(--bd)',background: !selectedFolder ? 'var(--bg2)' : 'var(--wh)',fontSize:'12px',color:'var(--mid)'}}>
                  Sin cliente específico
                </div>
                {folders.map(f => (
                  <div key={f.id} onClick={() => setSelectedFolder(f)} style={{padding:'10px 12px',borderRadius:'var(--rs)',cursor:'pointer',border: selectedFolder?.id===f.id ? '2px solid var(--dk)' : '1px solid var(--bd)',background: selectedFolder?.id===f.id ? 'var(--bg2)' : 'var(--wh)'}}>
                    <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)'}}>{f.nombre}</div>
                    {f.presupuesto_max && <div style={{fontSize:'11px',color:'var(--mid)'}}>Hasta ${(f.presupuesto_max/1e6).toFixed(1)}M · {f.zona_preferida || 'CDMX'}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{fontSize:'12px',color:'var(--mid)'}}>No tienes clientes registrados. <a href="/asesores/clientes" style={{color:'var(--gr2)'}}>Crear cliente →</a></div>
            )}
          </div>

          {/* DATOS DEL ASESOR */}
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'16px',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:500,color:'var(--dk)',marginBottom:'12px'}}>Tus datos (aparecen en el dossier)</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'4px'}}>Nombre</div>
                <input value={asesorName} onChange={e => setAsesorName(e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:'var(--rs)',border:'1px solid var(--bd)',fontSize:'12px',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box' as const}} />
              </div>
              <div>
                <div style={{fontSize:'11px',color:'var(--mid)',marginBottom:'4px'}}>WhatsApp</div>
                <input value={asesorPhone} onChange={e => setAsesorPhone(e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:'var(--rs)',border:'1px solid var(--bd)',fontSize:'12px',fontFamily:'var(--sans)',outline:'none',boxSizing:'border-box' as const}} />
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:'10px'}}>
            <button onClick={() => setStep(1)} style={{fontFamily:'var(--sans)',fontSize:'13px',background:'transparent',color:'var(--mid)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'10px 20px',cursor:'pointer'}}>← Volver</button>
            <button
              onClick={generateDossier}
              disabled={generating}
              style={{fontFamily:'var(--sans)',fontSize:'13px',background:'var(--dk)',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'10px 24px',cursor:'pointer',opacity:generating?0.7:1,display:'flex',alignItems:'center',gap:'8px'}}
            >
              {generating ? '⏳ Generando con IA...' : '🤖 Generar dossier'}
            </button>
          </div>
        </div>
      )}

      {/* PASO 3 — RESULTADO */}
      {step === 3 && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
            <div style={{fontSize:'14px',fontWeight:500,color:'var(--dk)'}}>✅ Dossier generado</div>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => { setStep(1); setGeneratedText(''); setSelectedProjects([]); setSelectedFolder(null) }} style={{fontFamily:'var(--sans)',fontSize:'12px',background:'transparent',color:'var(--mid)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'7px 14px',cursor:'pointer'}}>
                🔄 Nuevo dossier
              </button>
              <button onClick={copyDossier} style={{fontFamily:'var(--sans)',fontSize:'12px',background:'var(--bg2)',color:'var(--dk)',border:'1px solid var(--bd)',borderRadius:'var(--rp)',padding:'7px 14px',cursor:'pointer'}}>
                📋 Copiar texto
              </button>
              {selectedFolder?.nombre && (
                <button onClick={sendWhatsApp} style={{fontFamily:'var(--sans)',fontSize:'12px',background:'#25D366',color:'#fff',border:'none',borderRadius:'var(--rp)',padding:'7px 14px',cursor:'pointer'}}>
                  💬 Enviar por WhatsApp
                </button>
              )}
            </div>
          </div>
          <div style={{background:'var(--wh)',borderRadius:'var(--r)',border:'1px solid var(--bd)',padding:'24px',whiteSpace:'pre-wrap',fontSize:'13px',lineHeight:1.8,color:'var(--dk)',maxHeight:'600px',overflowY:'auto'}}>
            {generatedText}
          </div>
        </div>
      )}
    </div>
  )
}
