import moment from 'moment'

// Limits match the kernel Student model and the backend bulk register serializer.
const ENROLMENT_NUMBER_PATTERN = /^\d{8}$/
const ROOM_NUMBER_MAX_LENGTH = 10
const CONTACT_MAX_LENGTH = 15
const NAME_MAX_LENGTH = 255
const DATE_FORMATS = ['D/M/YYYY', 'D-M-YYYY', 'YYYY-MM-DD']

// Headers match ignoring case, spaces and underscores, so "Room No" is read as Room_No.
export const COLUMNS = [
  { header: 'Enrollment_NO', key: 'enrolment_number', required: true, example: '21114002', note: 'Exactly 8 digits, and the student must already be on Channeli' },
  { header: 'Room_No', key: 'room_no', required: true, example: 'A-101', note: `With the seat, at most ${ROOM_NUMBER_MAX_LENGTH} characters` },
  { header: 'Seat', key: 'seat', example: 'B', note: 'Stored with the room, as A-101-B' },
  { header: 'Fee_Type', key: 'fee_type', example: 'LIVING', note: 'One of the fee types listed below, LIVING for a new resident if left empty' },
  { header: 'Admission_Date', key: 'admission_date', example: '20/07/2026', note: 'DD/MM/YYYY', date: true },
  { header: 'Mobile_No', key: 'mobile_no', example: '9876543210', note: `At most ${CONTACT_MAX_LENGTH} characters`, maxLength: CONTACT_MAX_LENGTH },
  { header: 'Address', key: 'address', example: '12 MG Road, Jaipur', note: 'Home address for bhawan records' },
  { header: 'Fathers_Name', key: 'father_name', example: 'Rakesh Sharma', note: '', maxLength: NAME_MAX_LENGTH },
  { header: 'Fathers_Contact', key: 'father_contact', example: '9876500000', note: `At most ${CONTACT_MAX_LENGTH} characters`, maxLength: CONTACT_MAX_LENGTH },
  { header: 'Mothers_Name', key: 'mother_name', example: 'Sunita Sharma', note: '', maxLength: NAME_MAX_LENGTH },
  { header: 'Mothers_Contact', key: 'mother_contact', example: '9876511111', note: `At most ${CONTACT_MAX_LENGTH} characters`, maxLength: CONTACT_MAX_LENGTH }
]

const headerOf = (key) => COLUMNS.find((column) => column.key === key).header

export const TEMPLATE_CSV = `${COLUMNS.map((column) => column.header).join(',')}\r\n`

const normalizeHeader = (header) => header.toLowerCase().replace(/[^a-z0-9]/g, '')

// Mirrors the import script: collapse whitespace (\s covers no-break spaces) and undo Excel's "123.0".
const cleanValue = (value = '') => {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return /^\d+\.0+$/.test(cleaned) ? cleaned.split('.')[0] : cleaned
}

const findKey = (map, value) =>
  Object.keys(map).find((key) => key.toLowerCase() === value.toLowerCase())

const findKeyByLabel = (map, value) =>
  Object.keys(map).find((key) => String(map[key]).trim().toLowerCase() === value.toLowerCase())

// RFC 4180: quoted fields may hold commas, line breaks and "" as an escaped quote.
export const parseCsv = (text) => {
  const records = [[]]
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',' || char === '\n') {
      records[records.length - 1].push(field)
      field = ''
      if (char === '\n') records.push([])
    } else if (char !== '\r') {
      field += char
    }
  }
  if (quoted) throw new Error('A quote (") is opened but never closed.')
  records[records.length - 1].push(field)
  return records
}

const readHeaders = (headerRecord) => {
  const columnsByHeader = {}
  COLUMNS.forEach((column) => { columnsByHeader[normalizeHeader(column.header)] = column })

  const indexByKey = {}
  const fileErrors = []
  const ignoredHeaders = []
  headerRecord.forEach((rawHeader, index) => {
    const header = cleanValue(rawHeader)
    if (!header) return
    const column = columnsByHeader[normalizeHeader(header)]
    if (!column) {
      ignoredHeaders.push(header)
    } else if (column.key in indexByKey) {
      fileErrors.push(`Column "${column.header}" appears more than once.`)
    } else {
      indexByKey[column.key] = index
    }
  })
  COLUMNS
    .filter((column) => column.required && !(column.key in indexByKey))
    .forEach((column) => fileErrors.push(`Required column "${column.header}" is missing.`))
  return { indexByKey, fileErrors, ignoredHeaders }
}

