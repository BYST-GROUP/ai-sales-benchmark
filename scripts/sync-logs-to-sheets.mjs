/**
 * sync-logs-to-sheets.mjs
 *
 * Reads new lines from logs/sessions.jsonl (using a byte-offset cursor)
 * and appends them as rows to a Google Sheet.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_PATH  — path to service account JSON key file
 *   GOOGLE_SHEETS_ID             — the spreadsheet ID (from the URL)
 *   GOOGLE_SHEET_TAB             — sheet/tab name (default: "Sessions")
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { google } from 'googleapis'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const LOG_FILE = path.join(ROOT, 'logs', 'sessions.jsonl')
const CURSOR_FILE = path.join(ROOT, 'logs', '.sync-cursor')

const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB ?? 'Sessions'

const HEADERS = [
  'timestamp',
  'sessionId',
  'event',
  'domain',
  'questionId',
  'question',
  'answer',
  'scores',
  'totalScore',
  'maturityLabel',
  'pillar1Score',
  'pillar2Score',
  'pillar3Score',
  'allAnswers',
  'companyName',
  'productType',
  'gtmMotion',
  'customerSegment',
  'estimatedACV',
  'estimatedAECount',
  'buyerPersona',
  'fundingStage',
  'enrichmentMessage',
]

function flattenEntry(entry) {
  const e = entry.event ?? ''
  const profile = entry.profile ?? {}

  return [
    entry.timestamp ?? '',
    entry.sessionId ?? '',
    e,
    entry.domain ?? '',
    entry.questionId ?? '',
    entry.question ?? '',
    entry.answer ?? '',
    entry.scores ? JSON.stringify(entry.scores) : '',
    entry.totalScore ?? '',
    entry.maturityLabel ?? '',
    entry.pillar1Score ?? '',
    entry.pillar2Score ?? '',
    entry.pillar3Score ?? '',
    entry.answers ? JSON.stringify(entry.answers) : '',
    profile.display_name ?? '',
    profile.product_type ?? '',
    profile.gtm_motion ?? '',
    profile.customer_segment ?? '',
    profile.estimated_acv ?? '',
    profile.estimated_ae_count ?? '',
    profile.buyer_persona ?? '',
    profile.funding_stage ?? '',
    entry.enrichment_message ?? '',
  ]
}

async function getOrCreateHeaderRow(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!1:1`,
  })
  const existing = res.data.values?.[0]
  if (!existing || existing.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_TAB}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    })
    console.log('Header row written.')
  }
}

async function main() {
  if (!SERVICE_ACCOUNT_PATH || !SPREADSHEET_ID) {
    console.error('Missing required env vars: GOOGLE_SERVICE_ACCOUNT_PATH, GOOGLE_SHEETS_ID')
    process.exit(1)
  }

  if (!fs.existsSync(LOG_FILE)) {
    console.log('No log file found — nothing to sync.')
    return
  }

  // Read cursor (byte offset)
  let cursor = 0
  if (fs.existsSync(CURSOR_FILE)) {
    const raw = fs.readFileSync(CURSOR_FILE, 'utf8').trim()
    cursor = parseInt(raw, 10) || 0
  }

  const stats = fs.statSync(LOG_FILE)
  if (cursor >= stats.size) {
    console.log('No new entries since last sync.')
    return
  }

  // Read only the new bytes
  const fd = fs.openSync(LOG_FILE, 'r')
  const bufSize = stats.size - cursor
  const buf = Buffer.alloc(bufSize)
  fs.readSync(fd, buf, 0, bufSize, cursor)
  fs.closeSync(fd)

  const newContent = buf.toString('utf8')
  const lines = newContent.split('\n').filter(l => l.trim().length > 0)

  if (lines.length === 0) {
    console.log('No new lines to sync.')
    fs.writeFileSync(CURSOR_FILE, String(stats.size))
    return
  }

  const rows = []
  for (const line of lines) {
    try {
      const entry = JSON.parse(line)
      rows.push(flattenEntry(entry))
    } catch {
      console.warn('Skipping unparseable line:', line.slice(0, 80))
    }
  }

  if (rows.length === 0) {
    console.log('No valid rows to append.')
    fs.writeFileSync(CURSOR_FILE, String(stats.size))
    return
  }

  // Authenticate with Google
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  // Ensure header row exists
  await getOrCreateHeaderRow(sheets)

  // Append rows
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_TAB}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  })

  // Update cursor
  fs.writeFileSync(CURSOR_FILE, String(stats.size))

  console.log(`Synced ${rows.length} row(s) to "${SHEET_TAB}".`)
}

main().catch(err => {
  console.error('Sync failed:', err.message)
  process.exit(1)
})
