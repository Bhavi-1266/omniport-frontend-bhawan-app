// Run from the omniport folder: npx babel-node --presets @babel/preset-env apps/bhawan_app/src/components/bulk_register/residents-csv.check.js
import assert from 'assert'

import { TEMPLATE_CSV, checkResidentsCsv, parseCsv } from './residents-csv'

const lists = {
  hostels: { rjb: 'Rajendra bhawan', rkb: 'Radhakrishnan bhawan' },
  branches: { CSE: 'Computer Science and Engineering' },
  feeTypes: { liv: 'LIVING', nlv: 'NOT LIVING', nd: 'NON DINING', inl: 'INTERNATIONAL' }
}
const HEADER = 'Enrollment No,Name,Bhawan Code,Room No'

assert.deepStrictEqual(
  parseCsv('a,"b, c","say ""hi""","x\ny"\r\n1,2'),
  [['a', 'b, c', 'say "hi"', 'x\ny'], ['1', '2']]
)

assert.deepStrictEqual(checkResidentsCsv('a,"b', lists).fileErrors, ['A quote (") is opened but never closed.'])
assert.deepStrictEqual(checkResidentsCsv('', lists).fileErrors, ['The first row must contain the column headers.'])
assert.deepStrictEqual(checkResidentsCsv(`${HEADER}\n,,,\n`, lists).fileErrors, ['The file has column headers but no student rows.'])
assert.deepStrictEqual(
  checkResidentsCsv('Enrollment No,Name,Room No,Bhawan,Name\n26114001,A,1,rjb,A', lists),
  {
    fileErrors: ['Column "Name" appears more than once.', 'Required column "Bhawan Code" is missing.'],
    ignoredHeaders: ['Bhawan'],
    rows: []
  }
)

const template = checkResidentsCsv(`${TEMPLATE_CSV}26114001,A,rjb,A-101\r\n`, lists)
assert.deepStrictEqual([template.fileErrors, template.rows[0].errors], [[], []])

const clean = checkResidentsCsv(
  '\uFEFFenrollment no.,NAME,Bhawan Code,Room No,Branch Code,Fee Type,Admission Date,Date of Birth\n' +
  '2611 4001.0, Aarav  Sharma ,RJB,A-101,cse,not living,5/7/2026,2008-03-14',
  lists
)
assert.deepStrictEqual(clean.rows[0].errors, [])
assert.deepStrictEqual(
  [clean.rows[0].rowNumber, clean.rows[0].data],
  [2, {
    enrolment_number: '26114001',
    full_name: 'Aarav Sharma',
    hostel_code: 'rjb',
    room_no: 'A-101',
    seat: '',
    branch_code: 'CSE',
    current_semester: '',
    fee_type: 'nlv',
    admission_date: '2026-07-05',
    dob: '2008-03-14',
    email: '',
    mobile_no: '',
    address: '',
    father_name: '',
    father_contact: '',
    mother_name: '',
    mother_contact: ''
  }]
)

const bad = checkResidentsCsv([
  `${HEADER},Branch Code,Current Semester,Fee Type,Admission Date,Email`,
  '2611400,,xyz,A-101-B-2-XL,ECE,0,HALF,31/02/2026,not-an-email',
  '',
  '26114001,A,rjb,A-1',
  '26114001,B,rkb,A-2'
].join('\r\n'), lists)
assert.deepStrictEqual(bad.rows.map((row) => [row.rowNumber, row.errors]), [
  [2, [
    'Name is empty.',
    'Enrollment No "2611400" must be exactly 8 digits.',
    'Bhawan Code "xyz" does not exist in the kernel.',
    'Room No "A-101-B-2-XL" is longer than 10 characters.',
    'Branch Code "ECE" does not exist in the kernel.',
    'Current Semester "0" must be a whole number of 1 or more.',
    'Fee Type "HALF" must be one of LIVING, NOT LIVING, NON DINING, INTERNATIONAL.',
    'Admission Date "31/02/2026" is not a valid DD/MM/YYYY date.',
    'Email "not-an-email" is not a valid email address.'
  ]],
  [4, []],
  [5, ['Enrollment No "26114001" is repeated from row 4.']]
])

console.log('residents-csv checks passed')