// Rewrites data to the canonical values the API expects and returns what is wrong with it.
const checkRow = (data, { feeTypes }) => {
  const errors = COLUMNS
    .filter((column) => column.required && !data[column.key])
    .map((column) => `${column.header} is empty.`)

  data.enrolment_number = cleanValue(data.enrolment_number.replace(/ /g, ''))
  if (data.enrolment_number && !ENROLMENT_NUMBER_PATTERN.test(data.enrolment_number)) {
    errors.push(`${headerOf('enrolment_number')} "${data.enrolment_number}" must be exactly 8 digits.`)
  }

  // The backend stores room and seat as one "room-seat" value.
  const roomNumber = [data.room_no, data.seat].filter(Boolean).join('-')
  if (roomNumber.length > ROOM_NUMBER_MAX_LENGTH) {
    errors.push(data.seat
      ? `${headerOf('room_no')} and ${headerOf('seat')} are stored as "${roomNumber}", which is longer than ${ROOM_NUMBER_MAX_LENGTH} characters.`
      : `${headerOf('room_no')} "${roomNumber}" is longer than ${ROOM_NUMBER_MAX_LENGTH} characters.`)
  }

  COLUMNS.filter((column) => column.maxLength && data[column.key].length > column.maxLength).forEach(({ header, key, maxLength }) => {
    errors.push(`${header} "${data[key]}" is longer than ${maxLength} characters.`)
  })

  if (data.fee_type) {
    const code = findKey(feeTypes, data.fee_type) || findKeyByLabel(feeTypes, data.fee_type)
    if (code) data.fee_type = code
    else errors.push(`${headerOf('fee_type')} "${data.fee_type}" must be one of ${Object.values(feeTypes).join(', ')}.`)
  }

  COLUMNS.filter((column) => column.date).forEach(({ header, key }) => {
    if (!data[key]) return
    const date = moment(data[key], DATE_FORMATS, true)
    if (date.isValid()) data[key] = date.format('YYYY-MM-DD')
    else errors.push(`${header} "${data[key]}" is not a valid DD/MM/YYYY date.`)
  })

  return errors
}

/**
 * Parses a residents CSV and checks every row against the fee types from the constants API.
 * Row numbers match the spreadsheet, so row 2 is the first student.
 */
export const checkResidentsCsv = (text, lists) => {
  let records
  try {
    records = parseCsv(text.replace(/^\uFEFF/, ''))
  } catch (error) {
    return { fileErrors: [error.message], ignoredHeaders: [], rows: [] }
  }

  if (records[0].every((value) => !cleanValue(value))) {
    return { fileErrors: ['The first row must contain the column headers.'], ignoredHeaders: [], rows: [] }
  }
  const { indexByKey, fileErrors, ignoredHeaders } = readHeaders(records[0])
  if (fileErrors.length > 0) return { fileErrors, ignoredHeaders, rows: [] }

  const rowNumberByEnrolment = {}
  const rows = []
  records.slice(1).forEach((record, index) => {
    if (record.every((value) => !cleanValue(value))) return
    const rowNumber = index + 2
    const data = {}
    COLUMNS.forEach(({ key }) => { data[key] = cleanValue(record[indexByKey[key]]) })

    const errors = checkRow(data, lists)
    const firstRow = rowNumberByEnrolment[data.enrolment_number]
    if (data.enrolment_number && firstRow) {
      errors.push(`${headerOf('enrolment_number')} "${data.enrolment_number}" is repeated from row ${firstRow}.`)
    } else if (data.enrolment_number) {
      rowNumberByEnrolment[data.enrolment_number] = rowNumber
    }
    rows.push({ rowNumber, data, errors })
  })

  if (rows.length === 0) {
    return { fileErrors: ['The file has column headers but no student rows.'], ignoredHeaders, rows: [] }
  }
  return { fileErrors: [], ignoredHeaders, rows }
}
