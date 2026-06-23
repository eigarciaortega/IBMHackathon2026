import readExcelFile from 'read-excel-file/browser'
import writeExcelFile from 'write-excel-file/browser'

const SPACE_COLUMNS = [
  'id',
  'name',
  'type',
  'capacity',
  'floor',
  'location',
  'has_projector',
  'has_ac',
  'has_videoconference',
  'active',
]

const BOOKING_COLUMNS = [
  'id',
  'space_id',
  'space_name',
  'user_email',
  'user_name',
  'title',
  'booking_date',
  'start_time',
  'end_time',
  'attendees',
  'status',
]

function formatStamp() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('')
}

function cellValue(value) {
  if (value === undefined || value === null) return null
  return value
}

function sheetRows(rows, columns) {
  return [
    columns.map((column) => ({ value: column, fontWeight: 'bold', backgroundColor: '#e0e0e0' })),
    ...(rows || []).map((row) => columns.map((column) => cellValue(row?.[column]))),
  ]
}

function escapeCsv(value) {
  const text = value === undefined || value === null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportOfficeDataFile(data, format) {
  const stamp = formatStamp()
  const spaces = data?.spaces || []
  const bookings = data?.bookings || []

  if (format === 'csv') {
    const header = ['record_type', ...new Set([...SPACE_COLUMNS, ...BOOKING_COLUMNS])]
    const rows = [
      header,
      ...spaces.map((row) =>
        header.map((column) => (column === 'record_type' ? 'space' : row[column])),
      ),
      ...bookings.map((row) =>
        header.map((column) => (column === 'record_type' ? 'booking' : row[column])),
      ),
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
    downloadBlob(
      new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
      `officespace-export-${stamp}.csv`,
    )
    return
  }

  const blob = await writeExcelFile([
    {
      sheet: 'Espacios',
      data: sheetRows(spaces, SPACE_COLUMNS),
      columns: SPACE_COLUMNS.map(() => ({ width: 18 })),
    },
    {
      sheet: 'Reservas',
      data: sheetRows(bookings, BOOKING_COLUMNS),
      columns: BOOKING_COLUMNS.map(() => ({ width: 20 })),
    },
  ]).toBlob()

  downloadBlob(blob, `officespace-export-${stamp}.xlsx`)
}

function normalizedKey(key) {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function readValue(row, aliases) {
  const lookup = Object.entries(row || {}).reduce((acc, [key, value]) => {
    acc[normalizedKey(key)] = value
    return acc
  }, {})
  for (const alias of aliases) {
    const key = normalizedKey(alias)
    if (Object.prototype.hasOwnProperty.call(lookup, key)) return lookup[key]
  }
  return undefined
}

function isEmptyRow(row) {
  return Object.values(row || {}).every(
    (value) => value === undefined || value === null || value === '',
  )
}

function rowsToObjects(rows) {
  const [header = [], ...body] = rows || []
  const keys = header.map((cell, index) => String(cell || `column_${index + 1}`).trim())
  return body
    .map((row) =>
      keys.reduce((acc, key, index) => {
        acc[key] = row[index] ?? ''
        return acc
      }, {}),
    )
    .filter((row) => !isEmptyRow(row))
}

function pickSheet(sheets, names) {
  const normalized = sheets.reduce((acc, sheet) => {
    acc[normalizedKey(sheet.sheet)] = sheet
    return acc
  }, {})
  for (const name of names) {
    const match = normalized[normalizedKey(name)]
    if (match) return match
  }
  return null
}

function splitRows(rows) {
  const spaces = []
  const bookings = []

  rows.forEach((row) => {
    const recordType = String(readValue(row, ['record_type', 'tipo_registro', 'registro']) || '')
      .trim()
      .toLowerCase()
    const keys = Object.keys(row).map(normalizedKey)
    const looksLikeBooking = keys.some((key) =>
      ['booking_date', 'fecha', 'start_time', 'hora_inicio', 'end_time', 'hora_fin'].includes(key),
    )
    const looksLikeSpace = keys.some((key) =>
      ['capacity', 'capacidad', 'floor', 'piso', 'has_projector', 'proyector'].includes(key),
    )

    const explicitBooking = recordType.includes('booking') || recordType.includes('reserva')
    const explicitSpace = recordType.includes('space') || recordType.includes('espacio')

    if (explicitBooking) {
      bookings.push(row)
    } else if (explicitSpace) {
      spaces.push(row)
    } else if (looksLikeBooking) {
      bookings.push(row)
    } else if (looksLikeSpace) {
      spaces.push(row)
    }
  })

  return { spaces, bookings }
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((csvRow) => csvRow.some((value) => String(value).trim() !== ''))
}

async function parseCsvFile(file) {
  const text = (await file.text()).replace(/^\uFEFF/, '')
  return splitRows(rowsToObjects(parseCsv(text)))
}

export async function parseOfficeDataFile(file) {
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
    return parseCsvFile(file)
  }

  const sheets = await readExcelFile(file)
  const spacesSheet = pickSheet(sheets, ['Espacios', 'Spaces'])
  const bookingsSheet = pickSheet(sheets, ['Reservas', 'Bookings'])

  if (spacesSheet || bookingsSheet) {
    return {
      spaces: spacesSheet ? rowsToObjects(spacesSheet.data) : [],
      bookings: bookingsSheet ? rowsToObjects(bookingsSheet.data) : [],
    }
  }

  return splitRows(rowsToObjects(sheets[0]?.data || []))
}
