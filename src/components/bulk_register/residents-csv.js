import moment from 'moment'

// Limits come from the kernel Student and bhawan Resident models.
const ENROLMENT_NUMBER_PATTERN = /^\d{8}$/
const ROOM_NO_MAX_LENGTH = 10
const DATE_FORMATS = ['D/M/YYYY', 'D-M-YYYY', 'YYYY-MM-DD']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Headers double as aliases of the admin import script, so one file works with both.
export const COLUMNS = [
  { header: 'Enrollment No', key: 'enrolment_number', required: true, example: '26114001', note: 'Exactly 8 digits' },
  { header: 'Name', key: 'full_name', required: true, example: 'Aarav Sharma', note: 'Full name of the student' },
  { header: 'Bhawan Code', key: 'hostel_code', required: true, example: 'rjb', note: 'One of the bhawan codes listed below' },
  { header: 'Room No', key: 'room_no', required: true, example: 'A-101', note: `At most ${ROOM_NO_MAX_LENGTH} characters` },
  { header: 'Seat', key: 'seat', example: 'B', note: 'Bed or seat within the room' },
  { header: 'Branch Code', key: 'branch_code', example: 'CSE', note: 'Needed for students who are not in the kernel yet' },
  { header: 'Current Semester', key: 'current_semester', example: '1', note: 'Whole number, 1 if left empty' },
  { header: 'Fee Type', key: 'fee_type', example: 'LIVING', note: 'One of the fee types listed below, LIVING if left empty' },
  { header: 'Admission Date', key: 'admission_date', example: '20/07/2026', note: 'DD/MM/YYYY', date: true },
  { header: 'Date of Birth', key: 'dob', example: '14/03/2008', note: 'DD/MM/YYYY', date: true },
  { header: 'Email', key: 'email', example: 'aarav_s@iitr.ac.in', note: '' },
  { header: 'Mobile No', key: 'mobile_no', example: '9876543210', note: '' },
  { header: 'Address', key: 'address', example: '12 MG Road, Jaipur', note: 'Home address for bhawan records' },
  { header: 'Fathers Name', key: 'father_name', example: 'Rakesh Sharma', note: '' },
  { header: 'Fathers Contact', key: 'father_contact', example: '9876500000', note: '' },
  { header: 'Mothers Name', key: 'mother_name', example: 'Sunita Sharma', note: '' },
  { header: 'Mothers Contact', key: 'mother_contact', example: '9876511111', note: '' }
]

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
  Object.keys(map).find((key) => String(map[key]).toLowerCase() === value.toLowerCase())

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
const checkRow = (data, { hostels, branches, feeTypes }) => {
  const errors = COLUMNS
    .filter((column) => column.required && !data[column.key])
    .map((column) => `${column.header} is empty.`)

  data.enrolment_number = cleanValue(data.enrolment_number.replace(/ /g, ''))
  if (data.enrolment_number && !ENROLMENT_NUMBER_PATTERN.test(data.enrolment_number)) {
    errors.push(`Enrollment No "${data.enrolment_number}" must be exactly 8 digits.`)
  }

  if (data.hostel_code) {
    const code = findKey(hostels, data.hostel_code)
    if (code) data.hostel_code = code
    else errors.push(`Bhawan Code "${data.hostel_code}" does not exist in the kernel.`)
  }

  if (data.room_no.length > ROOM_NO_MAX_LENGTH) {
    errors.push(`Room No "${data.room_no}" is longer than ${ROOM_NO_MAX_LENGTH} characters.`)
  }

  if (data.branch_code) {
    const code = findKey(branches, data.branch_code)
    if (code) data.branch_code = code
    else errors.push(`Branch Code "${data.branch_code}" does not exist in the kernel.`)
  }

  if (data.current_semester && !(/^\d+$/.test(data.current_semester) && Number(data.current_semester) >= 1)) {
    errors.push(`Current Semester "${data.current_semester}" must be a whole number of 1 or more.`)
  }

  if (data.fee_type) {
    const code = findKey(feeTypes, data.fee_type) || findKeyByLabel(feeTypes, data.fee_type)
    if (code) data.fee_type = code
    else errors.push(`Fee Type "${data.fee_type}" must be one of ${Object.values(feeTypes).join(', ')}.`)
  }

  COLUMNS.filter((column) => column.date).forEach(({ header, key }) => {
    if (!data[key]) return
    const date = moment(data[key], DATE_FORMATS, true)
    if (date.isValid()) data[key] = date.format('YYYY-MM-DD')
    else errors.push(`${header} "${data[key]}" is not a valid DD/MM/YYYY date.`)
  })

  if (data.email && !EMAIL_PATTERN.test(data.email)) {
    errors.push(`Email "${data.email}" is not a valid email address.`)
  }

  return errors
}

/**
 * Parses a residents CSV and checks every row against the kernel lists from the constants API.
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
      errors.push(`Enrollment No "${data.enrolment_number}" is repeated from row ${firstRow}.`)
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
