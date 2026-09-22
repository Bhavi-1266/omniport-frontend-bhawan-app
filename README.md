# Bhawan_app

> Omniport app frontend

## Bulk resident registration

Wardens, supervisors and global admins can register many students at once from **Bulk Register Students** (`/bhawan_app/bulk_registration`).
The page takes a CSV file, checks every row in the browser, and lists exactly what is wrong in each row before anything is sent.
Students are registered into the bhawan picked in the navbar, so the CSV has no bhawan column.
Only students who are already on Channeli can be registered.

### CSV format

- The first row holds the column headers, and every following row is one student.
- **Enrollment_NO** and **Room_No** are required.
- Seat, Fee_Type, Admission_Date, Mobile_No, Address, Fathers_Name, Fathers_Contact, Mothers_Name and Mothers_Contact are optional.
- Room_No and Seat are stored together as `A-101-B`, which must fit in 10 characters.
- An empty cell keeps what is already stored for that student, and a new resident without a Fee_Type is LIVING.
- Headers are matched ignoring case, spaces and underscores, so `Room No` also works.
- Column order does not matter, and other columns, such as Name, are ignored with a warning.
- Dates are written as DD/MM/YYYY.
- In Excel, save the sheet with File > Save As > CSV UTF-8 (Comma delimited).

The page shows the full column guide, the valid fee types, and a downloadable template.
The columns are defined in `src/components/bulk_register/residents-csv.js`.

### Checks done in the browser

- Enrollment_NO is exactly 8 digits and appears only once in the file.
- Room_No and Seat together are at most 10 characters, contacts at most 15 and parent names at most 255.
- Fee_Type is a known fee type and Admission_Date is a real date.

A file with any of these problems cannot be sent until it is fixed.
Run `npx babel-node --presets @babel/preset-env apps/bhawan_app/src/components/bulk_register/residents-csv.check.js` from the `omniport` folder to verify these checks.

### Backend API

The page first sends a dry run and shows what would happen to each row.
The server skips rows it cannot register, most often students who are not on Channeli yet, and gives the reason for each.
**Confirm and register** then sends the real run, which registers every other row and skips the same rows.
Students who are not on Channeli go through the registration service or the admin import script instead.

`POST /api/bhawan_app/<hostel>/resident/bulk_register/`

```json
{
  "dry_run": true,
  "rows": [
    {
      "row_number": 2,
      "hostel_code": "rjb",
      "enrolment_number": "21114002",
      "room_no": "A-101",
      "seat": "A",
      "fee_type": "liv",
      "admission_date": "2026-07-20",
      "mobile_no": "9876543210",
      "address": "12 MG Road, Jaipur",
      "father_name": "Rakesh Patel",
      "father_contact": "9876500000",
      "mother_name": "Sunita Patel",
      "mother_contact": "9876511111"
    }
  ]
}
```

`hostel_code` is the active bhawan, the same as `<hostel>` in the URL, on every row.
Dates are sent as YYYY-MM-DD, and empty optional values are sent as empty strings, which the backend treats as not given.
Only `"dry_run": false` writes to the database.

```json
{
  "dry_run": true,
  "summary": { "created": 1, "updated": 0, "existing": 0, "skipped": 1 },
  "rows": [
    {
      "row_number": 2,
      "enrolment_number": "21114002",
      "action": "would_create",
      "status": "dry_run",
      "message": ""
    },
    {
      "row_number": 3,
      "enrolment_number": "26114001",
      "action": "skipped",
      "status": "error",
      "message": "Enrollment No 26114001 is not a student on Channeli"
    }
  ]
}
```

`action` is `would_create` or `would_update` in a dry run, `created` or `updated` in the real run, and `existing` or `skipped` in both.
A row with `"status": "error"` is marked on the page with its message.
The keys stay in snake case, unlike the rest of the Omniport API.
Errors for the whole request return 403 or 400 with a `detail` message, which the page shows in a toast.
