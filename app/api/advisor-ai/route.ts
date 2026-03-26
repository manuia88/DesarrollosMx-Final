import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, asesor_id } = body

    if (!message) return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })

    // Paso 1: Usar Claude para extraer parámetros del mensaje natural
    const extractionResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CLAUDE_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: `Extrae los parámetros de búsqueda inmobiliaria de este mensaje. Responde SOLO con JSON, sin backticks ni explicación:
{"alcaldia":"string o null","colonia":"string o null","recamaras":number o null,"banos":number o null,"precio_min":number o null,"precio_max":number o null,"m2_min":number o null,"m2_max":number o null,"amenidades":["string"] o null,"tipo_consulta":"busqueda|comparacion|inversion|general"}

Mensaje: "${message}"` }],
      }),
    })

    if (!extractionResponse.ok) {
      return NextResponse.json({ error: 'Error al procesar mensaje' }, { status: 500 })
    }

    const extractionData = await extractionResponse.json()
    const extractedText = extractionData.content?.[0]?.text || '{}'
    let params: Record<string, unknown>
    try {
      params = JSON.parse(extractedText.replace(/```json|```/g, '').trim())
    } catch {
      params = {}
    }

    // Paso 2: Buscar en la base de datos
    const supabase = await createClient()
    const { data: matches } = await supabase.rpc('match_demand_query', {
      p_alcaldia: (params.alcaldia as string) || null,
      p_colonia: (params.colonia as string) || null,
      p_recamaras: (params.recamaras as number) || null,
      p_banos: (params.banos as number) || null,
      p_precio_min: (params.precio_min as number) || null,
      p_precio_max: (params.precio_max as number) || null,
      p_m2_min: (params.m2_min as number) || null,
      p_m2_max: (params.m2_max as number) || null,
    })

    const results = (matches || []) as { project_nombre: string; unit_id_display: string; precio: number; m2_privados: number; recamaras: number; banos: number; alcaldia: string; colonia: string; match_score: number }[]

    // Registrar la consulta
    await supabase.from('demand_queries').insert({
      asesor_id: asesor_id || null,
      fuente: 'whatsapp',
      query_raw: message,
      alcaldia: (params.alcaldia as string) || null,
      colonia: (params.colonia as string) || null,
      recamaras_min: (params.recamaras as number) || null,
      precio_min: (params.precio_min as number) || null,
      precio_max: (params.precio_max as number) || null,
      m2_min: (params.m2_min as number) || null,
      results_count: results.length,
      best_match_score: results.length > 0 ? results[0].match_score : 0,
      gap_detected: results.filter(r => r.match_score >= 80).length === 0,
    })

    // Paso 3: Generar respuesta con Claude
    const exactMatches = results.filter(r => r.match_score >= 80)
    const closeMatches = results.filter(r => r.match_score >= 50 && r.match_score < 80)

    const responsePrompt = exactMatches.length > 0
      ? `Eres un asesor inmobiliario experto en CDMX. El asesor buscó: "${message}". Encontré estos matches exactos:\n${exactMatches.slice(0,5).map(m => `- ${m.project_nombre}, Unidad ${m.unit_id_display}: ${m.recamaras} rec, ${m.banos} baños, ${m.m2_privados}m², $${m.precio.toLocaleString()} en ${m.colonia}, ${m.alcaldia} (match ${m.match_score}%)`).join('\n')}\n\nResponde de forma concisa y profesional para WhatsApp. Máximo 500 caracteres. Incluye precios y ubicación.`
      : closeMatches.length > 0
        ? `Eres un asesor inmobiliario experto en CDMX. El asesor buscó: "${message}". No encontré matches exactos pero hay opciones cercanas:\n${closeMatches.slice(0,3).map(m => `- ${m.project_nombre}, ${m.recamaras} rec, ${m.m2_privados}m², $${m.precio.toLocaleString()} en ${m.colonia} (match ${m.match_score}%)`).join('\n')}\n\nResponde para WhatsApp sugiriendo estas alternativas. Explica brevemente por qué son cercanas. Máximo 500 caracteres.`
        : `Eres un asesor inmobiliario experto en CDMX. El asesor buscó: "${message}". No encontré resultados. Responde para WhatsApp indicando que no hay disponibilidad actual pero que registramos la búsqueda y le avisaremos cuando aparezca algo. Máximo 300 caracteres.`

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.CLAUDE_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: responsePrompt }],
      }),
    })

    const aiData = await aiResponse.json()
    const responseText = aiData.content?.[0]?.text || 'No pude procesar tu consulta. Intenta con más detalles.'

    return NextResponse.json({
      message: responseText,
      params_extracted: params,
      matches: { exact: exactMatches.length, close: closeMatches.length, total: results.length },
      gap_detected: exactMatches.length === 0,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
