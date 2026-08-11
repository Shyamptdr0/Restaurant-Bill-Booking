import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Retry helper
async function withRetry(operation, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (
        error.message?.includes('Connect Timeout Error') || 
        error.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
        error.message?.includes('fetch failed')
      ) {
        if (attempt === maxRetries) throw error
        await new Promise(resolve => setTimeout(resolve, attempt * 500))
        continue
      }
      throw error
    }
  }
}

export async function GET() {
  try {
    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('tables')
        .select('id, name, section, status, created_at')
        .order('created_at', { ascending: false })
    })

    if (error) {
      console.error('Supabase tables error:', error)
      return NextResponse.json({ error: error.message, tables: [] }, { status: 500 })
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('GET /api/tables error:', error)
    return NextResponse.json({ error: error.message, tables: [] }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, section, status } = body

    if (!name || !section) {
      return NextResponse.json({ error: 'Name and section are required' }, { status: 400 })
    }

    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('tables')
        .insert([
          {
            name,
            section,
            status: status || 'blank',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()
    })

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('POST /api/tables error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
