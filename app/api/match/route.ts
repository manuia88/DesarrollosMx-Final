import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { alcaldia, colonia, recamaras, banos, precio_min, precio_max, m2_min, m2_max, query_raw, fuente, asesor_id } = body

    const supabase = await createClient()

    // Llamar motor de matching
    const { data: matches, error } = await supabase.rpc('match_demand_query', {
      p_alcaldia: alcaldia || null,
      p_colonia: colonia || null,
      p_recamaras: recamaras ? parseInt(recamaras) : null,
      p_banos: banos ? parseInt(banos) : null,
      p_precio_min: precio_min ? parseFloat(precio_min) : null,
      p_precio_max: precio_max ? parseFloat(precio_max) : null,
      p_m2_min: m2_min ? parseFloat(m2_min) : null,
      p_m2_max: m2_max ? parseFloat(m2_max) : null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const results = (matches || []) as { match_score: number }[]
    const exactMatches = results.filter(m => m.match_score >= 80)
    const closeMatches = results.filter(m => m.match_score >= 50 && m.match_score < 80)
    const hasGap = exactMatches.length === 0

    // Registrar en demand_queries
    await supabase.from('demand_queries').insert({
      asesor_id: asesor_id || null,
      fuente: fuente || 'api',
      query_raw: query_raw || null,
      alcaldia: alcaldia || null,
      colonia: colonia || null,
      recamaras_min: recamaras ? parseInt(recamaras) : null,
      precio_min: precio_min ? parseFloat(precio_min) : null,
      precio_max: precio_max ? parseFloat(precio_max) : null,
      m2_min: m2_min ? parseFloat(m2_min) : null,
      m2_max: m2_max ? parseFloat(m2_max) : null,
      results_count: results.length,
      best_match_score: results.length > 0 ? results[0].match_score : 0,
      gap_detected: hasGap,
      gap_detail: hasGap ? `Sin match exacto: ${alcaldia || 'cualquier zona'}, ${recamaras || '?'} rec, hasta $${precio_max ? (parseFloat(precio_max)/1e6).toFixed(1)+'M' : '?'}` : null,
    })

    return NextResponse.json({
      total: results.length,
      exact_matches: exactMatches,
      close_matches: closeMatches,
      gap_detected: hasGap,
      gap_detail: hasGap ? `No hay matches exactos. ${closeMatches.length} opciones cercanas.` : null,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
