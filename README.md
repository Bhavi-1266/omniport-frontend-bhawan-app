# Bhawan_app

> Omniport app frontend

## Bulk resident registration

Admins can register many students at once from **Bulk Register Students** (`/bhawan_app/bulk_registration`).
The page takes a CSV file, checks every row in the browser, and lists exactly what is wrong in each row before anything is sent.

### CSV format

- The first row holds the column headers, and every following row is one student.
- **Enrollment No**, **Name**, **Bhawan Code** and **Room No** are required.
- Seat, Branch Code, Current Semester, Fee Type, Admission Date, Date of Birth, Email, Mobile No, Address and parents' names and contacts are optional.
- Header case, spacing and column order do not matter, and unknown columns are ignored with a warning.
- Dates are written as DD/MM/YYYY.
- In Excel, save the sheet with File > Save As > CSV UTF-8 (Comma delimited).

The page shows the full column guide, the valid bhawan codes and fee types, and a downloadable template.
The columns are defined in `src/components/bulk_register/residents-csv.js`, and the headers also match the aliases of the admin import script.

### Checks done in the browser

- Enrollment No is exactly 8 digits and appears only once in the file.
- Bhawan Code and Branch Code exist in the kernel, using the `hostels` and `branches` lists from the constants API.
- Room No is at most 10 characters.
- Current Semester is a whole number of 1 or more, Fee Type is a known fee type, dates are real dates, and Email looks like an email address.

Run `npx babel-node --presets @babel/preset-env apps/bhawan_app/src/components/bulk_register/residents-csv.check.js` from the `omniport` folder to verify these checks.

### Backend API

The backend endpoint is not built yet, so `src/actions/bulk-register.js` sends the request through a dummy axios adapter that answers like the real endpoint would.
Remove the `adapter` option once the endpoint exists.

The page first sends a dry run, and only after a dry run with no skipped rows can the admin confirm the real run.

`POST /api/bhawan_app/<hostel>/resident/bulk_register/`

```json
{
  "dry_run": true,
  "rows": [
    {
      "row_number": 2,
      "enrolment_number": "26114001",
      "full_name": "Aarav Sharma",
      "hostel_code": "rjb",
      "room_no": "A-101",
      "seat": "A",
      "branch_code": "CSE",
      "current_semester": "",
      "fee_type": "liv",
      "admission_date": "2026-07-20",
      "dob": "",
      "email": "",
      "mobile_no": "9876543210",
      "address": "12, MG Road, Jaipur",
      "father_name": "",
      "father_contact": "",
      "mother_name": "",
      "mother_contact": ""
    }
  ]
}
```

Row keys are the canonical keys of the admin import script, dates are sent as YYYY-MM-DD, and empty optional values are sent as empty strings.

```json
{
  "dry_run": true,
  "summary": { "created": 1, "updated": 0, "existing": 0, "skipped": 0 },
  "rows": [
    {
      "row_number": 2,
      "enrolment_number": "26114001",
      "action": "would_create",
      "status": "dry_run",
      "message": "No database changes were made"
    }
  ]
}
```

`action` and `status` use the values of the import script report, and a row with `"status": "error"` is shown to the admin as a problem in that row.
Errors for the whole request should return a 4xx status with a `detail` message, which the page shows in a toast.
