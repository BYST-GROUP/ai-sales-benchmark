import { NextRequest, NextResponse } from 'next/server'
import { appendLog } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await appendLog(body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[log] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
