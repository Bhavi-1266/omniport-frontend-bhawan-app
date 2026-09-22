// Run from the omniport folder: npx babel-node --presets @babel/preset-env apps/bhawan_app/src/components/bulk_register/residents-csv.check.js
import assert from 'assert'

import { TEMPLATE_CSV, checkResidentsCsv, parseCsv } from './residents-csv'

const lists = {
  feeTypes: { liv: 'LIVING', nlv: 'NOT LIVING', nd: 'NON DINING', inl: 'INTERNATIONAL' }
}
const HEADER = 'Enrollment_NO,Room_No'

assert.deepStrictEqual(
  parseCsv('a,"b, c","say ""hi""","x\ny"\r\n1,2'),
  [['a', 'b, c', 'say "hi"', 'x\ny'], ['1', '2']]
)

assert.deepStrictEqual(checkResidentsCsv('a,"b', lists).fileErrors, ['A quote (") is opened but never closed.'])
assert.deepStrictEqual(checkResidentsCsv('', lists).fileErrors, ['The first row must contain the column headers.'])
assert.deepStrictEqual(checkResidentsCsv(`${HEADER}\n,\n`, lists).fileErrors, ['The file has column headers but no student rows.'])
assert.deepStrictEqual(
  checkResidentsCsv('Enrollment No,Name,Bhawan_Name,Seat,seat\n26114001,A,rjb,A,B', lists),
  {
    fileErrors: ['Column "Seat" appears more than once.', 'Required column "Room_No" is missing.'],
    ignoredHeaders: ['Name', 'Bhawan_Name'],
    rows: []
  }
)

const template = checkResidentsCsv(`${TEMPLATE_CSV}21114002,A-101\r\n`, lists)
assert.deepStrictEqual([template.fileErrors, template.ignoredHeaders, template.rows[0].errors], [[], [], []])

const clean = checkResidentsCsv(
  '\uFEFFenrollment no.,Room No,SEAT,Fee Type,Admission Date,Name\n' +
  '2611 4001.0,A-101,B,not living,5/7/2026, Aarav  Sharma ',
  lists
)
assert.deepStrictEqual([clean.ignoredHeaders, clean.rows[0].errors], [['Name'], []])
assert.deepStrictEqual(
  [clean.rows[0].rowNumber, clean.rows[0].data],
  [2, {
    enrolment_number: '26114001',
    room_no: 'A-101',
    seat: 'B',
    fee_type: 'nlv',
    admission_date: '2026-07-05',
    mobile_no: '',
    address: '',
    father_name: '',
    father_contact: '',
    mother_name: '',
    mother_contact: ''
  }]
)

// Strict "D/M/YYYY" rejects zero-padded dates from moment 2.30 on.
assert.strictEqual(
  checkResidentsCsv(`${HEADER},Admission_Date\n26114001,A-1,20/07/2026`, lists).rows[0].data.admission_date,
  '2026-07-20'
)

const bad = checkResidentsCsv([
  `${HEADER},Seat,Fee_Type,Admission_Date,Mobile_No`,
  '2611400,A-101-B-2-XL,,HALF,31/02/2026,+91 98765 43210 1',
  '',
  '26114001,A-1010,B-12,,,',
  '26114001,A-1,B,,,',
  ',A-101,B,,,',
  '26114002,A-101,B,,,'
].join('\r\n'), lists)
assert.deepStrictEqual(bad.rows.map((row) => [row.rowNumber, row.errors]), [
  [2, [
    'Enrollment_NO "2611400" must be exactly 8 digits.',
    'Room_No "A-101-B-2-XL" is longer than 10 characters.',
    'Mobile_No "+91 98765 43210 1" is longer than 15 characters.',
    'Fee_Type "HALF" must be one of LIVING, NOT LIVING, NON DINING, INTERNATIONAL.',
    'Admission_Date "31/02/2026" is not a valid DD/MM/YYYY date.'
  ]],
  [4, ['Room_No and Seat are stored as "A-1010-B-12", which is longer than 10 characters.']],
  [5, ['Enrollment_NO "26114001" is repeated from row 4.']],
  [6, ['Enrollment_NO is empty.']],
  [7, []]
])

console.log('residents-csv checks passed')
