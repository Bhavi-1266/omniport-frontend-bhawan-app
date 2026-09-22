# Bhawan_app

> Omniport app frontend

## Bulk resident registration

Admins can register many students at once from **Bulk Register Students** (`/bhawan_app/bulk_registration`).
The page takes a CSV file, checks every row in the browser, and lists exactly what is wrong in each row before anything is sent.

### CSV format

- The first row holds the column headers, and every following row is one student.
- **Enrollment_NO**, **Name**, **Bhawan_Name** and **Room_No** are required.
- Seat, Branch_Code, Current_Semester, Fee_Type, Admission_Date, Date_Of_Birth, Email, Mobile_No, Address, Fathers_Name, Fathers_Contact, Mothers_Name and Mothers_Contact are optional.
- Bhawan_Name takes either the bhawan name (`Rajendra bhawan`) or its code (`rjb`).
- Headers are matched ignoring case, spaces and underscores, so `Room No` also works.
- Column order does not matter, and unknown columns are ignored with a warning.
- Dates are written as DD/MM/YYYY.
- In Excel, save the sheet with File > Save As > CSV UTF-8 (Comma delimited).

The page shows the full column guide, the valid bhawans and fee types, and a downloadable template.
The columns are defined in `src/components/bulk_register/residents-csv.js`.

### Checks done in the browser

- Enrollment_NO is exactly 8 digits and appears only once in the file.
- Bhawan_Name and Branch_Code exist in the kernel, using the `hostels` and `branches` lists from the constants API.
- Room_No is at most 10 characters.
- Current_Semester is a whole number of 1 or more, Fee_Type is a known fee type, dates are real dates, and Email looks like an email address.

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

Row keys are the canonical keys of the admin import script, and `hostel_code` is always the bhawan code even when the sheet used the name.
Dates are sent as YYYY-MM-DD, and empty optional values are sent as empty strings.

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
